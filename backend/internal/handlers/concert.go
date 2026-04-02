package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"sync/atomic"
	"time"

	"github.com/go-chi/chi/v5"
)

// 🌟🌟🌟 VIRTUAL WAITING ROOM (IN-MEMORY QUEUE) 🌟🌟🌟
var (
	globalQueueTicket int64 = 0
	currentServing    int64 = 100
)

// Background Worker: บริหารจัดการคิวเข้าหน้าจอง
func init() {
	go func() {
		for {
			time.Sleep(2 * time.Second)
			curr := atomic.LoadInt64(&currentServing)
			max := atomic.LoadInt64(&globalQueueTicket)
			
			if curr < max {
				// ถ้าระบบติดคิว (คนเข้าเกินโควต้า) ปล่อยคนเข้าเพิ่มทีละ 20 คน ต่อ 2 วินาที
				atomic.AddInt64(&currentServing, 20)
			} else if curr < max+100 {
				// ถ้าระบบว่าง ค่อยๆ เติมโควต้า "เข้าได้ทันที" ให้กลับมาเต็ม 100 เหมือนเดิม
				atomic.AddInt64(&currentServing, 20)
			}
		}
	}()
}

type QueueJoinResp struct {
	Ticket int64  `json:"ticket"`
	Status string `json:"status"` // ✅ แนบ Status กลับไปเลย Frontend จะได้ข้ามคิวได้ทันที
}

type QueueStatusResp struct {
	Status        string `json:"status"`
	MyTicket      int64  `json:"my_ticket"`
	CurrentTicket int64  `json:"current_ticket"`
}

func (h *Handler) JoinQueue(w http.ResponseWriter, r *http.Request) {
	ticket := atomic.AddInt64(&globalQueueTicket, 1)
	serving := atomic.LoadInt64(&currentServing)
	
	status := "waiting"
	if ticket <= serving {
		status = "ready"
	}

	WriteJSON(w, http.StatusOK, QueueJoinResp{
		Ticket: ticket, 
		Status: status, // ถ้าคนไม่ล้น จะส่ง "ready" กลับไปทันที
	})
}

func (h *Handler) CheckQueueStatus(w http.ResponseWriter, r *http.Request) {
	t := r.URL.Query().Get("ticket")
	myTicket, _ := strconv.ParseInt(t, 10, 64)
	serving := atomic.LoadInt64(&currentServing)

	status := "waiting"
	if myTicket <= serving {
		status = "ready"
	}

	WriteJSON(w, http.StatusOK, QueueStatusResp{
		Status:        status,
		MyTicket:      myTicket,
		CurrentTicket: serving,
	})
}
// 🌟🌟🌟 สิ้นสุดระบบ QUEUE 🌟🌟🌟

// ===== Models =====
type News struct {
	ID        int       `json:"id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	ImageURL  string    `json:"image_url"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type Venue struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	SVGContent string `json:"svg_content"`
}

type Concert struct {
	ID             int       `json:"id"`
	Name           string    `json:"name"`
	ShowDate       time.Time `json:"show_date"`
	Venue          string    `json:"venue"`
	VenueID        *int      `json:"venue_id"`
	VenueName      string    `json:"venue_name"`
	TicketPrice    float64   `json:"ticket_price"`
	LayoutImageURL string    `json:"layout_image_url"`
}

type ConcertSeatConfig struct {
	SeatCode string  `json:"seat_code"`
	ZoneName string  `json:"zone_name"`
	Price    float64 `json:"price"`
	Color    string  `json:"color"`
}

type ConcertDetailsResponse struct {
	Concert         Concert             `json:"concert"`
	SVGContent      string              `json:"svg_content"`
	ConfiguredSeats []ConcertSeatConfig `json:"configured_seats"`
	BookedSeats     []string            `json:"booked_seats"`
}

type AdminSaveSeatsRequest struct {
	Seats []ConcertSeatConfig `json:"seats"`
}

type Seat struct {
	ID        int     `json:"id"`
	ConcertID int     `json:"concert_id"`
	SeatCode  string  `json:"seat_code"`
	Price     float64 `json:"price"`
	IsBooked  bool    `json:"is_booked"`
}

