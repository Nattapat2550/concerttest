// backend/internal/handlers/booking.go
package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/go-chi/chi/v5"
)

// ===== Helper for QR Token =====
func generateQRToken(bookingID int) string {
	secret := "concerttick_super_secret" 
	msg := fmt.Sprintf("%d", bookingID)
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(msg))
	sig := hex.EncodeToString(h.Sum(nil))
	return base64.StdEncoding.EncodeToString([]byte(msg + "|" + sig))
}

// ===== BOOKING FUNCTIONS =====

func (h *Handler) BookSeat(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 7*time.Second)
	defer cancel()

	h.ConcertDB.ExecContext(ctx, `UPDATE seats SET is_booked = false WHERE id IN (SELECT seat_id FROM bookings WHERE status = 'wait' AND booked_at < NOW() - INTERVAL '10 minutes' AND seat_id IS NOT NULL)`)
	h.ConcertDB.ExecContext(ctx, `UPDATE bookings SET status = 'cancelled' WHERE status = 'wait' AND booked_at < NOW() - INTERVAL '10 minutes'`)

	var req BookSeatRequest
	if err := ReadJSON(r, &req); err != nil { return }
	u := GetUser(r)
	if u == nil { return }
	userID := fmt.Sprint(u.ID)

	// 🛑 [SECURITY 1] ดักด้วย In-Memory Cache ก่อน เพื่อสู้กับ Load Test 
	if _, suspended := LocalSuspendedUsers.Load(userID); suspended {
		h.writeError(w, http.StatusForbidden, "บัญชีของคุณถูกระงับการใช้งาน (Suspended) ไม่สามารถจองที่นั่งได้")
		return
	}

	// 🛑 [SECURITY 2] เช็ค API หากไม่มีใน Cache
	var userStatusData map[string]any
	if err := h.Pure.Post(ctx, "/api/internal/find-user", map[string]any{"id": u.ID}, &userStatusData); err == nil {
		if status, ok := userStatusData["status"].(string); ok && status == "suspended" {
			LocalSuspendedUsers.Store(userID, true) // แคชไว้ใช้รอบหน้า
			h.writeError(w, http.StatusForbidden, "บัญชีของคุณถูกระงับการใช้งาน (Suspended) ไม่สามารถจองที่นั่งได้")
			return
		}
	}

	var accessCode string
	var showDate time.Time
	err := h.ConcertDB.QueryRowContext(ctx, "SELECT access_code, show_date FROM concerts WHERE id = $1", req.ConcertID).Scan(&accessCode, &showDate)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid concert")
		return
	}

	if time.Now().After(showDate) {
		h.writeError(w, http.StatusBadRequest, "คอนเสิร์ตนี้ได้เริ่มหรือจบลงแล้ว ไม่สามารถจองที่นั่งได้")
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
		// 🛑 [SECURITY CHECK 1] ป้องกันการแก้ราคาจาก Frontend (Price Manipulation)
		var actualPrice float64
		errPrice := tx.QueryRowContext(ctx, "SELECT price FROM concert_seats WHERE concert_id = $1 AND seat_code = $2", req.ConcertID, req.SeatCode).Scan(&actualPrice)
		if errPrice == nil && actualPrice != req.Price {
			// ทุจริต! แบนลง Cache ทันที + ยิง API
			LocalSuspendedUsers.Store(userID, true)
			h.Pure.Post(context.Background(), "/api/internal/admin/users/update", map[string]any{"id": u.ID, "status": "suspended"}, nil)
			h.writeError(w, http.StatusForbidden, "ตรวจพบความผิดปกติของข้อมูล (Price manipulation) บัญชีของคุณถูกระงับการใช้งานทันที")
			return
		}

		var existingID int
		err := tx.QueryRowContext(ctx, `
			SELECT id FROM bookings 
			WHERE concert_id = $1 AND seat_code = $2 AND status IN ('confirmed', 'used', 'wait') 
			FOR UPDATE`, req.ConcertID, req.SeatCode).Scan(&existingID)
			
		if err == nil {
			h.writeError(w, http.StatusConflict, "ที่นั่งนี้ถูกจองไปแล้วโดยผู้ใช้อื่น กรุณาเลือกใหม่")
			return
		} else if err != sql.ErrNoRows {
			h.writeError(w, http.StatusInternalServerError, "Database error")
			return
		}

		// ใช้ actualPrice เสมอเพื่อความปลอดภัยขั้นสูงสุด
		_, err = tx.ExecContext(ctx, `INSERT INTO bookings (user_id, concert_id, seat_code, price, status) VALUES ($1, $2, $3, $4, 'wait')`, userID, req.ConcertID, req.SeatCode, actualPrice)
		if err != nil { 
			h.writeError(w, http.StatusConflict, "ที่นั่งนี้เพิ่งถูกจองไป กรุณาเลือกใหม่")
			return 
		}
	} else {
		var isBooked bool
		err := tx.QueryRowContext(ctx, `SELECT is_booked FROM seats WHERE id = $1 AND concert_id = $2 FOR UPDATE`, req.SeatID, req.ConcertID).Scan(&isBooked)
		if err != nil || isBooked { h.writeError(w, http.StatusConflict, "Seat unavailable"); return }
		
		var sCode string; var actualPrice float64
		err = tx.QueryRowContext(ctx, `SELECT seat_code, price FROM seats WHERE id = $1`, req.SeatID).Scan(&sCode, &actualPrice)
		if err != nil { h.writeError(w, http.StatusInternalServerError, "Seat error"); return }

		// 🛑 [SECURITY CHECK 2]
		if actualPrice != req.Price {
			LocalSuspendedUsers.Store(userID, true)
			h.Pure.Post(context.Background(), "/api/internal/admin/users/update", map[string]any{"id": u.ID, "status": "suspended"}, nil)
			h.writeError(w, http.StatusForbidden, "ตรวจพบความผิดปกติของข้อมูล บัญชีของคุณถูกระงับการใช้งานทันที")
			return
		}

		tx.ExecContext(ctx, "UPDATE seats SET is_booked = true WHERE id = $1", req.SeatID)
		tx.ExecContext(ctx, `INSERT INTO bookings (user_id, concert_id, seat_id, seat_code, price, status) VALUES ($1, $2, $3, $4, $5, 'wait')`, userID, req.ConcertID, req.SeatID, sCode, actualPrice)
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
		SELECT b.id, c.name, COALESCE(b.seat_code, ''), COALESCE(b.price, 0), b.status, COALESCE(c.eticket_config, '{}')
		FROM bookings b JOIN concerts c ON b.concert_id = c.id 
		WHERE b.user_id = $1 ORDER BY b.booked_at DESC`, fmt.Sprint(u.ID))
	defer rows.Close()
	
	var bookings []MyBooking
	for rows.Next() {
		var b MyBooking
		if err := rows.Scan(&b.ID, &b.ConcertName, &b.SeatCode, &b.Price, &b.Status, &b.EticketConfig); err == nil { 
			b.QRToken = generateQRToken(b.ID)
			bookings = append(bookings, b) 
		}
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
	err := tx.QueryRowContext(ctx, `SELECT seat_id FROM bookings WHERE id = $1 AND user_id = $2 AND status IN ('wait', 'confirmed') FOR UPDATE`, bookingID, fmt.Sprint(u.ID)).Scan(&seatID)
	if err != nil { h.writeError(w, http.StatusNotFound, "Booking not found"); return }

	tx.ExecContext(ctx, "UPDATE bookings SET status = 'cancelled' WHERE id = $1", bookingID)
	if seatID.Valid {
		tx.ExecContext(ctx, "UPDATE seats SET is_booked = false WHERE id = $1", seatID.Int64)
	}
	tx.Commit()

	WriteJSON(w, http.StatusOK, map[string]string{"message": "Booking cancelled"})
}

// ===== GTYCoin / Wallet Functions =====

func (h *Handler) GetWallet(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	if u == nil { return }
	var balance float64
	err := h.ConcertDB.QueryRow("SELECT balance FROM user_wallets WHERE user_id = $1", fmt.Sprint(u.ID)).Scan(&balance)
	if err != nil { balance = 0 }
	WriteJSON(w, http.StatusOK, map[string]interface{}{"balance": balance})
}

func (h *Handler) TopupWallet(w http.ResponseWriter, r *http.Request) {
	u := GetUser(r)
	if u == nil { return }
	var req TopupWalletRequest
	if err := ReadJSON(r, &req); err != nil { return }
	if req.Amount <= 0 { h.writeError(w, http.StatusBadRequest, "Invalid amount"); return }
	
	_, err := h.ConcertDB.Exec(`
		INSERT INTO user_wallets (user_id, balance) VALUES ($1, $2)
		ON CONFLICT (user_id) DO UPDATE SET balance = user_wallets.balance + $2
	`, fmt.Sprint(u.ID), req.Amount)
	
	if err != nil { h.writeError(w, http.StatusInternalServerError, "Topup failed"); return }
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Topup successful"})
}

func (h *Handler) PayBooking(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	bookingID := chi.URLParam(r, "id")
	u := GetUser(r)
	if u == nil { return }

	tx, err := h.ConcertDB.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil { h.writeError(w, http.StatusInternalServerError, "System busy"); return }
	defer tx.Rollback()

	var price float64
	var status string
	err = tx.QueryRowContext(ctx, "SELECT price, status FROM bookings WHERE id = $1 AND user_id = $2 FOR UPDATE", bookingID, fmt.Sprint(u.ID)).Scan(&price, &status)
	if err != nil { h.writeError(w, http.StatusNotFound, "Booking not found"); return }
	if status != "wait" { h.writeError(w, http.StatusBadRequest, "ไม่สามารถชำระเงินได้ (สถานะไม่ใช่รอชำระ หรือตั๋วหมดอายุแล้ว)"); return }

	var balance float64
	err = tx.QueryRowContext(ctx, "SELECT balance FROM user_wallets WHERE user_id = $1 FOR UPDATE", fmt.Sprint(u.ID)).Scan(&balance)
	if err == sql.ErrNoRows { balance = 0 }

	if balance < price {
		h.writeError(w, http.StatusBadRequest, "GTYCoin ไม่เพียงพอ กรุณาเติมเงินเข้าระบบ")
		return
	}

	_, err = tx.ExecContext(ctx, "UPDATE user_wallets SET balance = balance - $1 WHERE user_id = $2", price, fmt.Sprint(u.ID))
	if err != nil { h.writeError(w, http.StatusInternalServerError, "Payment error"); return }

	_, err = tx.ExecContext(ctx, "UPDATE bookings SET status = 'confirmed' WHERE id = $1", bookingID)
	if err != nil { h.writeError(w, http.StatusInternalServerError, "Update status error"); return }

	tx.Commit()
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Payment successful"})
}