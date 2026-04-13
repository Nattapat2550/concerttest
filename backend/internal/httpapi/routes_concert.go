// backend/internal/httpapi/routes_concert.go
package httpapi

import (
	"github.com/go-chi/chi/v5"
	"backend/internal/handlers"
)

func setupConcertRoutes(h *handlers.Handler) func(chi.Router) {
	return func(cr chi.Router) {
		cr.Get("/news/latest", h.GetLatestNews)
		cr.Get("/list", h.GetConcerts)
		
		cr.Get("/{id}/queue/join", h.JoinQueue)
		cr.Get("/{id}/queue/status", h.CheckQueueStatus)

		cr.Get("/{id}/seats", h.GetConcertSeats)
		cr.Get("/{id}", h.GetConcertDetails)
		
		cr.Get("/{id}/ws", h.SeatWebSocketHandler)
		
		cr.With(h.RequireAuth).Post("/book", h.BookSeat)
		cr.With(h.RequireAuth).Get("/my-bookings", h.GetMyBookings)
		cr.With(h.RequireAuth).Put("/bookings/{id}/cancel", h.CancelMyBooking)
		cr.With(h.RequireAuth).Get("/wallet", h.GetWallet)
		cr.With(h.RequireAuth).Post("/wallet/topup", h.TopupWallet)
		cr.With(h.RequireAuth).Post("/bookings/{id}/pay", h.PayBooking)
	}
}