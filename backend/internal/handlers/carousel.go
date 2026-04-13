package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"
)

// GET /api/carousels/list (สำหรับหน้าเว็บผู้ใช้งาน)
func (h *Handler) CarouselList(w http.ResponseWriter, r *http.Request) {
	if h.ConcertDB == nil { return }
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	rows, err := h.ConcertDB.QueryContext(ctx, `SELECT id, image_url, link_url, is_active, sort_order, created_at FROM carousels WHERE is_active = true ORDER BY sort_order ASC, created_at DESC`)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "DB Error")
		return
	}
	defer rows.Close()

	var list []Carousel
	for rows.Next() {
		var c Carousel
		if err := rows.Scan(&c.ID, &c.ImageURL, &c.LinkURL, &c.IsActive, &c.SortOrder, &c.CreatedAt); err == nil {
			list = append(list, c)
		}
	}
	
	if list == nil {
		list = []Carousel{} // ป้องกัน JSON คืนค่า null
	}
	WriteJSON(w, http.StatusOK, list)
}

// POST /api/admin/carousels
func (h *Handler) AdminCreateCarousel(w http.ResponseWriter, r *http.Request) {
	var c Carousel
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid input")
		return
	}
	_, err := h.ConcertDB.ExecContext(r.Context(), `INSERT INTO carousels (image_url, link_url, is_active, sort_order) VALUES ($1, $2, $3, $4)`, c.ImageURL, c.LinkURL, c.IsActive, c.SortOrder)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to create carousel")
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]string{"message": "Created successfully"})
}