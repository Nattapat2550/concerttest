// backend/internal/httpapi/routes_admin.go
package httpapi

import (
	"github.com/go-chi/chi/v5"
	"backend/internal/handlers"
)

func setupAdminRoutes(h *handlers.Handler) func(chi.Router) {
	return func(ad chi.Router) {
		ad.Use(h.RequireAdmin)

		ad.Get("/users", h.AdminUsersList)
		ad.Put("/users/{id}", h.AdminUsersUpdateByID)
		ad.Post("/users/update", h.AdminUsersUpdate)
		ad.Post("/users/{id}/wallet", h.AdminUpdateWallet)
		
		ad.Get("/carousel", h.AdminCarouselListNew)
		ad.Post("/carousel", h.AdminCarouselCreateNew)
		ad.Put("/carousel/{id}", h.AdminCarouselUpdateNew)
		ad.Delete("/carousel/{id}", h.AdminCarouselDeleteNew)

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
		
		ad.Get("/appeals", h.AdminGetAppeals)
		ad.Put("/appeals/{id}", h.AdminReviewAppeal)
	}
}