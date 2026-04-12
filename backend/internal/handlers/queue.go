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

// LocalSuspendedUsers In-Memory Cache
var LocalSuspendedUsers sync.Map

// userQueueRequests เช็คว่า User ขอคิวรัวเกินไปหรือไม่
var userQueueRequests sync.Map 

type ConcertQueue struct {
	globalQueueTicket int64
	currentServing    int64
}

var (
	queues      = make(map[string]*ConcertQueue)
	queuesMutex sync.RWMutex
)

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
		currentServing:    100,
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

	// 1. ดึง Token ด้วยตัวเอง
	token := extractTokenFromReq(r)
	var userIDStr string

	if token != "" {
		claims, err := h.parseToken(token)
		if err != nil {
			// 🚨 [เพิ่มโค้ดบรรทัดนี้] ถ้ามี Token ส่งมาแต่มันผิด (ปลอม/Secretไม่ตรง) ดีดออกเลย!
			fmt.Println("🚨 [Backend Log] Token Error:", err)
			WriteJSON(w, http.StatusUnauthorized, map[string]string{"error": "Invalid Token. ตรวจสอบ JWT_SECRET ด่วน!"})
			return
		}
		
		if claims.UserID != 0 {
			userIDStr = fmt.Sprint(claims.UserID)
		} else {
			// เผื่อตั้งชื่อตัวแปร userId ตอนจำลองใน Node.js ไม่ตรงกับฝั่ง Go
			userIDStr = "test_user_id_fallback"
		}
	}

	// 2. ตรวจจับการเข้าคิวรัวๆ (ทำงานต่อเมื่อมี userIDStr)
	if userIDStr != "" {
		// เช็คสถานะแบน
		if _, suspended := LocalSuspendedUsers.Load(userIDStr); suspended {
			WriteJSON(w, http.StatusForbidden, map[string]string{"error": "บัญชีของคุณถูกระงับการใช้งาน"})
			return
		}

		// ดักจับ Bot ถ้ายิงขอคิวรัวๆ (จำกัด 15 ครั้ง)
		requestKey := fmt.Sprintf("%s_%s", userIDStr, concertID)
		val, _ := userQueueRequests.LoadOrStore(requestKey, new(int32))
		reqCount := atomic.AddInt32(val.(*int32), 1)

		if reqCount > 15 {
			// แบนลงใน Cache ทันที
			LocalSuspendedUsers.Store(userIDStr, true) 
			
			if h.Pure != nil {
				userIDInt, _ := strconv.ParseInt(userIDStr, 10, 64)
				// ใช้ Go Routine ยิง API ไปแบนถาวร จะได้ไม่หน่วง Request
				go h.Pure.Post(context.Background(), "/api/internal/admin/users/update", map[string]any{"id": userIDInt, "status": "suspended"}, nil)
			}

			WriteJSON(w, http.StatusForbidden, map[string]string{"error": "ตรวจพบพฤติกรรมสแปม บัญชีถูกระงับการใช้งาน"})
			return
		}
	}

	// 3. ออกบัตรคิวตามปกติ... (โค้ดล่างลงมาเหมือนเดิม)
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