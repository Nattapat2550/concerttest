package handlers

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

// ===== Admin Models =====
type AdminBookingView struct {
	ID          int       `json:"id"`
	UserID      string    `json:"user_id"`
	ConcertName string    `json:"concert_name"`
	SeatCode    string    `json:"seat_code"`
	Price       float64   `json:"price"`
	Status      string    `json:"status"`
	BookedAt    time.Time `json:"booked_at"`
}

type AdminSaveSeatsRequest struct {
	Seats []ConcertSeatConfig `json:"seats"`
}

func generateAccessCode() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// ===== ADMIN FUNCTIONS =====

// ---- Bookings ----
func (h *Handler) AdminGetAllBookings(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	rows, err := h.ConcertDB.QueryContext(ctx, `
		SELECT b.id, b.user_id, c.name, COALESCE(b.seat_code, ''), COALESCE(b.price, 0), b.status, b.booked_at
		FROM bookings b JOIN concerts c ON b.concert_id = c.id ORDER BY b.booked_at DESC
	`)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "DB Error")
		return
	}
	defer rows.Close()

	var bookings []AdminBookingView
	for rows.Next() {
		var b AdminBookingView
		if err := rows.Scan(&b.ID, &b.UserID, &b.ConcertName, &b.SeatCode, &b.Price, &b.Status, &b.BookedAt); err == nil {
			bookings = append(bookings, b)
		}
	}
	if bookings == nil { bookings = []AdminBookingView{} }
	WriteJSON(w, http.StatusOK, bookings)
}

func (h *Handler) AdminCancelBooking(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	bookingID := chi.URLParam(r, "id")
	
	tx, err := h.ConcertDB.BeginTx(ctx, nil)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to start transaction")
		return
	}
	defer tx.Rollback()

	var seatID sql.NullInt64
	err = tx.QueryRowContext(ctx, `SELECT seat_id FROM bookings WHERE id = $1 AND status = 'confirmed' FOR UPDATE`, bookingID).Scan(&seatID)
	if err == nil {
		tx.ExecContext(ctx, "UPDATE bookings SET status = 'cancelled' WHERE id = $1", bookingID)
		if seatID.Valid { tx.ExecContext(ctx, "UPDATE seats SET is_booked = false WHERE id = $1", seatID.Int64) }
		tx.Commit()
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Booking cancelled by admin"})
}

// ---- Venues ----
func (h *Handler) AdminGetVenues(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	
	rows, err := h.ConcertDB.QueryContext(ctx, `SELECT id, name, svg_content FROM venues ORDER BY id DESC`)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to fetch venues")
		return
	}
	defer rows.Close()

	var list []Venue
	for rows.Next() {
		var v Venue
		if err := rows.Scan(&v.ID, &v.Name, &v.SVGContent); err == nil { list = append(list, v) }
	}
	if list == nil { list = []Venue{} }
	WriteJSON(w, http.StatusOK, list)
}

func (h *Handler) AdminCreateVenue(w http.ResponseWriter, r *http.Request) {
	var v Venue
	if err := ReadJSON(r, &v); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	err := h.ConcertDB.QueryRow(`INSERT INTO venues (name, svg_content) VALUES ($1, $2) RETURNING id`, v.Name, v.SVGContent).Scan(&v.ID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed")
		return
	}
	WriteJSON(w, http.StatusCreated, v)
}

func (h *Handler) AdminDeleteVenue(w http.ResponseWriter, r *http.Request) {
	h.ConcertDB.Exec(`DELETE FROM venues WHERE id=$1`, chi.URLParam(r, "id"))
	w.WriteHeader(http.StatusNoContent)
}

