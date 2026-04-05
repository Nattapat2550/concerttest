package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

// ===== CONCERT FUNCTIONS =====

func (h *Handler) GetConcerts(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	rows, err := h.ConcertDB.QueryContext(ctx, `
		SELECT c.id, c.name, c.show_date, COALESCE(c.venue, ''), c.venue_id, COALESCE(v.name, ''), c.ticket_price, COALESCE(c.layout_image_url, ''), c.is_active
		FROM concerts c LEFT JOIN venues v ON c.venue_id = v.id ORDER BY c.show_date ASC`)
	if err != nil { h.writeError(w, http.StatusInternalServerError, "DB Error"); return }
	defer rows.Close()
	
	var concerts []Concert
	for rows.Next() {
		var c Concert
		if err := rows.Scan(&c.ID, &c.Name, &c.ShowDate, &c.Venue, &c.VenueID, &c.VenueName, &c.TicketPrice, &c.LayoutImageURL, &c.IsActive); err == nil { concerts = append(concerts, c) }
	}
	if concerts == nil { concerts = []Concert{} }
	WriteJSON(w, http.StatusOK, concerts)
}

func (h *Handler) GetConcertSeats(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	concertID := chi.URLParam(r, "id")
	rows, err := h.ConcertDB.QueryContext(ctx, `SELECT id, concert_id, seat_code, price, is_booked FROM seats WHERE concert_id = $1 ORDER BY seat_code ASC`, concertID)
	if err != nil { return }
	defer rows.Close()
	
	var seats []Seat
	for rows.Next() {
		var s Seat
		if err := rows.Scan(&s.ID, &s.ConcertID, &s.SeatCode, &s.Price, &s.IsBooked); err == nil { seats = append(seats, s) }
	}
	if seats == nil { seats = []Seat{} }
	WriteJSON(w, http.StatusOK, seats)
}

func (h *Handler) GetConcertDetails(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	concertID := chi.URLParam(r, "id")
	var res ConcertDetailsResponse
	
	err := h.ConcertDB.QueryRowContext(ctx, `
		SELECT c.id, c.name, c.show_date, c.venue_id, COALESCE(v.name, ''), c.ticket_price, COALESCE(v.svg_content, ''), COALESCE(c.layout_image_url, ''), c.is_active
		FROM concerts c LEFT JOIN venues v ON c.venue_id = v.id WHERE c.id = $1`, concertID).
		Scan(&res.Concert.ID, &res.Concert.Name, &res.Concert.ShowDate, &res.Concert.VenueID, &res.Concert.VenueName, &res.Concert.TicketPrice, &res.SVGContent, &res.Concert.LayoutImageURL, &res.Concert.IsActive)
	if err != nil { h.writeError(w, http.StatusNotFound, "Concert not found"); return }

	rows, _ := h.ConcertDB.QueryContext(ctx, `SELECT seat_code, zone_name, price, color FROM concert_seats WHERE concert_id = $1`, concertID)
	for rows.Next() {
		var s ConcertSeatConfig
		if err := rows.Scan(&s.SeatCode, &s.ZoneName, &s.Price, &s.Color); err == nil { res.ConfiguredSeats = append(res.ConfiguredSeats, s) }
	}
	rows.Close()
	if res.ConfiguredSeats == nil { res.ConfiguredSeats = []ConcertSeatConfig{} }

	rows2, _ := h.ConcertDB.QueryContext(ctx, `SELECT seat_code FROM bookings WHERE concert_id = $1 AND status = 'confirmed'`, concertID)
	for rows2.Next() {
		var sc string
		if err := rows2.Scan(&sc); err == nil { res.BookedSeats = append(res.BookedSeats, sc) }
	}
	rows2.Close()
	if res.BookedSeats == nil { res.BookedSeats = []string{} }

	WriteJSON(w, http.StatusOK, res)
}