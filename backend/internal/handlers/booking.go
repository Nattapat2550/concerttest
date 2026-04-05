package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/go-chi/chi/v5"
)

// ===== BOOKING FUNCTIONS =====

func (h *Handler) BookSeat(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 7*time.Second)
	defer cancel()

	var req BookSeatRequest
	if err := ReadJSON(r, &req); err != nil { return }
	u := GetUser(r)
	if u == nil { return }

	// หา AccessCode จาก ID ของคอนเสิร์ตเพื่อไปเช็คกับ Queue Manager
	var accessCode string
	err := h.ConcertDB.QueryRowContext(ctx, "SELECT access_code FROM concerts WHERE id = $1", req.ConcertID).Scan(&accessCode)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid concert")
		return
	}

	q := getOrCreateQueue(accessCode)
	serving := atomic.LoadInt64(&q.currentServing)
	
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