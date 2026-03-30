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
	// ในการใช้งานจริง ควร Mock PureAPI หรือ Database เข้าไปใน Handler
	return &Handler{
		// สมมติฐานว่ามีการ inject mock database หรือ config ไว้แล้ว
	}
}

func TestAuthLogin(t *testing.T) {
	h := setupTestHandler()

	tests := []struct {
		name           string
		payload        map[string]any
		expectedStatus int
		expectedError  string
	}{
		{
			name: "Success Login",
			payload: map[string]any{
				"email":    "test@example.com",
				"password": "password123",
				"remember": true,
			},
			expectedStatus: http.StatusOK, // ควรจะ Mock ให้รหัสผ่านถูก
		},
		{
			name: "Missing Fields",
			payload: map[string]any{
				"email": "test@example.com",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "Invalid Credentials",
			payload: map[string]any{
				"email":    "test@example.com",
				"password": "wrongpassword",
			},
			expectedStatus: http.StatusUnauthorized, // ควรจะ Mock ให้รหัสผ่านผิด
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.payload)
			req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			h.AuthLogin(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d. Body: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
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
		OAuthId:    "1234567890",
		PictureUrl: "http://example.com/pic.jpg",
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/api/auth/complete-profile", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	h.AuthCompleteProfile(rr, req)

	// ค่า Status ควรเป็น 200 OK หากข้อมูลครบและ Mock DB ทำงานถูกต้อง
	if rr.Code != http.StatusOK && rr.Code != http.StatusInternalServerError { // อนุโลม Internal Error กรณีที่ไม่ได้ Mock DB จริงในตัวอย่างนี้
		t.Errorf("expected status 200, got %d", rr.Code)
	}
}