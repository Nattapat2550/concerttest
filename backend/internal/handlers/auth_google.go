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

	info, err := h.Google.ExchangeWeb(ctx, code) 
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

	frag := "token=" + url.QueryEscape(token) + "&role=" + url.QueryEscape(role)

	if user.Username == nil || *user.Username == "" {
		http.Redirect(w, r, front+"/form?email="+url.QueryEscape(user.Email)+"#"+frag, http.StatusFound)
		return
	}

	if role == "admin" {
		http.Redirect(w, r, front+"/admin#"+frag, http.StatusFound)
		return
	}

	http.Redirect(w, r, front+"/home#"+frag, http.StatusFound)
}

// GET /api/auth/google-mobile
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
	
	WriteJSON(w, http.StatusOK, map[string]any{
		"token": token,
		"role":  user.Role,
		"user": map[string]any{
			"id":                  user.ID,
			"email":               user.Email,
			"username":            user.Username,
			"role":                user.Role,
			"profile_picture_url": user.ProfilePictureURL,
		},
	})
}

type oauthGoogleReq struct {
	Email      string `json:"email"`
	OAuthID    string `json:"oauthId"`
	Username   string `json:"username"`
	PictureURL string `json:"pictureUrl"`
}

// POST /api/auth/oauth/google รับจาก Frontend (React)
func (h *Handler) AuthOAuthGoogle(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req oauthGoogleReq
	if err := ReadJSON(r, &req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	info := &googleUserInfo{
		ID:      req.OAuthID,
		Email:   req.Email,
		Name:    req.Username,
		Picture: req.PictureURL,
	}

	user, err := h.setOAuthUser(ctx, info)
	if err != nil {
		fmt.Println("AuthOAuthGoogle DB Error:", err)
		h.writeError(w, http.StatusUnauthorized, "Failed to set OAuth user")
		return
	}

	token, err := h.signToken(user.ID, user.Role)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Token error")
		return
	}

	h.setAuthCookie(w, token, true)

	WriteJSON(w, http.StatusOK, map[string]any{
		"ok":    true,
		"role":  user.Role,
		"token": token,
		"user": map[string]any{
			"id":                  user.ID,
			"email":               user.Email,
			"username":            user.Username,
			"role":                user.Role,
			"profile_picture_url": user.ProfilePictureURL,
		},
	})
}

func (h *Handler) setOAuthUser(ctx context.Context, info *googleUserInfo) (userDTO, error) {
	email := strings.ToLower(strings.TrimSpace(info.Email))
	subject := strings.TrimSpace(info.ID) 
	pic := strings.TrimSpace(info.Picture)
	name := strings.TrimSpace(info.Name)

	// 🌟 ปล่อย Payload ครอบคลุมทุกรูปแบบ เพื่อการันตีว่า Rust จะต้องหาข้อมูลเจอแน่ๆ!
	payload := map[string]any{
		"provider":    "google",
		"oauthId":     subject,
		"oauth_id":    subject,
		"email":       email,
		"pictureUrl":  pic,
		"picture_url": pic,
		"name":        name,
		"username":    name,
	}

	var user userDTO
	if err := h.Pure.Post(ctx, "/api/internal/set-oauth-user", payload, &user); err != nil {
		return userDTO{}, err
	}
	return user, nil
}