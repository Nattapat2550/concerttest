package handlers

import (
	"context"
	"net/http"
	"time"
)

// ===== NEWS FUNCTIONS =====

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