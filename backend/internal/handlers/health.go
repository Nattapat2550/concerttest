// backend/internal/handlers/health.go
package handlers

import (
	"net/http"
	"runtime"
	"sync/atomic"
	"time"
)

var startTime = time.Now()

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	WriteJSON(w, http.StatusOK, map[string]any{
		"status":                "ok",
		"active_users_in_queue": atomic.LoadInt64(&activeConnections), // ดึงข้อมูลจาก WebSocket
		"locked_seats_count":    atomic.LoadInt64(&totalLockedSeats),
		"memory_usage_mb":       float64(m.Alloc) / 1024.0 / 1024.0,
		"uptime":                time.Since(startTime).String(),
	})
}