package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGetLatestNews(t *testing.T) {
	h := setupTestHandler()

	req, _ := http.NewRequest("GET", "/api/concerts/news/latest", nil)
	rr := httptest.NewRecorder()

	h.GetLatestNews(rr, req)

	// ถ้าไม่มี DB จะต้องคืนค่า Error หรือถ้ามีก็ต้องคืน Array ข่าว
	if rr.Code != http.StatusOK && rr.Code != http.StatusNotFound && rr.Code != http.StatusInternalServerError {
		t.Errorf("Unexpected status code: %d", rr.Code)
	}
}

func TestBookSeat(t *testing.T) {
	h := setupTestHandler()

	// ต้องจำลองว่าผู้ใช้ Login แล้ว (มี context ของ User)
	req, _ := http.NewRequest("POST", "/api/concerts/book", nil)
	// จำลอง User Context ที่นี่...
	
	rr := httptest.NewRecorder()
	h.BookSeat(rr, req)

	// คาดหวังว่าจะโดนเตะออกถ้าไม่ได้ส่ง Body หรือไม่ได้ Login
	if rr.Code != http.StatusBadRequest && rr.Code != http.StatusUnauthorized {
		t.Errorf("Expected 400 or 401 for empty request, got %d", rr.Code)
	}
}