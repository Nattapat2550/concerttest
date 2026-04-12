package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/go-chi/chi/v5"
)

// LocalSuspendedUsers ทำหน้าที่เป็น In-Memory Cache เพื่อแบนทันทีตอน Load Test โดยไม่ต้องรอ API
var LocalSuspendedUsers sync.Map

// userQueueRequests เช็คว่า User ขอคิวรัวเกินไปหรือไม่
var userQueueRequests sync.Map // key: userID_concertID, value: *int32

// ConcertQueue เก็บข้อมูลคิวของแต่ละคอนเสิร์ต
type ConcertQueue struct {
	globalQueueTicket int64
	currentServing    int64
}

var (
	queues      = make(map[string]*ConcertQueue)
	queuesMutex sync.RWMutex
)

// getOrCreateQueue ดึงข้อมูลคิวของคอนเสิร์ตนั้น ถ้าไม่มีจะสร้างใหม่
func getOrCreateQueue(concertID string) *ConcertQueue {
	queuesMutex.RLock()
	q, exists := queues[concertID]
	queuesMutex.RUnlock()

	if exists {
		return q
	}

	queuesMutex.Lock()
	defer queuesMutex.Unlock()
	if q, exists := queues[concertID]; exists {
		return q
	}
	
	newQueue := &ConcertQueue{
		globalQueueTicket: 0,
		currentServing:    100, // โควต้าเข้าทันที 100 คนแรกโดยไม่ต้องรอ
	}
	queues[concertID] = newQueue
	return newQueue
}

func init() {
	go func() {
		for {
			time.Sleep(2 * time.Second)
			
			queuesMutex.RLock()
			var activeQueues []*ConcertQueue
			for _, q := range queues {
				activeQueues = append(activeQueues, q)
			}
			queuesMutex.RUnlock()

			for _, q := range activeQueues {
				curr := atomic.LoadInt64(&q.currentServing)
				max := atomic.LoadInt64(&q.globalQueueTicket)
				
				if curr < max {
					atomic.AddInt64(&q.currentServing, 20)
				} else if curr < max+100 {
					atomic.AddInt64(&q.currentServing, 20)
				}
			}
		}
	}()
}

type QueueJoinResp struct {
	Ticket int64  `json:"ticket"`
	Status string `json:"status"` 
}

type QueueStatusResp struct {
	Status        string `json:"status"`
	MyTicket      int64  `json:"my_ticket"`
	CurrentTicket int64  `json:"current_ticket"`
}

func (h *Handler) JoinQueue(w http.ResponseWriter, r *http.Request) {
	concertID := chi.URLParam(r, "id")
	if concertID == "" {
		WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "Missing concert ID"})
		return
	}

	u := GetUser(r)
	if u == nil {
		WriteJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}
	userID := fmt.Sprint(u.ID)

	// 🛑 [SECURITY 1] ตรวจสอบสถานะ User จาก Cache ทันที (ป้องกัน Load Test ทำ API หน่วง)
	if _, suspended := LocalSuspendedUsers.Load(userID); suspended {
		WriteJSON(w, http.StatusForbidden, map[string]string{"error": "บัญชีของคุณถูกระงับการใช้งาน (Suspended)"})
		return
	}

	// 🛑 [SECURITY 2] เช็คจาก API หลัก
	var userStatusData map[string]any
	if err := h.Pure.Post(r.Context(), "/api/internal/find-user", map[string]any{"id": u.ID}, &userStatusData); err == nil {
		if status, ok := userStatusData["status"].(string); ok && status == "suspended" {
			LocalSuspendedUsers.Store(userID, true) // บันทึกลง Cache
			WriteJSON(w, http.StatusForbidden, map[string]string{"error": "บัญชีของคุณถูกระงับการใช้งาน (Suspended)"})
			return
		}
	}

	// 🛑 [BOT PREVENTION] ตรวจจับถ้ายิงขอคิวรัวเกิน 5 ครั้ง ถือว่าเป็น Bot ระงับทันที
	requestKey := fmt.Sprintf("%s_%s", userID, concertID)
	val, _ := userQueueRequests.LoadOrStore(requestKey, new(int32))
	reqCount := atomic.AddInt32(val.(*int32), 1)

	if reqCount > 5 {
		LocalSuspendedUsers.Store(userID, true) // จำแบนทันที
		h.Pure.Post(context.Background(), "/api/internal/admin/users/update", map[string]any{"id": u.ID, "status": "suspended"}, nil)
		WriteJSON(w, http.StatusForbidden, map[string]string{"error": "ตรวจพบพฤติกรรมสแปม (Bot) บัญชีของคุณถูกระงับการใช้งานทันที"})
		return
	}

	q := getOrCreateQueue(concertID)
	ticket := atomic.AddInt64(&q.globalQueueTicket, 1)
	serving := atomic.LoadInt64(&q.currentServing)
	
	status := "waiting"
	if ticket <= serving {
		status = "ready"
	}

	WriteJSON(w, http.StatusOK, QueueJoinResp{
		Ticket: ticket, 
		Status: status,
	})
}

func (h *Handler) CheckQueueStatus(w http.ResponseWriter, r *http.Request) {
	concertID := chi.URLParam(r, "id")
	if concertID == "" {
		WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "Missing concert ID"})
		return
	}

	t := r.URL.Query().Get("ticket")
	myTicket, _ := strconv.ParseInt(t, 10, 64)
	
	q := getOrCreateQueue(concertID)
	serving := atomic.LoadInt64(&q.currentServing)

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