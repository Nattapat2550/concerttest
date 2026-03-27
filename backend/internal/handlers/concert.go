package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

// Models สำหรับ Concert
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

// 1. ดึงข่าวสารล่าสุด (Popup หน้าเว็บ)
func (h *Handler) GetLatestNews(w http.ResponseWriter, r *http.Request) {
	if h.ConcertDB == nil {
		h.writeError(w, http.StatusInternalServerError, "Concert DB not configured")
		return
	}

	var news News
	err := h.ConcertDB.QueryRow(`
		SELECT id, title, content, COALESCE(image_url, '') 
		FROM news WHERE is_active = true ORDER BY created_at DESC LIMIT 1
	`).Scan(&news.ID, &news.Title, &news.Content, &news.ImageURL)

	if err == sql.ErrNoRows {
		h.writeError(w, http.StatusNotFound, "No active news")
		return
	} else if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Database error")
		return
	}

	WriteJSON(w, http.StatusOK, news)
}

// 2. ดึงรายการคอนเสิร์ต
func (h *Handler) GetConcerts(w http.ResponseWriter, r *http.Request) {
	if h.ConcertDB == nil {
		h.writeError(w, http.StatusInternalServerError, "Concert DB not configured")
		return
	}

	rows, err := h.ConcertDB.Query(`
		SELECT id, name, show_date, venue, COALESCE(layout_image_url, '') 
		FROM concerts ORDER BY show_date ASC
	`)
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

	// ถ้า array ว่าง ให้ส่ง [] กลับไปแทนที่จะเป็น null
	if concerts == nil {
		concerts = []Concert{}
	}

	WriteJSON(w, http.StatusOK, concerts)
}

// 3. ดึงที่นั่งสำหรับคอนเสิร์ตที่ระบุ
func (h *Handler) GetConcertSeats(w http.ResponseWriter, r *http.Request) {
	if h.ConcertDB == nil {
		h.writeError(w, http.StatusInternalServerError, "Concert DB not configured")
		return
	}

	concertID := chi.URLParam(r, "id")
	rows, err := h.ConcertDB.Query(`
		SELECT id, concert_id, seat_code, price, is_booked 
		FROM seats WHERE concert_id = $1 ORDER BY seat_code ASC
	`, concertID)
	
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

	if seats == nil {
		seats = []Seat{}
	}

	WriteJSON(w, http.StatusOK, seats)
}

// 4. ระบบจองที่นั่ง
func (h *Handler) BookSeat(w http.ResponseWriter, r *http.Request) {
	if h.ConcertDB == nil {
		h.writeError(w, http.StatusInternalServerError, "Concert DB not configured")
		return
	}

	var req BookSeatRequest
	if err := ReadJSON(r, &req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// ✅ แก้ไขตรงนี้: ใช้ GetUser(r) ซึ่งถูกแนบมาโดย RequireAuth Middleware แล้ว
	u := GetUser(r)
	if u == nil {
		h.writeError(w, http.StatusUnauthorized, "Unauthorized to book")
		return
	}

	// ใช้ Transaction ป้องกันการจองซ้ำซ้อน
	tx, err := h.ConcertDB.Begin()
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Transaction error")
		return
	}
	defer tx.Rollback()

	// เช็คว่าที่นั่งว่างหรือไม่
	var isBooked bool
	err = tx.QueryRow(`
		SELECT is_booked FROM seats WHERE id = $1 AND concert_id = $2 FOR UPDATE
	`, req.SeatID, req.ConcertID).Scan(&isBooked)

	if err != nil {
		h.writeError(w, http.StatusNotFound, "Seat not found")
		return
	}
	if isBooked {
		h.writeError(w, http.StatusConflict, "Seat is already booked")
		return
	}

	// อัปเดตสถานะที่นั่ง
	_, err = tx.Exec("UPDATE seats SET is_booked = true WHERE id = $1", req.SeatID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to update seat")
		return
	}

	// ✅ แก้ไขตรงนี้: ใช้ u.ID จาก GetUser(r)
	_, err = tx.Exec(`
		INSERT INTO bookings (user_id, concert_id, seat_id, status) 
		VALUES ($1, $2, $3, 'confirmed')
	`, u.ID, req.ConcertID, req.SeatID)
	
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to create booking")
		return
	}

	if err = tx.Commit(); err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to commit transaction")
		return
	}

	WriteJSON(w, http.StatusCreated, map[string]string{
		"message": "Booking successful",
	})
}