package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

// Models
type News struct {
	ID        int       `json:"id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	ImageURL  string    `json:"image_url"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type Concert struct {
	ID             int       `json:"id"`
	Name           string    `json:"name"`
	ShowDate       time.Time `json:"show_date"`
	Venue          string    `json:"venue"`
	LayoutImageURL string    `json:"layout_image_url"`
}

type Seat struct {
	ID        int     `json:"id"`
	ConcertID int     `json:"concert_id"`
	SeatCode  string  `json:"seat_code"`
	Price     float64 `json:"price"`
	IsBooked  bool    `json:"is_booked"`
}

type BookSeatRequest struct {
	ConcertID int `json:"concert_id"`
	SeatID    int `json:"seat_id"`
}

type MyBooking struct {
	ID          int       `json:"id"`
	ConcertName string    `json:"concert_name"`
	SeatCode    string    `json:"seat_code"`
	Status      string    `json:"status"`
}

// User Endpoint
func (h *Handler) GetLatestNews(w http.ResponseWriter, r *http.Request) {
	if h.ConcertDB == nil { return }
	var news News
	err := h.ConcertDB.QueryRow(`SELECT id, title, content, COALESCE(image_url, '') FROM news WHERE is_active = true ORDER BY created_at DESC LIMIT 1`).Scan(&news.ID, &news.Title, &news.Content, &news.ImageURL)
	if err != nil { h.writeError(w, http.StatusNotFound, "No news"); return }
	WriteJSON(w, http.StatusOK, news)
}

func (h *Handler) GetConcerts(w http.ResponseWriter, r *http.Request) {
	rows, err := h.ConcertDB.Query(`SELECT id, name, show_date, venue, COALESCE(layout_image_url, '') FROM concerts ORDER BY show_date ASC`)
	if err != nil { h.writeError(w, http.StatusInternalServerError, "DB Error"); return }
	defer rows.Close()
	var concerts []Concert
	for rows.Next() {
		var c Concert
		if err := rows.Scan(&c.ID, &c.Name, &c.ShowDate, &c.Venue, &c.LayoutImageURL); err == nil { concerts = append(concerts, c) }
	}
	if concerts == nil { concerts = []Concert{} }
	WriteJSON(w, http.StatusOK, concerts)
}

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

func (h *Handler) BookSeat(w http.ResponseWriter, r *http.Request) {
	var req BookSeatRequest
	if err := ReadJSON(r, &req); err != nil { return }
	u := GetUser(r)
	if u == nil { return }

	tx, _ := h.ConcertDB.Begin()
	defer tx.Rollback()

	var isBooked bool
	err := tx.QueryRow(`SELECT is_booked FROM seats WHERE id = $1 AND concert_id = $2 FOR UPDATE`, req.SeatID, req.ConcertID).Scan(&isBooked)
	if err != nil || isBooked { h.writeError(w, http.StatusConflict, "Seat unavailable"); return }

	tx.Exec("UPDATE seats SET is_booked = true WHERE id = $1", req.SeatID)
	tx.Exec(`INSERT INTO bookings (user_id, concert_id, seat_id, status) VALUES ($1, $2, $3, 'confirmed')`, fmt.Sprint(u.ID), req.ConcertID, req.SeatID)
	tx.Commit()
	WriteJSON(w, http.StatusCreated, map[string]string{"message": "success"})
}

func (h *Handler) GetMyBookings(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	if u == nil { return }
	rows, _ := h.ConcertDB.Query(`
		SELECT b.id, c.name, s.seat_code, b.status FROM bookings b 
		JOIN concerts c ON b.concert_id = c.id 
		JOIN seats s ON b.seat_id = s.id 
		WHERE b.user_id = $1 ORDER BY b.booked_at DESC`, fmt.Sprint(u.ID))
	defer rows.Close()
	var bookings []MyBooking
	for rows.Next() {
		var b MyBooking
		if err := rows.Scan(&b.ID, &b.ConcertName, &b.SeatCode, &b.Status); err == nil { bookings = append(bookings, b) }
	}
	if bookings == nil { bookings = []MyBooking{} }
	WriteJSON(w, http.StatusOK, bookings)
}

// ================= ADMIN FUNCTIONS =================

type AdminBookingView struct {
	ID          int       `json:"id"`
	UserID      string    `json:"user_id"`
	ConcertName string    `json:"concert_name"`
	SeatCode    string    `json:"seat_code"`
	Price       float64   `json:"price"`
	Status      string    `json:"status"`
	BookedAt    time.Time `json:"booked_at"`
}

// 1. Admin ดูข้อมูลการจองทั้งหมด (แบบละเอียด)
func (h *Handler) AdminGetAllBookings(w http.ResponseWriter, r *http.Request) {
	rows, err := h.ConcertDB.Query(`
		SELECT b.id, b.user_id, c.name, s.seat_code, s.price, b.status, b.booked_at
		FROM bookings b
		JOIN concerts c ON b.concert_id = c.id
		JOIN seats s ON b.seat_id = s.id
		ORDER BY b.booked_at DESC
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

// 2. Admin จัดการคอนเสิร์ต (อัปโหลดรูปผ่านเครื่อง)
func (h *Handler) AdminCreateConcert(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024*1024)
	r.ParseMultipartForm(4 * 1024 * 1024)

	name := r.FormValue("name")
	venue := r.FormValue("venue")
	showDate := r.FormValue("show_date")
	
	imageURL, _ := tryReadImageDataURL(r, "image", 4*1024*1024) // ฟังก์ชันแปลงรูปเป็น Base64 ที่มีอยู่แล้ว

	var newID int
	err := h.ConcertDB.QueryRow(`
		INSERT INTO concerts (name, venue, show_date, layout_image_url) 
		VALUES ($1, $2, $3, $4) RETURNING id
	`, name, venue, showDate, imageURL).Scan(&newID)

	if err != nil { h.writeError(w, http.StatusInternalServerError, "Failed to create concert"); return }

	// Auto-generate ที่นั่ง
	seats := []string{"A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4"}
	for _, sc := range seats {
		h.ConcertDB.Exec(`INSERT INTO seats (concert_id, seat_code, price) VALUES ($1, $2, 2500.00)`, newID, sc)
	}
	WriteJSON(w, http.StatusCreated, map[string]any{"id": newID, "message": "Success"})
}

func (h *Handler) AdminUpdateConcert(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024*1024)
	r.ParseMultipartForm(4 * 1024 * 1024)

	name := r.FormValue("name")
	venue := r.FormValue("venue")
	showDate := r.FormValue("show_date")
	imageURL, _ := tryReadImageDataURL(r, "image", 4*1024*1024)

	if imageURL != "" {
		h.ConcertDB.Exec(`UPDATE concerts SET name=$1, venue=$2, show_date=$3, layout_image_url=$4 WHERE id=$5`, name, venue, showDate, imageURL, id)
	} else {
		h.ConcertDB.Exec(`UPDATE concerts SET name=$1, venue=$2, show_date=$3 WHERE id=$4`, name, venue, showDate, id)
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Updated"})
}

func (h *Handler) AdminDeleteConcert(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	h.ConcertDB.Exec(`DELETE FROM concerts WHERE id=$1`, id)
	w.WriteHeader(http.StatusNoContent)
}

// 3. Admin จัดการ News
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