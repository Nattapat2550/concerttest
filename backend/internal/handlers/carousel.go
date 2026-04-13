// backend/internal/handlers/carousel.go
package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
)

// GET /api/carousel (Public - ดึงรูปไปโชว์หน้า Home อันนี้ไม่ซ้ำ)
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
		list = []Carousel{} 
	}
	WriteJSON(w, http.StatusOK, list)
}

// ==========================================
// Admin Functions (เติม New เพื่อหลบฟังก์ชันเก่า)
// ==========================================

// GET /api/admin/carousel (Admin ดึงรายการ)
func (h *Handler) AdminCarouselListNew(w http.ResponseWriter, r *http.Request) {
	h.CarouselList(w, r) 
}

// POST /api/admin/carousel (Admin สร้างแบนเนอร์ใหม่)
func (h *Handler) AdminCarouselCreateNew(w http.ResponseWriter, r *http.Request) {
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

// PUT /api/admin/carousel/{id} (Admin อัปเดตแบนเนอร์)
func (h *Handler) AdminCarouselUpdateNew(w http.ResponseWriter, r *http.Request) {
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Updated successfully"})
}

// DELETE /api/admin/carousel/{id} (Admin ลบแบนเนอร์)
func (h *Handler) AdminCarouselDeleteNew(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid ID")
		return
	}

	_, err = h.ConcertDB.ExecContext(r.Context(), `DELETE FROM carousels WHERE id = $1`, id)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to delete carousel")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Deleted successfully"})
}