// ---- Concerts ----
func (h *Handler) AdminCreateConcert(w http.ResponseWriter, r *http.Request) {
	r.ParseMultipartForm(10 * 1024 * 1024)
	name := r.FormValue("name")
	description := r.FormValue("description")
	venue := r.FormValue("venue")
	venueID := r.FormValue("venue_id")
	price := r.FormValue("ticket_price")
	if price == "" { price = "0" }
	showDate := r.FormValue("show_date")
	isActive := r.FormValue("is_active") == "true"
	
	// รับค่า eticket_config
	eticketConfig := r.FormValue("eticket_config")
	if eticketConfig == "" { eticketConfig = "{}" }
	
	imageURL, _ := tryReadImageDataURL(r, "image", 5*1024*1024)

	var vID interface{}
	if venueID == "" { vID = nil } else { vID = venueID }

	accessCode := generateAccessCode()

	_, err := h.ConcertDB.Exec(`
		INSERT INTO concerts (access_code, name, description, venue, venue_id, ticket_price, show_date, layout_image_url, is_active, eticket_config) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, 
		accessCode, name, description, venue, vID, price, showDate, imageURL, isActive, eticketConfig)
	
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to create concert")
		return
	}

	WriteJSON(w, http.StatusCreated, map[string]string{"message": "Success"})
}

func (h *Handler) AdminUpdateConcert(w http.ResponseWriter, r *http.Request) {
	r.ParseMultipartForm(10 * 1024 * 1024)
	name := r.FormValue("name")
	description := r.FormValue("description")
	venue := r.FormValue("venue")
	venueID := r.FormValue("venue_id")
	price := r.FormValue("ticket_price")
	if price == "" { price = "0" }
	showDate := r.FormValue("show_date")
	isActive := r.FormValue("is_active") == "true"
	id := chi.URLParam(r, "id")
	
	// รับค่า eticket_config
	eticketConfig := r.FormValue("eticket_config")
	if eticketConfig == "" { eticketConfig = "{}" }
	
	imageURL, _ := tryReadImageDataURL(r, "image", 5*1024*1024)
	var vID interface{}
	if venueID == "" { vID = nil } else { vID = venueID }

	var err error
	if imageURL != "" {
		_, err = h.ConcertDB.Exec(`
			UPDATE concerts 
			SET name=$1, description=$2, venue=$3, venue_id=$4, ticket_price=$5, show_date=$6, layout_image_url=$7, is_active=$8, eticket_config=$9 
			WHERE id=$10`, 
			name, description, venue, vID, price, showDate, imageURL, isActive, eticketConfig, id)
	} else {
		_, err = h.ConcertDB.Exec(`
			UPDATE concerts 
			SET name=$1, description=$2, venue=$3, venue_id=$4, ticket_price=$5, show_date=$6, is_active=$7, eticket_config=$8 
			WHERE id=$9`, 
			name, description, venue, vID, price, showDate, isActive, eticketConfig, id)
	}
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to update concert")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Updated"})
}

func (h *Handler) AdminDeleteConcert(w http.ResponseWriter, r *http.Request) {
	h.ConcertDB.Exec(`DELETE FROM concerts WHERE id=$1`, chi.URLParam(r, "id"))
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) AdminSaveConcertSeats(w http.ResponseWriter, r *http.Request) {
	concertID := chi.URLParam(r, "id")
	var req AdminSaveSeatsRequest
	if err := ReadJSON(r, &req); err != nil { return }

	tx, err := h.ConcertDB.Begin()
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to start transaction")
		return
	}
	defer tx.Rollback()

	tx.Exec(`DELETE FROM concert_seats WHERE concert_id = $1`, concertID)
	for _, s := range req.Seats {
		tx.Exec(`INSERT INTO concert_seats (concert_id, seat_code, zone_name, price, color) VALUES ($1, $2, $3, $4, $5)`, concertID, s.SeatCode, s.ZoneName, s.Price, s.Color)
	}
	tx.Commit()

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Seats configured"})
}

// ---- News ----
func (h *Handler) AdminGetNewsList(w http.ResponseWriter, r *http.Request) {
	rows, err := h.ConcertDB.Query(`SELECT id, title, content, COALESCE(image_url, ''), is_active, created_at FROM news ORDER BY created_at DESC`)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to fetch news")
		return
	}
	defer rows.Close()
	
	var list []News
	for rows.Next() {
		var n News
		if err := rows.Scan(&n.ID, &n.Title, &n.Content, &n.ImageURL, &n.IsActive, &n.CreatedAt); err == nil { list = append(list, n) }
	}
	if list == nil { list = []News{} }
	WriteJSON(w, http.StatusOK, list)
}

func (h *Handler) AdminCreateNews(w http.ResponseWriter, r *http.Request) {
	r.ParseMultipartForm(4 * 1024 * 1024)
	imageURL, _ := tryReadImageDataURL(r, "image", 4*1024*1024)
	h.ConcertDB.Exec(`INSERT INTO news (title, content, image_url, is_active) VALUES ($1, $2, $3, true)`, r.FormValue("title"), r.FormValue("content"), imageURL)
	WriteJSON(w, http.StatusCreated, map[string]string{"message": "Success"})
}

func (h *Handler) AdminUpdateNews(w http.ResponseWriter, r *http.Request) {
	r.ParseMultipartForm(4 * 1024 * 1024)
	imageURL, _ := tryReadImageDataURL(r, "image", 4*1024*1024)
	if imageURL != "" {
		h.ConcertDB.Exec(`UPDATE news SET title=$1, content=$2, is_active=$3, image_url=$4 WHERE id=$5`, r.FormValue("title"), r.FormValue("content"), r.FormValue("is_active") == "true", imageURL, chi.URLParam(r, "id"))
	} else {
		h.ConcertDB.Exec(`UPDATE news SET title=$1, content=$2, is_active=$3 WHERE id=$4`, r.FormValue("title"), r.FormValue("content"), r.FormValue("is_active") == "true", chi.URLParam(r, "id"))
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Updated"})
}

func (h *Handler) AdminDeleteNews(w http.ResponseWriter, r *http.Request) {
	h.ConcertDB.Exec(`DELETE FROM news WHERE id=$1`, chi.URLParam(r, "id"))
	w.WriteHeader(http.StatusNoContent)
}