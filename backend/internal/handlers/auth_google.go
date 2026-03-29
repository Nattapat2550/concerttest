package handlers

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// GET /api/auth/google
func (h *Handler) AuthGoogleStart(w http.ResponseWriter, r *http.Request) {
	u, ok := h.Google.AuthURL("state")
	if !ok {
		h.writeError(w, http.StatusServiceUnavailable, "Google login is temporarily unavailable. Please try again in a moment.")
		return
	}
	http.Redirect(w, r, u, http.StatusFound)
}

// GET /api/auth/google/callback
func (h *Handler) AuthGoogleCallback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	front := strings.TrimRight(h.Cfg.FrontendURL, "/")

	code := strings.TrimSpace(r.URL.Query().Get("code"))
	if code == "" {
		http.Redirect(w, r, front+"/login?error=oauth_failed", http.StatusFound)
		return
	}

	info, err := h.Google.ExchangeWeb(ctx, code) // returns *googleUserInfo
	if err != nil || info == nil {
		fmt.Println("Google ExchangeWeb Error:", err)
		http.Redirect(w, r, front+"/login?error=oauth_failed", http.StatusFound)
		return
	}

	user, err := h.setOAuthUser(ctx, info)
	if err != nil {
		fmt.Println("Database setOAuthUser Error:", err)
		http.Redirect(w, r, front+"/login?error=oauth_failed", http.StatusFound)
		return
	}

	token, err := h.signToken(user.ID, user.Role)
	if err != nil {
		http.Redirect(w, r, front+"/login?error=oauth_failed", http.StatusFound)
		return
	}

	h.setAuthCookie(w, token, true)

	role := user.Role
	if role == "" {
		role = "user"
	}

	// ✅ เปลี่ยนมาเช็คจาก 'เบอร์โทร' (Tel) แทน Username 
	// เพราะ Google ไม่เคยส่งเบอร์โทรมา ถ้าไม่มีเบอร์โทร = ข้อมูลยังไม่ครบ (ต้องไปหน้า Complete Profile)
	isProfileIncomplete := user.Tel == nil || strings.TrimSpace(*user.Tel) == ""

	if isProfileIncomplete {
		// พ่วงอีเมล และ ชื่อ(Name) จาก Google ไปกับ URL ให้ Frontend ไปแยกเป็น First/Last Name
		redirectURL := fmt.Sprintf("%s/complete-profile?email=%s&name=%s",
			front,
			url.QueryEscape(user.Email),
			url.QueryEscape(info.Name), // ส่ง Name ที่ได้จาก Google เข้าไปด้วย
		)
		http.Redirect(w, r, redirectURL, http.StatusFound)
		return
	}

	// ✅ ถ้ามีข้อมูลครบแล้ว (ไอดีเก่าที่เคยกรอกเบอร์แล้ว) ให้พาเข้าหน้า Home หรือ Admin ตาม Role
	frag := "token=" + url.QueryEscape(token) + "&role=" + url.QueryEscape(role)
	if role == "admin" {
		http.Redirect(w, r, front+"/admin#"+frag, http.StatusFound)
		return
	}

	http.Redirect(w, r, front+"/home#"+frag, http.StatusFound)
}

// GET /api/auth/google-mobile  (เอาไว้ให้เผื่อเรียกดู URL)
func (h *Handler) AuthGoogleMobileStart(w http.ResponseWriter, r *http.Request) {
	u, ok := h.Google.AuthURL("state")
	if !ok {
		h.writeError(w, http.StatusServiceUnavailable, "Google login is temporarily unavailable. Please try again in a moment.")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "url": u})
}

type googleMobileReq struct {
	AuthCode string `json:"authCode"`
}

// POST /api/auth/google-mobile 
func (h *Handler) AuthGoogleMobileCallback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req googleMobileReq
	if err := ReadJSON(r, &req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	if req.AuthCode == "" {
		h.writeError(w, http.StatusBadRequest, "Missing authCode")
		return
	}

	info, err := h.Google.ExchangeMobile(ctx, req.AuthCode)
	if err != nil || info == nil {
		h.writeError(w, http.StatusUnauthorized, "Invalid Google auth")
		return
	}

	user, err := h.setOAuthUser(ctx, info)
	if err != nil {
		h.writeError(w, http.StatusUnauthorized, "Failed to set OAuth user")
		return
	}

	token, err := h.signToken(user.ID, user.Role)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Token error")
		return
	}

	h.setAuthCookie(w, token, true)
	
	// คืนค่า User Data ครบชุด
	WriteJSON(w, http.StatusOK, map[string]any{
		"token": token,
		"role":  user.Role,
		// ✅ อัปเดตเงื่อนไขให้ Mobile ด้วย (เช็คจากเบอร์โทร)
		"isProfileIncomplete": user.Tel == nil || strings.TrimSpace(*user.Tel) == "", 
		"user": map[string]any{
			"id":                  user.ID,
			"email":               user.Email,
			"username":            user.Username,
			"name":                info.Name, // ส่ง Name จาก Google ให้ Mobile ด้วยเผื่อต้องใช้
			"role":                user.Role,
			"profile_picture_url": user.ProfilePictureURL,
		},
	})
}

// ใช้ info.Name เพื่อส่งเข้าไปประกอบด้วย
func (h *Handler) setOAuthUser(ctx context.Context, info *googleUserInfo) (userDTO, error) {
	email := strings.ToLower(strings.TrimSpace(info.Email))
	subject := strings.TrimSpace(info.ID) 
	pic := strings.TrimSpace(info.Picture)
	name := strings.TrimSpace(info.Name)

	payload := map[string]any{
		"provider":   "google",
		"oauthId":    subject,
		"email":      email,
		"pictureUrl": pic,
		"name":       name,
	}

	var user userDTO
	if err := h.Pure.Post(ctx, "/api/internal/set-oauth-user", payload, &user); err != nil {
		return userDTO{}, err
	}
	return user, nil
}