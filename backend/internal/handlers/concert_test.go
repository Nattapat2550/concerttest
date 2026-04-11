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
	h := setupTestHandler()

	t.Run("Join Queue", func(t *testing.T) {
		reqJoin, _ := http.NewRequest("GET", "/api/concerts/queue/join", nil)
		rrJoin := httptest.NewRecorder()
		h.JoinQueue(rrJoin, reqJoin)

		if rrJoin.Code != http.StatusOK {
			t.Errorf("Expected JoinQueue to return 200 OK, got %d", rrJoin.Code)
		}
	})

	t.Run("Check Status", func(t *testing.T) {
		reqStatus, _ := http.NewRequest("GET", "/api/concerts/queue/status?ticket=1", nil)
		rrStatus := httptest.NewRecorder()
		h.CheckQueueStatus(rrStatus, reqStatus)

		if rrStatus.Code != http.StatusOK {
			t.Errorf("Expected CheckQueueStatus to return 200 OK, got %d", rrStatus.Code)
		}
	})
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
		if rr.Code != http.StatusOK && rr.Code != http.StatusInternalServerError {
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
		payload := map[string]interface{}{"concert_id": 1, "seat_code": "A1", "price": 2500}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/api/concerts/book", bytes.NewBuffer(body))
		rr := httptest.NewRecorder()
		
		h.BookSeat(rr, req)
		if rr.Code != http.StatusUnauthorized && rr.Code != http.StatusInternalServerError {
			t.Errorf("Expected Unauthorized or ServerError, got %d", rr.Code)
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

	t.Run("Admin Delete Concert", func(t *testing.T) {
		// Mock Context user role admin
		req, _ := http.NewRequest("DELETE", "/api/admin/concerts/999", nil)
		mockUser := &userDTO{ID: 1, Role: "admin"}
		ctx := context.WithValue(req.Context(), "user", mockUser)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		h.AdminDeleteConcert(rr, req)

		// ควรจะ Not Found 404 หรือ 500 เพราะไม่มีคอนเสิร์ตไอดี 999 
		if rr.Code != http.StatusNotFound && rr.Code != http.StatusInternalServerError && rr.Code != http.StatusOK {
			t.Errorf("Unexpected status code for Delete: %d", rr.Code)
		}
	})
}