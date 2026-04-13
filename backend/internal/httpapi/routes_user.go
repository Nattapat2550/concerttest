// backend/internal/httpapi/routes_user.go
package httpapi

import (
	"github.com/go-chi/chi/v5"
	"backend/internal/handlers"
)

func setupUserRoutes(h *handlers.Handler) func(chi.Router) {
	return func(ur chi.Router) {
		ur.Use(h.RequireAuth)
		ur.Get("/me", h.UsersMeGet)
		ur.Put("/me", h.UsersMePut)
		ur.Post("/me/avatar", h.UsersMeAvatar)
		ur.Delete("/me", h.UsersMeDelete)
	}
}