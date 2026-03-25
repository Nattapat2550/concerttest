package handlers

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

type oauthGoogleReq struct {
	Email      string `json:"email"`
	OAuthID    string `json:"oauthId"`
	Username   string `json:"username"`
	PictureURL string `json:"pictureUrl"`
}

// 🌟 [เพิ่มกลับมา] GET /api/auth/google
func (h *Handler) AuthGoogleStart(w http.ResponseWriter, r *http.Request) {
	u, ok := h.Google.AuthURL("state")
	if !ok {
		h.writeError(w, http.StatusServiceUnavailable, "Google login is temporarily unavailable. Please try again in a moment.")
		return
	}
	http.Redirect(w, r, u, http.StatusFound)
}

// POST /api/auth/oauth/google
func (h *Handler) AuthOAuthGoogle(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req oauthGoogleReq
	if err := ReadJSON(r, &req); err != nil { h.writeError(w, http.StatusBadRequest, "Invalid JSON"); return }

	var rustResp rustAuthResp
	err := h.Pure.Post(ctx, "/api/auth/oauth/google", req, &rustResp)
	if err != nil || !rustResp.OK {
		fmt.Println("Rust OAuth API Error:", err)
		h.writeError(w, http.StatusUnauthorized, "ไม่สามารถเชื่อมต่อระบบ Google ได้")
		return
	}

	user := rustResp.Data.User
	token, _ := h.signToken(user.ID, user.Role)
	h.setAuthCookie(w, token, true)

	WriteJSON(w, http.StatusOK, map[string]any{
		"ok":    true,
		"role":  user.Role,
		"token": token,
		"user":  user,
	})
}

func (h *Handler) AuthGoogleCallback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	front := strings.TrimRight(h.Cfg.FrontendURL, "/")

	code := strings.TrimSpace(r.URL.Query().Get("code"))
	if code == "" { http.Redirect(w, r, front+"/login?error=oauth_failed", http.StatusFound); return }

	info, err := h.Google.ExchangeWeb(ctx, code) 
	if err != nil || info == nil { http.Redirect(w, r, front+"/login?error=oauth_failed", http.StatusFound); return }

	req := oauthGoogleReq{
		Email:      info.Email,
		OAuthID:    info.ID,
		Username:   info.Name,
		PictureURL: info.Picture,
	}

	var rustResp rustAuthResp
	err = h.Pure.Post(ctx, "/api/auth/oauth/google", req, &rustResp)
	if err != nil || !rustResp.OK { http.Redirect(w, r, front+"/login?error=oauth_failed", http.StatusFound); return }

	user := rustResp.Data.User
	token, _ := h.signToken(user.ID, user.Role)
	h.setAuthCookie(w, token, true)

	role := user.Role
	if role == "" { role = "user" }
	frag := "token=" + url.QueryEscape(token) + "&role=" + url.QueryEscape(role)
	
	http.Redirect(w, r, front+"/#"+frag, http.StatusFound) 
}

func (h *Handler) AuthGoogleMobileStart(w http.ResponseWriter, r *http.Request) {
	u, ok := h.Google.AuthURL("state")
	if !ok { h.writeError(w, http.StatusServiceUnavailable, "Unavailable"); return }
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "url": u})
}

type googleMobileReq struct { AuthCode string `json:"authCode"` }

func (h *Handler) AuthGoogleMobileCallback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req googleMobileReq
	if err := ReadJSON(r, &req); err != nil { h.writeError(w, http.StatusBadRequest, "Invalid JSON"); return }

	info, err := h.Google.ExchangeMobile(ctx, req.AuthCode)
	if err != nil || info == nil { h.writeError(w, http.StatusUnauthorized, "Invalid Google auth"); return }

	gReq := oauthGoogleReq{
		Email:      info.Email,
		OAuthID:    info.ID,
		Username:   info.Name,
		PictureURL: info.Picture,
	}

	var rustResp rustAuthResp
	err = h.Pure.Post(ctx, "/api/auth/oauth/google", gReq, &rustResp)
	if err != nil || !rustResp.OK { h.writeError(w, http.StatusUnauthorized, "Backend error"); return }

	user := rustResp.Data.User
	token, _ := h.signToken(user.ID, user.Role)
	h.setAuthCookie(w, token, true)
	
	WriteJSON(w, http.StatusOK, map[string]any{
		"token": token, "role": user.Role, "user": user,
	})
}