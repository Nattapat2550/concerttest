// backend/internal/httpapi/routes_auth.go
package httpapi

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"backend/internal/handlers"
)

func setupAuthRoutes(h *handlers.Handler) func(chi.Router) {
	return func(ar chi.Router) {
		ar.Use(rateLimit(100, 15*time.Minute, func(req *http.Request) (string, error) { return GetClientIP(req), nil }))
		ar.Post("/register", h.AuthRegister)
		ar.Post("/verify-code", h.AuthVerifyCode)
		ar.Post("/complete-profile", h.AuthCompleteProfile)
		ar.Post("/login", h.AuthLogin)
		ar.Get("/status", h.AuthStatus)
		ar.Post("/logout", h.AuthLogout)
		ar.Post("/forgot-password", h.AuthForgotPassword)
		ar.Post("/reset-password", h.AuthResetPassword)
		ar.Get("/google", h.AuthGoogleStart)
		ar.Get("/google/callback", h.AuthGoogleCallback)
		ar.Post("/google-mobile", h.AuthGoogleMobileCallback)
	}
}