package handlers

import (
	"net/http"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/go-chi/chi/v5"
)

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
	// เช็คอีกรอบเผื่อมี goroutine อื่นสร้างไปแล้วระหว่างรอ Lock
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
			
			// ดึงคิวทั้งหมดที่มีการ active อยู่ เพื่อมาอัปเดตคนเข้า
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