type BookSeatRequest struct {
	ConcertID   int     `json:"concert_id"`
	SeatID      int     `json:"seat_id"`   
	SeatCode    string  `json:"seat_code"` 
	Price       float64 `json:"price"`
	QueueTicket int64   `json:"queue_ticket"` // ✅ ป้องกันบอท: บังคับแนบเลขคิวมาด้วยตอนจอง
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
	
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	rows, err := h.ConcertDB.QueryContext(ctx, `SELECT id, title, content, COALESCE(image_url, ''), created_at FROM news WHERE is_active = true ORDER BY created_at DESC`)
	if err != nil { 
		h.writeError(w, http.StatusInternalServerError, "DB Error")
		return 
	}
	defer rows.Close()

	var newsList []News
	for rows.Next() {
		var n News
		if err := rows.Scan(&n.ID, &n.Title, &n.Content, &n.ImageURL, &n.CreatedAt); err == nil {
			newsList = append(newsList, n)
		}
	}
	
	if len(newsList) == 0 { 
		h.writeError(w, http.StatusNotFound, "No news")
		return 
	}
	WriteJSON(w, http.StatusOK, newsList)
}

func (h *Handler) GetConcerts(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	rows, err := h.ConcertDB.QueryContext(ctx, `
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
		SELECT c.id, c.name, c.show_date, c.venue_id, COALESCE(v.name, ''), c.ticket_price, COALESCE(v.svg_content, ''), COALESCE(c.layout_image_url, '')
		FROM concerts c LEFT JOIN venues v ON c.venue_id = v.id WHERE c.id = $1`, concertID).
		Scan(&res.Concert.ID, &res.Concert.Name, &res.Concert.ShowDate, &res.Concert.VenueID, &res.Concert.VenueName, &res.Concert.TicketPrice, &res.SVGContent, &res.Concert.LayoutImageURL)
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

func (h *Handler) BookSeat(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 7*time.Second)
	defer cancel()

	var req BookSeatRequest
	if err := ReadJSON(r, &req); err != nil { return }
	u := GetUser(r)
	if u == nil { return }

	// ✅ ป้องกันบอท: เช็คว่ามีบัตรคิวไหม และถึงคิวหรือยัง
	serving := atomic.LoadInt64(&currentServing)
	if req.QueueTicket <= 0 || req.QueueTicket > serving {
		h.writeError(w, http.StatusForbidden, "คุณยังไม่มีสิทธิ์ในการจอง หรือยังไม่ถึงคิวของคุณ (Bot Prevention)")
		return
	}

	tx, err := h.ConcertDB.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "System busy")
		return
	}
	defer tx.Rollback()

	if req.SeatCode != "" {
		var existingID int
		err := tx.QueryRowContext(ctx, `
			SELECT id FROM bookings 
			WHERE concert_id = $1 AND seat_code = $2 AND status = 'confirmed' 
			FOR UPDATE`, req.ConcertID, req.SeatCode).Scan(&existingID)
			
		if err == nil {
			h.writeError(w, http.StatusConflict, "ที่นั่งนี้ถูกจองไปแล้วโดยผู้ใช้อื่น กรุณาเลือกใหม่")
			return
		} else if err != sql.ErrNoRows {
			h.writeError(w, http.StatusInternalServerError, "Database error")
			return
		}

		_, err = tx.ExecContext(ctx, `INSERT INTO bookings (user_id, concert_id, seat_code, price, status) VALUES ($1, $2, $3, $4, 'confirmed')`, fmt.Sprint(u.ID), req.ConcertID, req.SeatCode, req.Price)
		if err != nil { 
			h.writeError(w, http.StatusConflict, "ที่นั่งนี้เพิ่งถูกจองไป กรุณาเลือกใหม่")
			return 
		}
	} else {
		var isBooked bool
		err := tx.QueryRowContext(ctx, `SELECT is_booked FROM seats WHERE id = $1 AND concert_id = $2 FOR UPDATE`, req.SeatID, req.ConcertID).Scan(&isBooked)
		if err != nil || isBooked { h.writeError(w, http.StatusConflict, "Seat unavailable"); return }
		
		var sCode string; var sPrice float64
		err = tx.QueryRowContext(ctx, `SELECT seat_code, price FROM seats WHERE id = $1`, req.SeatID).Scan(&sCode, &sPrice)
		if err != nil { h.writeError(w, http.StatusInternalServerError, "Seat error"); return }

		tx.ExecContext(ctx, "UPDATE seats SET is_booked = true WHERE id = $1", req.SeatID)
		tx.ExecContext(ctx, `INSERT INTO bookings (user_id, concert_id, seat_id, seat_code, price, status) VALUES ($1, $2, $3, $4, $5, 'confirmed')`, fmt.Sprint(u.ID), req.ConcertID, req.SeatID, sCode, sPrice)
	}

	if err := tx.Commit(); err != nil {
		h.writeError(w, http.StatusInternalServerError, "Transaction commit failed")
		return
	}
	
	WriteJSON(w, http.StatusCreated, map[string]string{"message": "success"})
}

