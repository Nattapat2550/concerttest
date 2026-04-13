// backend/internal/httpapi/router.go
package httpapi

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"backend/internal/config"
	"backend/internal/handlers"
	"backend/internal/pureapi"
)

func NewRouter(cfg config.Config, concertDB *sql.DB) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	allowedOrigins := []string{"http://localhost:3000", "http://127.0.0.1:3000"}
	if cfg.FrontendURL != "" {
		allowedOrigins = append(allowedOrigins, strings.TrimRight(cfg.FrontendURL, "/"))
	}
	r.Use(cors(allowedOrigins, true))

	p := pureapi.NewClient(cfg.PureAPIBaseURL, cfg.PureAPIKey, cfg.PureAPIInternalURL)
	h := handlers.New(cfg, p, concertDB)

	r.Get("/api/health", h.Health)
	r.Get("/", func(w http.ResponseWriter, req *http.Request) {
		if cfg.FrontendURL != "" {
			http.Redirect(w, req, cfg.FrontendURL, http.StatusFound)
			return
		}
		w.Write([]byte("Backend API is running"))
	})
	r.Get("/favicon.ico", func(w http.ResponseWriter, req *http.Request) { w.WriteHeader(http.StatusNoContent) })

	// เรียกใช้ Route ย่อยที่แยกไปตามไฟล์ต่างๆ
	r.Route("/api/auth", setupAuthRoutes(h))
	r.Route("/api/users", setupUserRoutes(h))
	r.Route("/api/concerts", setupConcertRoutes(h))
	r.Route("/api/admin", setupAdminRoutes(h))

	// Global / Public Routes
	r.Get("/api/homepage", h.HomepageGet)
	r.With(h.RequireAdmin).Put("/api/homepage", h.HomepageUpdate)
	r.Get("/api/carousel", h.CarouselList)
	r.Get("/api/documents/list", h.DocumentList)
	r.Get("/api/documents/{id}", h.GetDocumentDetail)
	r.Get("/api/download/windows", h.DownloadWindows)
	r.Get("/api/download/android", h.DownloadAndroid)
	r.Post("/api/appeals", h.SubmitAppeal)

	return r
}