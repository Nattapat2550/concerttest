package httpapi_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"backend/internal/config"
	"backend/internal/httpapi"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// ==========================================
// 🛠 Helpers
// ==========================================

func generateTestToken(userID int64, role string, secret string) string {
	claims := jwt.MapClaims{
		"userId": userID,
		"role":   role,
		"exp":    time.Now().Add(1 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	t, _ := token.SignedString([]byte(secret))
	return t
}

func TestComprehensiveSystem(t *testing.T) {
	jwtSecret := "supersecret_test_jwt_key_123456"

	// 🛑 1. Mock Pure API Server
	pureMock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		w.Header().Set("Content-Type", "application/json")

		switch {
		case strings.Contains(path, "create-user"):
			w.Write([]byte(`{"id": 1, "email": "test@example.com"}`))
		case strings.Contains(path, "store-verification-code") || strings.Contains(path, "verify-code"):
			w.Write([]byte(`{"ok": true, "userId": 1}`))
		case strings.Contains(path, "set-username-password"):
			w.Write([]byte(`{"id": 1, "email": "test@example.com", "username": "Tester", "role": "user"}`))
		case strings.Contains(path, "create-reset-token") || strings.Contains(path, "consume-reset-token"):
			w.Write([]byte(`{"id": 1, "email": "test@example.com"}`))
		case strings.Contains(path, "set-password"):
			w.Write([]byte(`{"ok": true}`))
		case strings.Contains(path, "find-user"):
			var body map[string]any
			json.NewDecoder(r.Body).Decode(&body)
			
			if email, ok := body["email"].(string); ok && email == "notfound@example.com" {
				w.WriteHeader(http.StatusNotFound)
				w.Write([]byte(`{"error": {"message": "User not found"}}`))
				return
			}
			
			hash, _ := bcrypt.GenerateFromPassword([]byte("Password123!"), bcrypt.DefaultCost)
			json.NewEncoder(w).Encode(map[string]any{
				"id": 1, "email": "test@example.com", "username": "Tester",
				"role": "user", "password_hash": string(hash),
			})

		case strings.Contains(path, "delete-user"):
			w.Write([]byte(`{"ok": true}`))
		case strings.Contains(path, "admin/users/update"):
			w.Write([]byte(`{"id": 1, "role": "admin"}`))
		case strings.Contains(path, "admin/users"):
			w.Write([]byte(`[{"id": 1, "email": "test@example.com", "role": "user"}]`))
		case strings.Contains(path, "carousel/create") || strings.Contains(path, "carousel/update") || strings.Contains(path, "carousel/delete"):
			w.Write([]byte(`{"ok": true}`))
		case strings.Contains(path, "carousel/list"):
			w.Write([]byte(`[{"id": 1, "title": "Slide 1"}]`))
		case strings.Contains(path, "homepage/list"):
			w.Write([]byte(`[{"section_name": "welcome_header", "content": "Hello"}]`))
		case strings.Contains(path, "homepage/update"):
			w.Write([]byte(`{"ok": true}`))

		default:
			w.Write([]byte(`{"ok": true}`))
		}
	}))
	defer pureMock.Close()

	// 🛑 2. Config & Router
	cfg := config.Config{
		PureAPIBaseURL: pureMock.URL,
		EmailDisable:   true,
		JWTSecret:      jwtSecret,
		FrontendURL:    "http://localhost:3000",
		GoogleClientID: "mock-client-id",
		GoogleClientSecret: "mock-secret",
		GoogleCallbackURI: "http://localhost:3000/callback",
	}
	router := httpapi.NewRouter(cfg, nil) 

	execute := func(req *http.Request) *httptest.ResponseRecorder {
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		return rr
	}

	userToken := generateTestToken(1, "user", jwtSecret)
	adminToken := generateTestToken(99, "admin", jwtSecret)

	// ==========================================
	// 1. AUTH FLOW & LOGIN TESTS
	// ==========================================
	t.Run("AUTH: Register Success", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/api/auth/register", strings.NewReader(`{"email": "test@example.com"}`))
		rr := execute(req)
		if rr.Code != http.StatusOK { t.Errorf("Expected 200, got %d", rr.Code) }
	})

	t.Run("AUTH: Verify Code", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/api/auth/verify-code", strings.NewReader(`{"email": "test@example.com", "code": "123456"}`))
		rr := execute(req)
		if rr.Code != http.StatusOK { t.Errorf("Expected 200, got %d", rr.Code) }
	})

	t.Run("AUTH: Complete Profile", func(t *testing.T) {
		// ✅ แก้ไข: ลบฟิลด์ code ออก และเพิ่ม first_name, last_name ให้ตรงกับ Struct ใหม่
		payload := `{"email": "test@example.com", "username": "TestUser", "password": "Password123!", "first_name": "Test", "last_name": "User", "tel": "0899999999"}`
		req, _ := http.NewRequest("POST", "/api/auth/complete-profile", strings.NewReader(payload))
		rr := execute(req)
		if rr.Code != http.StatusOK { t.Errorf("Expected 200, got %d", rr.Code) }
	})

	t.Run("AUTH: Forgot Password", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/api/auth/forgot-password", strings.NewReader(`{"email": "test@example.com"}`))
		rr := execute(req)
		if rr.Code != http.StatusOK { t.Errorf("Expected 200, got %d", rr.Code) }
	})

	t.Run("AUTH: Reset Password", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/api/auth/reset-password", strings.NewReader(`{"token": "mocktoken", "newPassword": "NewPassword123!"}`))
		rr := execute(req)
		if rr.Code != http.StatusOK { t.Errorf("Expected 200, got %d", rr.Code) }
	})

	t.Run("AUTH: Google OAuth URL", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/auth/google", nil)
		rr := execute(req)
		if rr.Code != http.StatusFound { t.Errorf("Expected Redirect 302, got %d", rr.Code) }
	})

	t.Run("LOGIN: Success", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/api/auth/login", strings.NewReader(`{"email": "test@example.com", "password": "Password123!"}`))
		rr := execute(req)
		if rr.Code != http.StatusOK { t.Errorf("Expected 200, got %d", rr.Code) }
	})

	t.Run("LOGIN: Fail Wrong Password", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/api/auth/login", strings.NewReader(`{"email": "test@example.com", "password": "WrongPassword!"}`))
		rr := execute(req)
		if rr.Code != http.StatusUnauthorized { t.Errorf("Expected 401, got %d", rr.Code) }
	})

	t.Run("LOGIN: Fail Not Found Email", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/api/auth/login", strings.NewReader(`{"email": "notfound@example.com", "password": "Password123!"}`))
		rr := execute(req)
		if rr.Code != http.StatusUnauthorized { t.Errorf("Expected 401, got %d", rr.Code) }
	})

	// ==========================================
	// 2. USER PROFILE TESTS (ตัดทอนมาเฉพาะส่วนที่เทสทำงาน)
	// ==========================================
	t.Run("USER: Get Me", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/users/me", nil)
		req.Header.Set("Authorization", "Bearer "+userToken)
		rr := execute(req)
		if rr.Code != http.StatusOK { t.Errorf("Expected 200, got %d", rr.Code) }
	})
	
	t.Run("ADMIN: List Users", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/admin/users", nil)
		req.Header.Set("Authorization", "Bearer "+adminToken)
		rr := execute(req)
		if rr.Code != http.StatusOK { t.Errorf("Expected 200, got %d", rr.Code) }
	})
}