func (h *Handler) GetMyBookings(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	u := GetUser(r)
	if u == nil { return }
	rows, _ := h.ConcertDB.QueryContext(ctx, `
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
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	bookingID := chi.URLParam(r, "id")
	u := GetUser(r)
	if u == nil { return }

	tx, _ := h.ConcertDB.BeginTx(ctx, nil)
	defer tx.Rollback()

	var seatID sql.NullInt64
	err := tx.QueryRowContext(ctx, `SELECT seat_id FROM bookings WHERE id = $1 AND user_id = $2 AND status = 'confirmed' FOR UPDATE`, bookingID, fmt.Sprint(u.ID)).Scan(&seatID)
	if err != nil { h.writeError(w, http.StatusNotFound, "Booking not found"); return }

	tx.ExecContext(ctx, "UPDATE bookings SET status = 'cancelled' WHERE id = $1", bookingID)
	if seatID.Valid {
		tx.ExecContext(ctx, "UPDATE seats SET is_booked = false WHERE id = $1", seatID.Int64)
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
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	rows, err := h.ConcertDB.QueryContext(ctx, `
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
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	bookingID := chi.URLParam(r, "id")
	tx, _ := h.ConcertDB.BeginTx(ctx, nil)
	defer tx.Rollback()

	var seatID sql.NullInt64
	err := tx.QueryRowContext(ctx, `SELECT seat_id FROM bookings WHERE id = $1 AND status = 'confirmed' FOR UPDATE`, bookingID).Scan(&seatID)
	if err == nil {
		tx.ExecContext(ctx, "UPDATE bookings SET status = 'cancelled' WHERE id = $1", bookingID)
		if seatID.Valid { tx.ExecContext(ctx, "UPDATE seats SET is_booked = false WHERE id = $1", seatID.Int64) }
		tx.Commit()
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Booking cancelled by admin"})
}

func (h *Handler) AdminGetVenues(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	rows, _ := h.ConcertDB.QueryContext(ctx, `SELECT id, name, svg_content FROM venues ORDER BY id DESC`)
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
	if err := ReadJSON(r, &v); err != nil { h.writeError(w, http.StatusBadRequest, "Invalid JSON"); return }
	err := h.ConcertDB.QueryRow(`INSERT INTO venues (name, svg_content) VALUES ($1, $2) RETURNING id`, v.Name, v.SVGContent).Scan(&v.ID)
	if err != nil { h.writeError(w, http.StatusInternalServerError, "Failed"); return }
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
	venue := r.FormValue("venue")
	venueID := r.FormValue("venue_id")
	price := r.FormValue("ticket_price")
	if price == "" { price = "0" }
	showDate := r.FormValue("show_date")
	
	imageURL, _ := tryReadImageDataURL(r, "image", 5*1024*1024)

	var vID interface{}
	if venueID == "" { vID = nil } else { vID = venueID }

	_, err := h.ConcertDB.Exec(`INSERT INTO concerts (name, venue, venue_id, ticket_price, show_date, layout_image_url) VALUES ($1, $2, $3, $4, $5, $6)`, name, venue, vID, price, showDate, imageURL)
	if err != nil { h.writeError(w, http.StatusInternalServerError, "Failed to create concert"); return }

	WriteJSON(w, http.StatusCreated, map[string]string{"message": "Success"})
}

func (h *Handler) AdminUpdateConcert(w http.ResponseWriter, r *http.Request) {
	r.ParseMultipartForm(10 * 1024 * 1024)
	name := r.FormValue("name")
	venue := r.FormValue("venue")
	venueID := r.FormValue("venue_id")
	price := r.FormValue("ticket_price")
	if price == "" { price = "0" }
	showDate := r.FormValue("show_date")
	id := chi.URLParam(r, "id")
	
	imageURL, _ := tryReadImageDataURL(r, "image", 5*1024*1024)
	var vID interface{}
	if venueID == "" { vID = nil } else { vID = venueID }

	var err error
	if imageURL != "" {
		_, err = h.ConcertDB.Exec(`UPDATE concerts SET name=$1, venue=$2, venue_id=$3, ticket_price=$4, show_date=$5, layout_image_url=$6 WHERE id=$7`, name, venue, vID, price, showDate, imageURL, id)
	} else {
		_, err = h.ConcertDB.Exec(`UPDATE concerts SET name=$1, venue=$2, venue_id=$3, ticket_price=$4, show_date=$5 WHERE id=$6`, name, venue, vID, price, showDate, id)
	}
	if err != nil { h.writeError(w, http.StatusInternalServerError, "Failed to update concert"); return }

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

	tx, _ := h.ConcertDB.Begin()
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