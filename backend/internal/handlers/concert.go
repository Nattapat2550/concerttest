package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

// Models
type News struct {
	ID       int    `json:"id"`
	Title    string `json:"title"`
	Content  string `json:"content"`
	ImageURL string `json:"image_url"`
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
	ID          int    `json:"id"`
	ConcertName string `json:"concert_name"`
	SeatCode    string `json:"seat_code"`
	Status      string `json:"status"`
}

// 1. ดึงข่าวสารล่าสุด
func (h *Handler) GetLatestNews(w http.ResponseWriter, r *http.Request) {
	if h.ConcertDB == nil {
		h.writeError(w, http.StatusInternalServerError, "Concert DB not configured")
		return
	}
	var news News
	err := h.ConcertDB.QueryRow(`SELECT id, title, content, COALESCE(image_url, '') FROM news WHERE is_active = true ORDER BY created_at DESC LIMIT 1`).Scan(&news.ID, &news.Title, &news.Content, &news.ImageURL)
	if err == sql.ErrNoRows {
		h.writeError(w, http.StatusNotFound, "No active news")
		return
	} else if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Database error")
		return
	}
	WriteJSON(w, http.StatusOK, news)
}

// 2. ดึงคอนเสิร์ต
func (h *Handler) GetConcerts(w http.ResponseWriter, r *http.Request) {
	rows, err := h.ConcertDB.Query(`SELECT id, name, show_date, venue, COALESCE(layout_image_url, '') FROM concerts ORDER BY show_date ASC`)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer rows.Close()

	var concerts []Concert
	for rows.Next() {
		var c Concert
		if err := rows.Scan(&c.ID, &c.Name, &c.ShowDate, &c.Venue, &c.LayoutImageURL); err == nil {
			concerts = append(concerts, c)
		}
	}
	if concerts == nil { concerts = []Concert{} }
	WriteJSON(w, http.StatusOK, concerts)
}

// 3. ดึงที่นั่ง
func (h *Handler) GetConcertSeats(w http.ResponseWriter, r *http.Request) {
	concertID := chi.URLParam(r, "id")
	rows, err := h.ConcertDB.Query(`SELECT id, concert_id, seat_code, price, is_booked FROM seats WHERE concert_id = $1 ORDER BY seat_code ASC`, concertID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer rows.Close()

	var seats []Seat
	for rows.Next() {
		var s Seat
		if err := rows.Scan(&s.ID, &s.ConcertID, &s.SeatCode, &s.Price, &s.IsBooked); err == nil {
			seats = append(seats, s)
		}
	}
	if seats == nil { seats = []Seat{} }
	WriteJSON(w, http.StatusOK, seats)
}

// 4. ระบบจองที่นั่ง (แก้บัค 500)
func (h *Handler) BookSeat(w http.ResponseWriter, r *http.Request) {
	var req BookSeatRequest
	if err := ReadJSON(r, &req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	u := GetUser(r)
	if u == nil {
		h.writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	tx, err := h.ConcertDB.Begin()
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Transaction error")
		return
	}
	defer tx.Rollback()

	var isBooked bool
	err = tx.QueryRow(`SELECT is_booked FROM seats WHERE id = $1 AND concert_id = $2 FOR UPDATE`, req.SeatID, req.ConcertID).Scan(&isBooked)
	if err != nil || isBooked {
		h.writeError(w, http.StatusConflict, "Seat unavailable")
		return
	}

	_, err = tx.Exec("UPDATE seats SET is_booked = true WHERE id = $1", req.SeatID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Update failed")
		return
	}

	// ✅ ใช้ fmt.Sprint(u.ID) แก้ปัญหา Type Mismatch
	_, err = tx.Exec(`INSERT INTO bookings (user_id, concert_id, seat_id, status) VALUES ($1, $2, $3, 'confirmed')`, fmt.Sprint(u.ID), req.ConcertID, req.SeatID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Insert booking failed")
		return
	}
	tx.Commit()

	WriteJSON(w, http.StatusCreated, map[string]string{"message": "success"})
}

// 5. ดึงประวัติการจองของตัวเอง (แก้ 404)
func (h *Handler) GetMyBookings(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	if u == nil {
		h.writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	rows, err := h.ConcertDB.Query(`
		SELECT b.id, c.name, s.seat_code, b.status 
		FROM bookings b 
		JOIN concerts c ON b.concert_id = c.id 
		JOIN seats s ON b.seat_id = s.id 
		WHERE b.user_id = $1 ORDER BY b.booked_at DESC
	`, fmt.Sprint(u.ID))

	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "DB error")
		return
	}
	defer rows.Close()

	var bookings []MyBooking
	for rows.Next() {
		var b MyBooking
		if err := rows.Scan(&b.ID, &b.ConcertName, &b.SeatCode, &b.Status); err == nil {
			bookings = append(bookings, b)
		}
	}
	if bookings == nil { bookings = []MyBooking{} }
	WriteJSON(w, http.StatusOK, bookings)
}

// ================= ADMIN FUNCTIONS =================

// Admin: สร้างคอนเสิร์ต
func (h *Handler) AdminCreateConcert(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name           string `json:"name"`
		Venue          string `json:"venue"`
		ShowDate       string `json:"show_date"`
		LayoutImageURL string `json:"layout_image_url"`
	}
	if err := ReadJSON(r, &req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	var newID int
	err := h.ConcertDB.QueryRow(`
		INSERT INTO concerts (name, venue, show_date, layout_image_url) 
		VALUES ($1, $2, $3, $4) RETURNING id
	`, req.Name, req.Venue, req.ShowDate, req.LayoutImageURL).Scan(&newID)

	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to create concert")
		return
	}

	// สร้างที่นั่งจำลองให้คอนเสิร์ตใหม่ทันที
	seats := []string{"A1", "A2", "B1", "B2"}
	for _, sc := range seats {
		h.ConcertDB.Exec(`INSERT INTO seats (concert_id, seat_code, price) VALUES ($1, $2, 1500.00)`, newID, sc)
	}

	WriteJSON(w, http.StatusCreated, map[string]any{"id": newID, "message": "Concert created"})
}

// Admin: สร้างข่าวสาร
func (h *Handler) AdminCreateNews(w http.ResponseWriter, r *http.Request) {
	var req News
	if err := ReadJSON(r, &req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	_, err := h.ConcertDB.Exec(`
		INSERT INTO news (title, content, image_url, is_active) 
		VALUES ($1, $2, $3, true)
	`, req.Title, req.Content, req.ImageURL)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to create news")
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]string{"message": "News created"})
}