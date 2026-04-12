package handlers

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

type SubmitAppealRequest struct {
	Email  string `json:"email"`
	Reason string `json:"reason"`
}

func (h *Handler) SubmitAppeal(w http.ResponseWriter, r *http.Request) {
	var req SubmitAppealRequest
	if err := ReadJSON(r, &req); err != nil {
		h.writeError(w, http.StatusBadRequest, "ข้อมูลไม่ถูกต้อง")
		return
	}

	if req.Email == "" || req.Reason == "" {
		h.writeError(w, http.StatusBadRequest, "กรุณากรอกข้อมูลให้ครบถ้วน")
		return
	}

	_, err := h.ConcertDB.ExecContext(r.Context(), "INSERT INTO user_appeals (email, reason) VALUES ($1, $2)", req.Email, req.Reason)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "ไม่สามารถยื่นคำร้องได้ในขณะนี้")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "ยื่นคำร้องสำเร็จแล้ว ทีมงานจะตรวจสอบโดยเร็วที่สุด"})
}

type AppealDTO struct {
	ID        int       `json:"id"`
	Email     string    `json:"email"`
	Reason    string    `json:"reason"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

func (h *Handler) AdminGetAppeals(w http.ResponseWriter, r *http.Request) {
	rows, err := h.ConcertDB.QueryContext(r.Context(), "SELECT id, email, reason, status, created_at FROM user_appeals ORDER BY created_at DESC")
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer rows.Close()

	var appeals []AppealDTO
	for rows.Next() {
		var a AppealDTO
		if err := rows.Scan(&a.ID, &a.Email, &a.Reason, &a.Status, &a.CreatedAt); err == nil {
			appeals = append(appeals, a)
		}
	}
	if appeals == nil {
		appeals = []AppealDTO{}
	}

	WriteJSON(w, http.StatusOK, appeals)
}

type ReviewAppealRequest struct {
	Status string `json:"status"` // "approved" หรือ "rejected"
}

func (h *Handler) AdminReviewAppeal(w http.ResponseWriter, r *http.Request) {
	appealID := chi.URLParam(r, "id")
	var req ReviewAppealRequest
	if err := ReadJSON(r, &req); err != nil {
		h.writeError(w, http.StatusBadRequest, "ข้อมูลไม่ถูกต้อง")
		return
	}

	var email string
	err := h.ConcertDB.QueryRowContext(r.Context(), "SELECT email FROM user_appeals WHERE id = $1", appealID).Scan(&email)
	if err != nil {
		h.writeError(w, http.StatusNotFound, "ไม่พบคำร้อง")
		return
	}

	_, err = h.ConcertDB.ExecContext(r.Context(), "UPDATE user_appeals SET status = $1 WHERE id = $2", req.Status, appealID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "อัปเดตสถานะล้มเหลว")
		return
	}

	// หาก Admin กดอนุมัติ ให้เชื่อมต่อ PureAPI เพื่ออัปเดตสถานะ User กลับมาเป็น active
	if req.Status == "approved" {
		var user map[string]any
		err := h.Pure.Post(r.Context(), "/api/internal/find-user", map[string]any{"email": email}, &user)
		if err == nil && user["id"] != nil {
			payload := map[string]any{
				"id":     user["id"],
				"status": "active",
			}
			h.Pure.Post(r.Context(), "/api/internal/admin/users/update", payload, nil)
		}
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "ดำเนินการสำเร็จ"})
}