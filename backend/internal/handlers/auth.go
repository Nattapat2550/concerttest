package handlers

import (
	"net/http"
	"strings"
)

// 🌟 นำ userDTO กลับมาเพื่อให้ users.go และ admin.go เรียกใช้งานได้ไม่พัง
type userDTO struct {
	ID                int64   `json:"id"`
	Email             string  `json:"email"`
	Username          *string `json:"username"`
	Role              string  `json:"role"`
	PasswordHash      *string `json:"password_hash"`
	IsEmailVerified   bool    `json:"is_email_verified"`
	OAuthProvider     *string `json:"oauth_provider"`
	OAuthSubject      *string `json:"oauth_subject"`
	ProfilePictureURL *string `json:"profile_picture_url"`
	CreatedAt         string  `json:"created_at"`
}

// โครงสร้างสำหรับรับข้อมูลที่ Rust ตอบกลับมา
type rustAuthResp struct {
	OK   bool `json:"ok"`
	Data struct {
		Token string `json:"token"`
		User  struct {
			ID                int64   `json:"id"`
			Email             string  `json:"email"`
			Username          *string `json:"username"`
			Role              string  `json:"role"`
			ProfilePictureURL *string `json:"profile_picture_url"`
			IsEmailVerified   bool    `json:"is_email_verified"`
		} `json:"user"`
	} `json:"data"`
}

type registerReq struct { Email string `json:"email"` }
type verifyReq struct { Email string `json:"email"`; Code string `json:"code"` }
type completeProfileReq struct {
	Email    string `json:"email"`
	Username string `json:"username"`
	Password string `json:"password"`
	Remember bool   `json:"remember"`
}
type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Remember bool   `json:"remember"`
}
type forgotReq struct { Email string `json:"email"` }
type resetReq struct {
	Token       string `json:"token"`
	NewPassword string `json:"newPassword"`
}

// ------ REGISTER ------
func (h *Handler) AuthRegister(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req registerReq
	if err := ReadJSON(r, &req); err != nil { h.writeError(w, http.StatusBadRequest, "Invalid JSON"); return }

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	err := h.Pure.Post(ctx, "/api/auth/register", req, nil)
	if err != nil { h.writeError(w, http.StatusBadRequest, "อีเมลนี้อาจถูกใช้งานไปแล้ว"); return }

	WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "emailSent": false})
}

// ------ VERIFY CODE ------
func (h *Handler) AuthVerifyCode(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req verifyReq
	if err := ReadJSON(r, &req); err != nil { h.writeError(w, http.StatusBadRequest, "Invalid JSON"); return }

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	err := h.Pure.Post(ctx, "/api/auth/verify-code", req, nil)
	if err != nil { h.writeError(w, http.StatusBadRequest, "รหัสยืนยันไม่ถูกต้องหรือหมดอายุ"); return }

	WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// ------ COMPLETE PROFILE ------
func (h *Handler) AuthCompleteProfile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req completeProfileReq
	if err := ReadJSON(r, &req); err != nil { h.writeError(w, http.StatusBadRequest, "Invalid JSON"); return }

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	
	var rustResp rustAuthResp
	err := h.Pure.Post(ctx, "/api/auth/complete-profile", req, &rustResp)
	if err != nil || !rustResp.OK { h.writeError(w, http.StatusBadRequest, "ทำรายการไม่สำเร็จ"); return }

	user := rustResp.Data.User
	token, _ := h.signToken(user.ID, user.Role)
	h.setAuthCookie(w, token, req.Remember)

	WriteJSON(w, http.StatusOK, map[string]any{
		"ok": true, "token": token, "role": user.Role, "user": user,
	})
}

// ------ LOGIN ------
func (h *Handler) AuthLogin(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req loginReq
	if err := ReadJSON(r, &req); err != nil { h.writeError(w, http.StatusBadRequest, "Invalid JSON"); return }

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	var rustResp rustAuthResp
	err := h.Pure.Post(ctx, "/api/auth/login", req, &rustResp)
	if err != nil || !rustResp.OK {
		h.writeError(w, http.StatusUnauthorized, "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
		return
	}

	user := rustResp.Data.User
	token, _ := h.signToken(user.ID, user.Role)
	h.setAuthCookie(w, token, req.Remember)

	WriteJSON(w, http.StatusOK, map[string]any{
		"ok": true, "role": user.Role, "token": token, "user": user,
	})
}

// ------ STATUS ------
func (h *Handler) AuthStatus(w http.ResponseWriter, r *http.Request) {
	tok := extractTokenFromReq(r)
	if tok == "" { WriteJSON(w, http.StatusOK, map[string]any{"authenticated": false}); return }

	claims, err := h.parseToken(tok)
	if err != nil { WriteJSON(w, http.StatusOK, map[string]any{"authenticated": false}); return }

	WriteJSON(w, http.StatusOK, map[string]any{
		"authenticated": true, "id": claims.UserID, "role": claims.Role,
	})
}

// ------ LOGOUT ------
func (h *Handler) AuthLogout(w http.ResponseWriter, _ *http.Request) {
	h.clearAuthCookie(w)
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Handler) AuthForgotPassword(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req forgotReq
	if err := ReadJSON(r, &req); err != nil { h.writeError(w, http.StatusBadRequest, "Invalid JSON"); return }

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	_ = h.Pure.Post(ctx, "/api/auth/forgot-password", req, nil)

	WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "emailSent": false})
}

func (h *Handler) AuthResetPassword(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req resetReq
	if err := ReadJSON(r, &req); err != nil { h.writeError(w, http.StatusBadRequest, "Invalid JSON"); return }

	err := h.Pure.Post(ctx, "/api/auth/reset-password", map[string]string{
		"token": strings.TrimSpace(req.Token),
		"newPassword": req.NewPassword,
	}, nil)
	
	if err != nil { h.writeError(w, http.StatusBadRequest, "ลิงก์ไม่ถูกต้องหรือรหัสผ่านสั้นเกินไป"); return }
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}