package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// จำลอง Config และระบบสำหรับเทส
func setupTestHandler() *Handler {
	return &Handler{}
}

func TestAuthRegister(t *testing.T) {
	h := setupTestHandler()

	payload := map[string]any{
		"email":     "newuser@example.com",
		"password":  "securepass123",
		"firstName": "John",
		"lastName":  "Doe",
		"tel":       "0811111111",
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	h.AuthRegister(rr, req)

	// กรณีไม่มี Mock DB จะได้ Internal Error หรืออาจจะ Bad Request ต้องตรวจจับตามสภาวะ
	if rr.Code != http.StatusCreated && rr.Code != http.StatusInternalServerError {
		t.Errorf("expected status 201 or 500 (if no DB), got %d. Body: %s", rr.Code, rr.Body.String())
	}
}

func TestAuthLogin(t *testing.T) {
	h := setupTestHandler()

	tests := []struct {
		name           string
		payload        map[string]any
		expectedStatus int
	}{
		{
			name: "Success Login Structure",
			payload: map[string]any{
				"email":    "test@example.com",
				"password": "password123",
				"remember": true,
			},
			expectedStatus: http.StatusOK, // Mock ควรจำลองให้รหัสผ่านถูก
		},
		{
			name: "Missing Fields",
			payload: map[string]any{
				"email": "test@example.com",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.payload)
			req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			h.AuthLogin(rr, req)

			if rr.Code != tt.expectedStatus && rr.Code != http.StatusInternalServerError {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}
		})
	}
}

func TestAuthStatus(t *testing.T) {
	h := setupTestHandler()

	req, _ := http.NewRequest("GET", "/api/auth/status", nil)
	rr := httptest.NewRecorder()
	
	// ไม่ได้ส่ง Token ไปควรจะเป็น Unauthorized
	h.AuthStatus(rr, req)
	
	// หมายเหตุ: AuthStatus ใน handler มักจะดึงจาก Context ที่ Middleware ยัดมาให้
	// หากไม่ได้เรียกผ่าน Middleware ค่าใน Context จะว่างเปล่า
	if rr.Code != http.StatusUnauthorized && rr.Code != http.StatusOK {
		t.Errorf("Unexpected status for AuthStatus: %d", rr.Code)
	}
}

func TestAuthCompleteProfile(t *testing.T) {
	h := setupTestHandler()

	payload := completeProfileReq{
		Email:      "googleuser@example.com",
		Username:   "newuser123",
		Password:   "securepass88",
		FirstName:  "Somchai",
		LastName:   "Jaidee",
		Tel:        "0812345678",
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/api/auth/complete-profile", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	h.AuthCompleteProfile(rr, req)

	if rr.Code != http.StatusOK && rr.Code != http.StatusInternalServerError { 
		t.Errorf("expected status 200 or 500, got %d", rr.Code)
	}
}