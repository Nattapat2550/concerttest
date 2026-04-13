// backend/internal/httpapi/router.go
package httpapi

import (
	"database/sql"
	"net/http"
	"strings"
	"time"

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

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
	r.Get("/", func(w http.ResponseWriter, req *http.Request) {
		if cfg.FrontendURL != "" {
			http.Redirect(w, req, cfg.FrontendURL, http.StatusFound)
			return
		}
		w.Write([]byte("Backend API is running"))
	})
	r.Get("/favicon.ico", func(w http.ResponseWriter, req *http.Request) { w.WriteHeader(http.StatusNoContent) })

	p := pureapi.NewClient(cfg.PureAPIBaseURL, cfg.PureAPIKey, cfg.PureAPIInternalURL)
	h := handlers.New(cfg, p, concertDB)

	r.Route("/api/auth", setupAuthRoutes(h))
	r.Route("/api/users", setupUserRoutes(h))
	r.Route("/api/concerts", setupConcertRoutes(h))
	r.Route("/api/admin", setupAdminRoutes(h))

	r.Get("/api/homepage", h.HomepageGet)
	r.With(h.RequireAdmin).Put("/api/homepage", h.HomepageUpdate)
	
	// ดึงข้อมูลแสดงหน้าเว็บ (Public)
	r.Get("/api/carousel", h.CarouselList)
	r.Get("/api/documents/list", h.DocumentList)
	r.Get("/api/documents/{id}", h.GetDocumentDetail)

	r.Get("/api/download/windows", h.DownloadWindows)
	r.Get("/api/download/android", h.DownloadAndroid)

	// 🛑 เพิ่ม Route สาธารณะสำหรับคนโดนแบนเข้ามายื่นคำร้องโดยไม่ต้อง Login
	r.Post("/api/appeals", h.SubmitAppeal)

	return r
}

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

func setupUserRoutes(h *handlers.Handler) func(chi.Router) {
	return func(ur chi.Router) {
		ur.Use(h.RequireAuth)
		ur.Get("/me", h.UsersMeGet)
		ur.Put("/me", h.UsersMePut)
		ur.Post("/me/avatar", h.UsersMeAvatar)
		ur.Delete("/me", h.UsersMeDelete)
	}
}

func setupConcertRoutes(h *handlers.Handler) func(chi.Router) {
	return func(cr chi.Router) {
		cr.Get("/news/latest", h.GetLatestNews)
		cr.Get("/list", h.GetConcerts)
		
		cr.Get("/{id}/queue/join", h.JoinQueue)
		cr.Get("/{id}/queue/status", h.CheckQueueStatus)

		cr.Get("/{id}/seats", h.GetConcertSeats)
		cr.Get("/{id}", h.GetConcertDetails)
		
		cr.With(h.RequireAuth).Post("/book", h.BookSeat)
		cr.With(h.RequireAuth).Get("/my-bookings", h.GetMyBookings)
		cr.With(h.RequireAuth).Put("/bookings/{id}/cancel", h.CancelMyBooking)
		cr.With(h.RequireAuth).Get("/wallet", h.GetWallet)
		cr.With(h.RequireAuth).Post("/wallet/topup", h.TopupWallet)
		cr.With(h.RequireAuth).Post("/bookings/{id}/pay", h.PayBooking)
	}
}

func setupAdminRoutes(h *handlers.Handler) func(chi.Router) {
	return func(ad chi.Router) {
		ad.Use(h.RequireAdmin)

		ad.Get("/users", h.AdminUsersList)
		ad.Put("/users/{id}", h.AdminUsersUpdateByID)
		ad.Post("/users/update", h.AdminUsersUpdate)
		ad.Post("/users/{id}/wallet", h.AdminUpdateWallet)
		
		// จัดการ Carousel (เรียกใช้ตัว New แทน)
		ad.Get("/carousel", h.AdminCarouselListNew)
		ad.Post("/carousel", h.AdminCarouselCreateNew)
		ad.Put("/carousel/{id}", h.AdminCarouselUpdateNew)
		ad.Delete("/carousel/{id}", h.AdminCarouselDeleteNew)

		// จัดการ Documents/Gallery
		ad.Post("/documents", h.AdminCreateDocument)
		ad.Put("/documents/{id}", h.AdminUpdateDocument) 
		ad.Delete("/documents/{id}", h.AdminDeleteDocument)

		ad.Put("/homepage", h.HomepageUpdate)
		
		ad.Get("/bookings", h.AdminGetAllBookings)
		ad.Put("/bookings/{id}/cancel", h.AdminCancelBooking)
		ad.Post("/bookings/scan", h.AdminScanTicket)
		
		ad.Get("/venues", h.AdminGetVenues)
		ad.Post("/venues", h.AdminCreateVenue)
		ad.Delete("/venues/{id}", h.AdminDeleteVenue)

		ad.Get("/concerts", h.GetConcerts)
		ad.Post("/concerts", h.AdminCreateConcert)
		ad.Put("/concerts/{id}", h.AdminUpdateConcert)
		ad.Delete("/concerts/{id}", h.AdminDeleteConcert)
		ad.Post("/concerts/{id}/seats", h.AdminSaveConcertSeats)

		ad.Get("/news", h.AdminGetNewsList)
		ad.Post("/news", h.AdminCreateNews)
		ad.Put("/news/{id}", h.AdminUpdateNews)
		ad.Delete("/news/{id}", h.AdminDeleteNews)
		
		// 🛑 เพิ่ม Route ให้ Admin ตรวจสอบและอนุมัติคำร้อง
		ad.Get("/appeals", h.AdminGetAppeals)
		ad.Put("/appeals/{id}", h.AdminReviewAppeal)
	}
}