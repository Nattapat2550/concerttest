package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

// ===== Models (รวมโครงสร้างเก่าและใหม่) =====
type News struct {
	ID        int       `json:"id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	ImageURL  string    `json:"image_url"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type Venue struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	MasterSVG string `json:"master_svg"`
}

type VenueZone struct {
	ID       int    `json:"id"`
	VenueID  int    `json:"venue_id"`
	ZoneName string `json:"zone_name"`
	SubSVG   string `json:"sub_svg"`
}

type Concert struct {
	ID             int       `json:"id"`
	Name           string    `json:"name"`
	ShowDate       time.Time `json:"show_date"`
	Venue          string    `json:"venue"`      // ของเก่า
	VenueID        *int      `json:"venue_id"`   // ของใหม่
	VenueName      string    `json:"venue_name"` // ของใหม่
	TicketPrice    float64   `json:"ticket_price"`
	LayoutImageURL string    `json:"layout_image_url"`
}

type Seat struct {
	ID        int     `json:"id"`
	ConcertID int     `json:"concert_id"`
	SeatCode  string  `json:"seat_code"`
	Price     float64 `json:"price"`
	IsBooked  bool    `json:"is_booked"`
}

type ConcertMasterView struct {
	Concert   Concert `json:"concert"`
	MasterSVG string  `json:"master_svg"`
}

type ConcertZoneView struct {
	ZoneName    string   `json:"zone_name"`
	SubSVG      string   `json:"sub_svg"`
	BookedSeats []string `json:"booked_seats"`
}

type BookSeatRequest struct {
	ConcertID int     `json:"concert_id"`
	SeatID    int     `json:"seat_id"`   // เผื่อระบบเก่า
	SeatCode  string  `json:"seat_code"` // ระบบใหม่
	Price     float64 `json:"price"`
}

type MyBooking struct {
	ID          int       `json:"id"`
	ConcertName string    `json:"concert_name"`
	SeatCode    string    `json:"seat_code"`
	Price       float64   `json:"price"`
	Status      string    `json:"status"`
}

// ===== USER FUNCTIONS =====
func (h *Handler) GetLatestNews(w http.ResponseWriter, r *http.Request) {
	if h.ConcertDB == nil { return }
	var news News
	err := h.ConcertDB.QueryRow(`SELECT id, title, content, COALESCE(image_url, '') FROM news WHERE is_active = true ORDER BY created_at DESC LIMIT 1`).Scan(&news.ID, &news.Title, &news.Content, &news.ImageURL)
	if err != nil { h.writeError(w, http.StatusNotFound, "No news"); return }
	WriteJSON(w, http.StatusOK, news)
}

func (h *Handler) GetConcerts(w http.ResponseWriter, r *http.Request) {
	rows, err := h.ConcertDB.Query(`
		SELECT c.id, c.name, c.show_date, COALESCE(c.venue, ''), c.venue_id, COALESCE(v.name, ''), c.ticket_price, COALESCE(c.layout_image_url, '') 
		FROM concerts c LEFT JOIN venues v ON c.venue_id = v.id ORDER BY c.show_date ASC`)
	if err != nil { h.writeError(w, http.StatusInternalServerError, "DB Error"); return }
	defer rows.Close()
	var concerts []Concert
	for rows.Next() {
		var c Concert
		if err := rows.Scan(&c.ID, &c.Name, &c.ShowDate, &c.Venue, &c.VenueID, &c.VenueName, &c.TicketPrice, &c.LayoutImageURL); err == nil { concerts = append(concerts, c) }
	}
	if concerts == nil { concerts = []Concert{} }
	WriteJSON(w, http.StatusOK, concerts)
}

