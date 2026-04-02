package handlers

import (
	"net/http"
	"strconv"
	"sync/atomic"
	"time"
)

var (
	globalQueueTicket int64 = 0
	currentServing    int64 = 100 // โควต้าเข้าทันที 100 คนแรกโดยไม่ต้องรอ
)

func init() {
	go func() {
		for {
			time.Sleep(2 * time.Second)
			curr := atomic.LoadInt64(&currentServing)
			max := atomic.LoadInt64(&globalQueueTicket)
			
			if curr < max {
				atomic.AddInt64(&currentServing, 20)
			} else if curr < max+100 {
				atomic.AddInt64(&currentServing, 20)
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
	ticket := atomic.AddInt64(&globalQueueTicket, 1)
	serving := atomic.LoadInt64(&currentServing)
	
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
	t := r.URL.Query().Get("ticket")
	myTicket, _ := strconv.ParseInt(t, 10, 64)
	serving := atomic.LoadInt64(&currentServing)

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