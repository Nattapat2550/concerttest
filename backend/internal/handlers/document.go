// backend/internal/handlers/document.go
package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
)

// GET /api/documents/list (ดึงรายการ Document สำหรับหน้า Home)
func (h *Handler) DocumentList(w http.ResponseWriter, r *http.Request) {
	if h.ConcertDB == nil { return }
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	rows, err := h.ConcertDB.QueryContext(ctx, `SELECT id, title, description, cover_image, gallery_urls, is_active, created_at FROM documents WHERE is_active = true ORDER BY created_at DESC`)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "DB Error")
		return
	}
	defer rows.Close()

	var list []Document
	for rows.Next() {
		var d Document
		if err := rows.Scan(&d.ID, &d.Title, &d.Description, &d.CoverImage, &d.GalleryURLs, &d.IsActive, &d.CreatedAt); err == nil {
			list = append(list, d)
		}
	}
	if list == nil {
		list = []Document{}
	}
	WriteJSON(w, http.StatusOK, list)
}

// GET /api/documents/{id} (ดึงรายละเอียดและแกลเลอรีของ Document นั้นๆ)
func (h *Handler) GetDocumentDetail(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if h.ConcertDB == nil { return }
	
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var d Document
	err := h.ConcertDB.QueryRowContext(ctx, `SELECT id, title, description, cover_image, gallery_urls, is_active, created_at FROM documents WHERE id = $1 AND is_active = true`, id).
		Scan(&d.ID, &d.Title, &d.Description, &d.CoverImage, &d.GalleryURLs, &d.IsActive, &d.CreatedAt)
	
	if err == sql.ErrNoRows {
		h.writeError(w, http.StatusNotFound, "Document not found")
		return
	} else if err != nil {
		h.writeError(w, http.StatusInternalServerError, "DB Error")
		return
	}
	WriteJSON(w, http.StatusOK, d)
}

// POST /api/admin/documents (Admin สร้าง Document)
func (h *Handler) AdminCreateDocument(w http.ResponseWriter, r *http.Request) {
	var d Document
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid input")
		return
	}
	// GalleryURLs ถูกส่งมาเป็น JSON String Array
	_, err := h.ConcertDB.ExecContext(r.Context(), `INSERT INTO documents (title, description, cover_image, gallery_urls, is_active) VALUES ($1, $2, $3, $4, $5)`, d.Title, d.Description, d.CoverImage, d.GalleryURLs, d.IsActive)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to create document")
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]string{"message": "Created successfully"})
}

// DELETE /api/admin/documents/{id} (Admin ลบ Document)
func (h *Handler) AdminDeleteDocument(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid ID")
		return
	}

	if h.ConcertDB == nil { return }

	_, err = h.ConcertDB.ExecContext(r.Context(), `DELETE FROM documents WHERE id = $1`, id)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to delete document")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Deleted successfully"})
}

// PUT /api/admin/documents/{id} (Admin แก้ไข Document) -- เพิ่มใหม่!
func (h *Handler) AdminUpdateDocument(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid ID")
		return
	}

	var d Document
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid input")
		return
	}

	if h.ConcertDB == nil { return }

	_, err = h.ConcertDB.ExecContext(r.Context(), 
		`UPDATE documents SET title = $1, description = $2, cover_image = $3, gallery_urls = $4, is_active = $5 WHERE id = $6`,
		d.Title, d.Description, d.CoverImage, d.GalleryURLs, d.IsActive, id)
	
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to update document")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Updated successfully"})
}