// ระบบเก่าดึงที่นั่ง
func (h *Handler) GetConcertSeats(w http.ResponseWriter, r *http.Request) {
	concertID := chi.URLParam(r, "id")
	rows, err := h.ConcertDB.Query(`SELECT id, concert_id, seat_code, price, is_booked FROM seats WHERE concert_id = $1 ORDER BY seat_code ASC`, concertID)
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

// ระบบใหม่ Master-Detail
func (h *Handler) GetConcertMaster(w http.ResponseWriter, r *http.Request) {
	concertID := chi.URLParam(r, "id")
	var view ConcertMasterView
	err := h.ConcertDB.QueryRow(`
		SELECT c.id, c.name, c.show_date, c.venue_id, COALESCE(v.name, ''), c.ticket_price, COALESCE(v.master_svg, '')
		FROM concerts c LEFT JOIN venues v ON c.venue_id = v.id WHERE c.id = $1`, concertID).
		Scan(&view.Concert.ID, &view.Concert.Name, &view.Concert.ShowDate, &view.Concert.VenueID, &view.Concert.VenueName, &view.Concert.TicketPrice, &view.MasterSVG)
	if err != nil { h.writeError(w, http.StatusNotFound, "Concert not found"); return }
	WriteJSON(w, http.StatusOK, view)
}

func (h *Handler) GetConcertZoneSeats(w http.ResponseWriter, r *http.Request) {
	concertID := chi.URLParam(r, "id")
	zoneName := chi.URLParam(r, "zone")
	var view ConcertZoneView
	view.ZoneName = zoneName

	var venueID int
	err := h.ConcertDB.QueryRow(`SELECT venue_id FROM concerts WHERE id = $1`, concertID).Scan(&venueID)
	if err != nil { h.writeError(w, http.StatusNotFound, "Concert not found"); return }

	err = h.ConcertDB.QueryRow(`SELECT sub_svg FROM venue_zones WHERE venue_id = $1 AND zone_name = $2`, venueID, zoneName).Scan(&view.SubSVG)
	if err != nil { view.SubSVG = "" }

	rows, _ := h.ConcertDB.Query(`SELECT seat_code FROM bookings WHERE concert_id = $1 AND seat_code LIKE $2 AND status = 'confirmed'`, concertID, zoneName+"-%")
	defer rows.Close()
	for rows.Next() {
		var sc string
		if err := rows.Scan(&sc); err == nil { view.BookedSeats = append(view.BookedSeats, sc) }
	}
	if view.BookedSeats == nil { view.BookedSeats = []string{} }
	WriteJSON(w, http.StatusOK, view)
}

// รองรับทั้งระบบเก่าและใหม่
func (h *Handler) BookSeat(w http.ResponseWriter, r *http.Request) {
	var req BookSeatRequest
	if err := ReadJSON(r, &req); err != nil { return }
	u := GetUser(r)
	if u == nil { return }

	tx, _ := h.ConcertDB.Begin()
	defer tx.Rollback()

	if req.SeatCode != "" {
		// ระบบใหม่ SVG (ใช้ SeatCode จองเข้า Bookings ตรงๆ)
		_, err := tx.Exec(`INSERT INTO bookings (user_id, concert_id, seat_code, price, status) VALUES ($1, $2, $3, $4, 'confirmed')`, fmt.Sprint(u.ID), req.ConcertID, req.SeatCode, req.Price)
		if err != nil { h.writeError(w, http.StatusConflict, "ที่นั่งนี้ถูกจองไปแล้ว กรุณาเลือกใหม่"); return }
	} else {
		// ระบบเก่าตาราง Seats
		var isBooked bool
		err := tx.QueryRow(`SELECT is_booked FROM seats WHERE id = $1 AND concert_id = $2 FOR UPDATE`, req.SeatID, req.ConcertID).Scan(&isBooked)
		if err != nil || isBooked { h.writeError(w, http.StatusConflict, "Seat unavailable"); return }
		
		var sCode string; var sPrice float64
		tx.QueryRow(`SELECT seat_code, price FROM seats WHERE id = $1`, req.SeatID).Scan(&sCode, &sPrice)
		
		tx.Exec("UPDATE seats SET is_booked = true WHERE id = $1", req.SeatID)
		tx.Exec(`INSERT INTO bookings (user_id, concert_id, seat_id, seat_code, price, status) VALUES ($1, $2, $3, $4, $5, 'confirmed')`, fmt.Sprint(u.ID), req.ConcertID, req.SeatID, sCode, sPrice)
	}

	tx.Commit()
	WriteJSON(w, http.StatusCreated, map[string]string{"message": "success"})
}

func (h *Handler) GetMyBookings(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	if u == nil { return }
	rows, _ := h.ConcertDB.Query(`
		SELECT b.id, c.name, COALESCE(b.seat_code, ''), COALESCE(b.price, 0), b.status 
		FROM bookings b JOIN concerts c ON b.concert_id = c.id 
		WHERE b.user_id = $1 ORDER BY b.booked_at DESC`, fmt.Sprint(u.ID))
	defer rows.Close()
	var bookings []MyBooking
	for rows.Next() {
		var b MyBooking
		if err := rows.Scan(&b.ID, &b.ConcertName, &b.SeatCode, &b.Price, &b.Status); err == nil { bookings = append(bookings, b) }
	}
	if bookings == nil { bookings = []MyBooking{} }
	WriteJSON(w, http.StatusOK, bookings)
}

func (h *Handler) CancelMyBooking(w http.ResponseWriter, r *http.Request) {
	bookingID := chi.URLParam(r, "id")
	u := GetUser(r)
	if u == nil { return }

	tx, _ := h.ConcertDB.Begin()
	defer tx.Rollback()

	var seatID sql.NullInt64
	err := tx.QueryRow(`SELECT seat_id FROM bookings WHERE id = $1 AND user_id = $2 AND status = 'confirmed' FOR UPDATE`, bookingID, fmt.Sprint(u.ID)).Scan(&seatID)
	if err != nil { h.writeError(w, http.StatusNotFound, "Booking not found"); return }

	tx.Exec("UPDATE bookings SET status = 'cancelled' WHERE id = $1", bookingID)
	if seatID.Valid {
		tx.Exec("UPDATE seats SET is_booked = false WHERE id = $1", seatID.Int64)
	}
	tx.Commit()

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Booking cancelled"})
}

// ===== ADMIN FUNCTIONS =====

type AdminBookingView struct {
	ID          int       `json:"id"`
	UserID      string    `json:"user_id"`
	ConcertName string    `json:"concert_name"`
	SeatCode    string    `json:"seat_code"`
	Price       float64   `json:"price"`
	Status      string    `json:"status"`
	BookedAt    time.Time `json:"booked_at"`
}

func (h *Handler) AdminGetAllBookings(w http.ResponseWriter, r *http.Request) {
	rows, err := h.ConcertDB.Query(`
		SELECT b.id, b.user_id, c.name, COALESCE(b.seat_code, ''), COALESCE(b.price, 0), b.status, b.booked_at
		FROM bookings b JOIN concerts c ON b.concert_id = c.id ORDER BY b.booked_at DESC
	`)
	if err != nil { h.writeError(w, http.StatusInternalServerError, "DB Error"); return }
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
	bookingID := chi.URLParam(r, "id")
	tx, _ := h.ConcertDB.Begin()
	defer tx.Rollback()

	var seatID sql.NullInt64
	err := tx.QueryRow(`SELECT seat_id FROM bookings WHERE id = $1 AND status = 'confirmed' FOR UPDATE`, bookingID).Scan(&seatID)
	if err == nil {
		tx.Exec("UPDATE bookings SET status = 'cancelled' WHERE id = $1", bookingID)
		if seatID.Valid { tx.Exec("UPDATE seats SET is_booked = false WHERE id = $1", seatID.Int64) }
		tx.Commit()
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Booking cancelled by admin"})
}

// ---- Venues (SVG Maps) ----
func (h *Handler) AdminGetVenues(w http.ResponseWriter, r *http.Request) {
	rows, _ := h.ConcertDB.Query(`SELECT id, name FROM venues ORDER BY id DESC`)
	defer rows.Close()
	var list []map[string]any
	for rows.Next() {
		var id int; var name string
		if err := rows.Scan(&id, &name); err == nil { list = append(list, map[string]any{"id":id, "name":name}) }
	}
	if list == nil { list = []map[string]any{} }
	WriteJSON(w, http.StatusOK, list)
}

func (h *Handler) AdminCreateVenue(w http.ResponseWriter, r *http.Request) {
	var v Venue
	if err := ReadJSON(r, &v); err != nil { h.writeError(w, http.StatusBadRequest, "Invalid JSON"); return }
	err := h.ConcertDB.QueryRow(`INSERT INTO venues (name, master_svg) VALUES ($1, $2) RETURNING id`, v.Name, v.MasterSVG).Scan(&v.ID)
	if err != nil { h.writeError(w, http.StatusInternalServerError, "Failed"); return }
	WriteJSON(w, http.StatusCreated, v)
}

func (h *Handler) AdminDeleteVenue(w http.ResponseWriter, r *http.Request) {
	h.ConcertDB.Exec(`DELETE FROM venues WHERE id=$1`, chi.URLParam(r, "id"))
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) AdminCreateVenueZone(w http.ResponseWriter, r *http.Request) {
	venueID := chi.URLParam(r, "id")
	var req VenueZone
	if err := ReadJSON(r, &req); err != nil { return }
	_, err := h.ConcertDB.Exec(`
		INSERT INTO venue_zones (venue_id, zone_name, sub_svg) VALUES ($1, $2, $3)
		ON CONFLICT (venue_id, zone_name) DO UPDATE SET sub_svg = EXCLUDED.sub_svg
	`, venueID, req.ZoneName, req.SubSVG)
	if err != nil { h.writeError(w, http.StatusInternalServerError, "Save zone failed"); return }
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Zone saved"})
}

func (h *Handler) AdminGetVenueZones(w http.ResponseWriter, r *http.Request) {
	venueID := chi.URLParam(r, "id")
	rows, _ := h.ConcertDB.Query(`SELECT id, zone_name FROM venue_zones WHERE venue_id = $1 ORDER BY zone_name`, venueID)
	defer rows.Close()
	var list []map[string]any
	for rows.Next() {
		var id int; var name string
		if err := rows.Scan(&id, &name); err == nil { list = append(list, map[string]any{"id":id, "name":name}) }
	}
	if list == nil { list = []map[string]any{} }
	WriteJSON(w, http.StatusOK, list)
}

// ---- Concerts ----
func (h *Handler) AdminCreateConcert(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024*1024)
	r.ParseMultipartForm(4 * 1024 * 1024)
	name := r.FormValue("name")
	venue := r.FormValue("venue")
	venueID := r.FormValue("venue_id")
	price := r.FormValue("ticket_price")
	if price == "" { price = "2500" }
	showDate := r.FormValue("show_date")
	imageURL, _ := tryReadImageDataURL(r, "image", 4*1024*1024)

	// รองรับทั้งแบบมี VenueID และไม่มี (ใส่ null)
	var err error
	if venueID != "" {
		_, err = h.ConcertDB.Exec(`INSERT INTO concerts (name, venue, venue_id, ticket_price, show_date, layout_image_url) VALUES ($1, $2, $3, $4, $5, $6)`, name, venue, venueID, price, showDate, imageURL)
	} else {
		_, err = h.ConcertDB.Exec(`INSERT INTO concerts (name, venue, ticket_price, show_date, layout_image_url) VALUES ($1, $2, $3, $4, $5)`, name, venue, price, showDate, imageURL)
	}

	if err != nil { h.writeError(w, http.StatusInternalServerError, "Failed to create concert"); return }
	WriteJSON(w, http.StatusCreated, map[string]string{"message": "Success"})
}

func (h *Handler) AdminUpdateConcert(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024*1024)
	r.ParseMultipartForm(4 * 1024 * 1024)
	name := r.FormValue("name")
	venue := r.FormValue("venue")
	venueID := r.FormValue("venue_id")
	price := r.FormValue("ticket_price")
	showDate := r.FormValue("show_date")
	imageURL, _ := tryReadImageDataURL(r, "image", 4*1024*1024)

	if venueID == "" {
		if imageURL != "" {
			h.ConcertDB.Exec(`UPDATE concerts SET name=$1, venue=$2, venue_id=NULL, ticket_price=$3, show_date=$4, layout_image_url=$5 WHERE id=$6`, name, venue, price, showDate, imageURL, id)
		} else {
			h.ConcertDB.Exec(`UPDATE concerts SET name=$1, venue=$2, venue_id=NULL, ticket_price=$3, show_date=$4 WHERE id=$5`, name, venue, price, showDate, id)
		}
	} else {
		if imageURL != "" {
			h.ConcertDB.Exec(`UPDATE concerts SET name=$1, venue=$2, venue_id=$3, ticket_price=$4, show_date=$5, layout_image_url=$6 WHERE id=$7`, name, venue, venueID, price, showDate, imageURL, id)
		} else {
			h.ConcertDB.Exec(`UPDATE concerts SET name=$1, venue=$2, venue_id=$3, ticket_price=$4, show_date=$5 WHERE id=$6`, name, venue, venueID, price, showDate, id)
		}
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Updated"})
}

func (h *Handler) AdminDeleteConcert(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	h.ConcertDB.Exec(`DELETE FROM concerts WHERE id=$1`, id)
	w.WriteHeader(http.StatusNoContent)
}

// ---- News ----
func (h *Handler) AdminGetNewsList(w http.ResponseWriter, r *http.Request) {
	rows, _ := h.ConcertDB.Query(`SELECT id, title, content, COALESCE(image_url, ''), is_active, created_at FROM news ORDER BY created_at DESC`)
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
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024*1024)
	r.ParseMultipartForm(4 * 1024 * 1024)
	title := r.FormValue("title")
	content := r.FormValue("content")
	imageURL, _ := tryReadImageDataURL(r, "image", 4*1024*1024)
	h.ConcertDB.Exec(`INSERT INTO news (title, content, image_url, is_active) VALUES ($1, $2, $3, true)`, title, content, imageURL)
	WriteJSON(w, http.StatusCreated, map[string]string{"message": "Success"})
}

func (h *Handler) AdminUpdateNews(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024*1024)
	r.ParseMultipartForm(4 * 1024 * 1024)
	title := r.FormValue("title")
	content := r.FormValue("content")
	isActive := r.FormValue("is_active") == "true"
	imageURL, _ := tryReadImageDataURL(r, "image", 4*1024*1024)
	if imageURL != "" {
		h.ConcertDB.Exec(`UPDATE news SET title=$1, content=$2, is_active=$3, image_url=$4 WHERE id=$5`, title, content, isActive, imageURL, id)
	} else {
		h.ConcertDB.Exec(`UPDATE news SET title=$1, content=$2, is_active=$3 WHERE id=$4`, title, content, isActive, id)
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Updated"})
}

func (h *Handler) AdminDeleteNews(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	h.ConcertDB.Exec(`DELETE FROM news WHERE id=$1`, id)
	w.WriteHeader(http.StatusNoContent)
}