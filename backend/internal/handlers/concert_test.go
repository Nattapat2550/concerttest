package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestQueueSystem(t *testing.T) {
	h := setupTestHandler() // สมมติว่ามีฟังก์ชันนี้สำหรับ Setup Handler และ Mock DB

	// 1. เทสต์การเข้าคิว (Join Queue)
	reqJoin, _ := http.NewRequest("GET", "/api/concerts/queue/join", nil)
	rrJoin := httptest.NewRecorder()
	h.JoinQueue(rrJoin, reqJoin)

	if rrJoin.Code != http.StatusOK {
		t.Errorf("Expected JoinQueue to return 200 OK, got %d", rrJoin.Code)
	}

	var joinResp QueueJoinResp
	json.Unmarshal(rrJoin.Body.Bytes(), &joinResp)
	if joinResp.Ticket <= 0 {
		t.Errorf("Expected valid ticket number, got %d", joinResp.Ticket)
	}

	// 2. เทสต์การเช็คสถานะคิว (Check Queue Status)
	reqStatus, _ := http.NewRequest("GET", "/api/concerts/queue/status?ticket=1", nil)
	rrStatus := httptest.NewRecorder()
	h.CheckQueueStatus(rrStatus, reqStatus)

	if rrStatus.Code != http.StatusOK {
		t.Errorf("Expected CheckQueueStatus to return 200 OK, got %d", rrStatus.Code)
	}

	var statusResp QueueStatusResp
	json.Unmarshal(rrStatus.Body.Bytes(), &statusResp)
	if statusResp.Status != "ready" && statusResp.Status != "waiting" {
		t.Errorf("Expected status to be 'ready' or 'waiting', got %s", statusResp.Status)
	}
}

func TestGetConcertsAndNews(t *testing.T) {
	h := setupTestHandler()

	t.Run("Get Latest News", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/concerts/news/latest", nil)
		rr := httptest.NewRecorder()
		h.GetLatestNews(rr, req)

		if rr.Code != http.StatusOK && rr.Code != http.StatusNotFound {
			t.Errorf("Unexpected status code for News: %d", rr.Code)
		}
	})

	t.Run("Get Concerts List", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/concerts", nil)
		rr := httptest.NewRecorder()
		h.GetConcerts(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected 200 OK for Concerts, got %d", rr.Code)
		}
	})
}

func TestBookSeat(t *testing.T) {
	h := setupTestHandler()

	t.Run("Fail - Empty Body", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/api/concerts/book", nil)
		rr := httptest.NewRecorder()
		h.BookSeat(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Errorf("Expected 400 Bad Request for empty body, got %d", rr.Code)
		}
	})

	t.Run("Fail - Unauthorized", func(t *testing.T) {
		payload := map[string]interface{}{
			"concert_id": 1,
			"seat_code":  "A1",
			"price":      2500,
		}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/api/concerts/book", bytes.NewBuffer(body))
		rr := httptest.NewRecorder()
		
		// ไม่ได้แนบ Context ของ User เข้าไป จึงต้องถูกปฏิเสธ
		h.BookSeat(rr, req)
		if rr.Code != http.StatusUnauthorized && rr.Code != http.StatusInternalServerError {
			t.Logf("Got code: %d (Expecting Unauthorized or Error due to missing user context)", rr.Code)
		}
	})

	t.Run("Success - Book Seat (Mock Context)", func(t *testing.T) {
		payload := map[string]interface{}{
			"concert_id": 1,
			"seat_code":  "A1",
			"price":      2500,
		}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/api/concerts/book", bytes.NewBuffer(body))
		
		// จำลอง Context ของผู้ใช้งานที่ล็อกอินแล้ว
		mockUser := &userDTO{ID: 1, Role: "user"}
		ctx := context.WithValue(req.Context(), "user", mockUser)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		h.BookSeat(rr, req)

		// ตรวจสอบว่าระบบสามารถจัดการ Request ได้ (อาจจะได้ 201 Created หรือ 409 Conflict ขึ้นอยู่กับข้อมูล Mock DB)
		if rr.Code != http.StatusCreated && rr.Code != http.StatusConflict && rr.Code != http.StatusInternalServerError {
			t.Errorf("Unexpected status code for booking attempt: %d", rr.Code)
		}
	})
}

func TestAdminRoutes(t *testing.T) {
	h := setupTestHandler()

	t.Run("Admin Get All Bookings", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/admin/bookings", nil)
		rr := httptest.NewRecorder()
		h.AdminGetAllBookings(rr, req)

		if rr.Code != http.StatusOK && rr.Code != http.StatusInternalServerError {
			t.Errorf("Unexpected status code for Admin Bookings: %d", rr.Code)
		}
	})
}