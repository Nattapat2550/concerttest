package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"golang.org/x/sync/errgroup"
)

// ===== CONCERT FUNCTIONS =====

func (h *Handler) GetConcerts(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// [FIXED] ดึง COALESCE(c.eticket_config, '{}') เพื่อให้ Admin โหลดหน้าแก้ไขแล้วข้อมูลเดิมแสดง
	rows, err := h.ConcertDB.QueryContext(ctx, `
		SELECT c.id, c.access_code, c.name, COALESCE(c.description, ''), c.show_date, COALESCE(c.venue, ''), c.venue_id, COALESCE(v.name, ''), c.ticket_price, COALESCE(c.layout_image_url, ''), c.is_active, COALESCE(c.eticket_config, '{}')
		FROM concerts c LEFT JOIN venues v ON c.venue_id = v.id ORDER BY c.show_date ASC`)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "DB Error")
		return
	}
	defer rows.Close()
	
	var concerts []Concert
	for rows.Next() {
		var c Concert
		if err := rows.Scan(&c.ID, &c.AccessCode, &c.Name, &c.Description, &c.ShowDate, &c.Venue, &c.VenueID, &c.VenueName, &c.TicketPrice, &c.LayoutImageURL, &c.IsActive, &c.EticketConfig); err == nil {
			concerts = append(concerts, c)
		}
	}
	if concerts == nil { concerts = []Concert{} }
	WriteJSON(w, http.StatusOK, concerts)
}

func (h *Handler) GetConcertSeats(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	accessCode := chi.URLParam(r, "id")
	var realID int
	err := h.ConcertDB.QueryRowContext(ctx, "SELECT id FROM concerts WHERE access_code = $1", accessCode).Scan(&realID)
	if err != nil {
		h.writeError(w, http.StatusNotFound, "Not found")
		return
	}

	rows, err := h.ConcertDB.QueryContext(ctx, `SELECT id, concert_id, seat_code, price, is_booked FROM seats WHERE concert_id = $1 ORDER BY seat_code ASC`, realID)
	if err != nil { 
		h.writeError(w, http.StatusInternalServerError, "Failed to fetch seats")
		return 
	}
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

	// [AUTO-CANCEL 10 นาที] ปล่อยที่นั่งของคนที่จองแต่ไม่จ่ายเงินเกิน 10 นาที
	h.ConcertDB.ExecContext(ctx, `UPDATE seats SET is_booked = false WHERE id IN (SELECT seat_id FROM bookings WHERE status = 'wait' AND booked_at < NOW() - INTERVAL '10 minutes' AND seat_id IS NOT NULL)`)
	h.ConcertDB.ExecContext(ctx, `UPDATE bookings SET status = 'cancelled' WHERE status = 'wait' AND booked_at < NOW() - INTERVAL '10 minutes'`)

	accessCode := chi.URLParam(r, "id")
	var res ConcertDetailsResponse
	
	// Fetch Concert Info
	err := h.ConcertDB.QueryRowContext(ctx, `
		SELECT c.id, c.access_code, c.name, COALESCE(c.description, ''), c.show_date, c.venue_id, COALESCE(v.name, ''), c.ticket_price, COALESCE(v.svg_content, ''), COALESCE(c.layout_image_url, ''), c.is_active, COALESCE(c.eticket_config, '{}')
		FROM concerts c LEFT JOIN venues v ON c.venue_id = v.id WHERE c.access_code = $1`, accessCode).
		Scan(&res.Concert.ID, &res.Concert.AccessCode, &res.Concert.Name, &res.Concert.Description, &res.Concert.ShowDate, &res.Concert.VenueID, &res.Concert.VenueName, &res.Concert.TicketPrice, &res.SVGContent, &res.Concert.LayoutImageURL, &res.Concert.IsActive, &res.Concert.EticketConfig)
	if err != nil {
		h.writeError(w, http.StatusNotFound, "Concert not found")
		return
	}

	concertID := res.Concert.ID 
	res.ConfiguredSeats = []ConcertSeatConfig{}
	res.BookedSeats = []string{}
	res.WaitSeats = []string{}

	g, gCtx := errgroup.WithContext(ctx)

	// Routine 1: Configured seats
	g.Go(func() error {
		rows, err := h.ConcertDB.QueryContext(gCtx, `SELECT seat_code, zone_name, price, color FROM concert_seats WHERE concert_id = $1`, concertID)
		if err != nil { return err }
		defer rows.Close() 
		for rows.Next() {
			var s ConcertSeatConfig
			if err := rows.Scan(&s.SeatCode, &s.ZoneName, &s.Price, &s.Color); err == nil { res.ConfiguredSeats = append(res.ConfiguredSeats, s) }
		}
		return nil
	})

	// Routine 2: Booked seats (จ่ายแล้ว)
	g.Go(func() error {
		rows2, err := h.ConcertDB.QueryContext(gCtx, `SELECT seat_code FROM bookings WHERE concert_id = $1 AND status IN ('confirmed', 'used')`, concertID)
		if err != nil { return err }
		defer rows2.Close()
		for rows2.Next() {
			var sc string
			if err := rows2.Scan(&sc); err == nil { res.BookedSeats = append(res.BookedSeats, sc) }
		}
		return nil
	})

	// Routine 3: Wait seats (รอจ่ายเงิน 10 นาที)
	g.Go(func() error {
		rows3, err := h.ConcertDB.QueryContext(gCtx, `SELECT seat_code FROM bookings WHERE concert_id = $1 AND status = 'wait'`, concertID)
		if err != nil { return err }
		defer rows3.Close()
		for rows3.Next() {
			var sc string
			if err := rows3.Scan(&sc); err == nil { res.WaitSeats = append(res.WaitSeats, sc) }
		}
		return nil
	})

	if err := g.Wait(); err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to load seats data")
		return
	}

	WriteJSON(w, http.StatusOK, res)
}