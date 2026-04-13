// backend/internal/handlers/seat_ws.go
package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true }, // อะลุ่มอล่วย CORS สำหรับ WebSocket
}

// Global state ของระบบล็อคที่นั่งและผู้ใช้ที่ต่อ WS
var (
	concertClients sync.Map // map[string]*sync.Map (ConcertID -> Map of *websocket.Conn)
	concertLocks   sync.Map // map[string]*sync.Map (ConcertID -> Map of SeatCode -> bool)

	// สำหรับ Monitoring (ใช้อ่านผ่าน /api/health)
	activeConnections int64
	totalLockedSeats  int64
)

type WSMessage struct {
	Action      string   `json:"action"`
	SeatCode    string   `json:"seat_code,omitempty"`
	LockedSeats []string `json:"locked_seats,omitempty"`
}

func (h *Handler) SeatWebSocketHandler(w http.ResponseWriter, r *http.Request) {
	concertID := chi.URLParam(r, "id")
	if concertID == "" {
		http.Error(w, "Concert ID required", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("WebSocket Upgrade Error", "error", err)
		return
	}
	defer conn.Close()

	atomic.AddInt64(&activeConnections, 1)
	defer atomic.AddInt64(&activeConnections, -1)

	// เพิ่ม Client เข้าระบบ
	clientsInterface, _ := concertClients.LoadOrStore(concertID, &sync.Map{})
	clients := clientsInterface.(*sync.Map)
	clients.Store(conn, true)
	defer clients.Delete(conn)

	// ส่งสถานะที่นั่งที่ล็อกอยู่ปัจจุบันให้ Client ที่เพิ่งต่อเข้ามา
	locksInterface, _ := concertLocks.LoadOrStore(concertID, &sync.Map{})
	locks := locksInterface.(*sync.Map)
	
	var initialLocked []string
	locks.Range(func(key, value any) bool {
		initialLocked = append(initialLocked, key.(string))
		return true
	})

	_ = conn.WriteJSON(WSMessage{
		Action:      "init",
		LockedSeats: initialLocked,
	})

	// รอรับคำสั่ง (เช่น lock) จาก Client
	for {
		var msg WSMessage
		if err := conn.ReadJSON(&msg); err != nil {
			break // Client ตัดการเชื่อมต่อ
		}

		if msg.Action == "lock" && msg.SeatCode != "" {
			// ตรวจสอบว่ามีคนล็อคหรือยัง
			if _, exists := locks.LoadOrStore(msg.SeatCode, true); !exists {
				atomic.AddInt64(&totalLockedSeats, 1)

				// กระจายสถานะให้คนอื่นใน Concert เดียวกันรับรู้
				broadcastMsg, _ := json.Marshal(WSMessage{
					Action:   "locked",
					SeatCode: msg.SeatCode,
				})
				broadcastToConcert(clients, broadcastMsg)

				// ปลดล็อกอัตโนมัติเมื่อครบ 5 นาที (Render Free ไม่มี Redis ก็ใช้ goroutine เบาๆ)
				time.AfterFunc(5*time.Minute, func() {
					if _, ok := locks.LoadAndDelete(msg.SeatCode); ok {
						atomic.AddInt64(&totalLockedSeats, -1)
						unlockMsg, _ := json.Marshal(WSMessage{
							Action:   "unlocked",
							SeatCode: msg.SeatCode,
						})
						broadcastToConcert(clients, unlockMsg)
					}
				})
			}
		}
	}
}

func broadcastToConcert(clients *sync.Map, msg []byte) {
	clients.Range(func(key, value any) bool {
		conn := key.(*websocket.Conn)
		_ = conn.WriteMessage(websocket.TextMessage, msg)
		return true
	})
}