// backend/internal/handlers/admin.go
package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"backend/internal/pureapi"
)

// ---------- Admin: Users ----------

// GET /api/admin/users
func (h *Handler) AdminUsersList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var users any
	if err := h.Pure.Get(ctx, "/api/internal/admin/users", &users); err != nil {
		h.writeErrFrom(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, users)
}

// PUT /api/admin/users/{id}
func (h *Handler) AdminUsersUpdateByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || id <= 0 {
		h.writeError(w, http.StatusBadRequest, "Invalid user id")
		return
	}

	var body map[string]any
	if err := ReadJSON(r, &body); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	// pure-api internal endpoint: POST /api/internal/admin/users/update
	payload := map[string]any{"id": id}
	for k, v := range body {
		payload[k] = v
	}

	var updated any
	if err := h.Pure.Post(ctx, "/api/internal/admin/users/update", payload, &updated); err != nil {
		if isUsernameUniqueViolation(err) {
			h.writeError(w, http.StatusConflict, "Username already taken")
			return
		}
		h.writeErrFrom(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, updated)
}

// POST /api/admin/users/update (legacy path kept for compatibility)
func (h *Handler) AdminUsersUpdate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var payload map[string]any
	if err := ReadJSON(r, &payload); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	var updated any
	if err := h.Pure.Post(ctx, "/api/internal/admin/users/update", payload, &updated); err != nil {
		if isUsernameUniqueViolation(err) {
			h.writeError(w, http.StatusConflict, "Username already taken")
			return
		}
		h.writeErrFrom(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, updated)
}

// ---------- Admin: Carousel ----------

// GET /api/admin/carousel
func (h *Handler) AdminCarouselList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var items any
	if err := h.Pure.Get(ctx, "/api/internal/carousel/list", &items); err != nil {
		h.writeErrFrom(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, items)
}

// POST /api/admin/carousel (multipart: image + fields)
func (h *Handler) AdminCarouselCreate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// 4MB limit (match Node)
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024*1024)
	if err := r.ParseMultipartForm(4 * 1024 * 1024); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid form")
		return
	}

	dataURL, err := readImageDataURL(r, "image", 4*1024*1024)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	payload := map[string]any{
		"title":        strings.TrimSpace(r.FormValue("title")),
		"subtitle":     strings.TrimSpace(r.FormValue("subtitle")),
		"description":  strings.TrimSpace(r.FormValue("description")),
		"link":         strings.TrimSpace(r.FormValue("link")),
		"imageDataUrl": dataURL,
	}

	// itemIndex is optional
	if v := strings.TrimSpace(r.FormValue("itemIndex")); v != "" {
		if n, e := strconv.Atoi(v); e == nil {
			payload["itemIndex"] = n
		}
	} else if v := strings.TrimSpace(r.FormValue("item_index")); v != "" {
		if n, e := strconv.Atoi(v); e == nil {
			payload["item_index"] = n
		}
	}

	var created any
	if err := h.Pure.Post(ctx, "/api/internal/carousel/create", payload, &created); err != nil {
		h.writeErrFrom(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, created)
}

// PUT /api/admin/carousel/{id} (multipart, image optional)
func (h *Handler) AdminCarouselUpdate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || id <= 0 {
		h.writeError(w, http.StatusBadRequest, "Invalid carousel id")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 4*1024*1024)
	if err := r.ParseMultipartForm(4 * 1024 * 1024); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid form")
		return
	}

	payload := map[string]any{
		"id":          id,
		"title":       strings.TrimSpace(r.FormValue("title")),
		"subtitle":    strings.TrimSpace(r.FormValue("subtitle")),
		"description": strings.TrimSpace(r.FormValue("description")),
		"link":        strings.TrimSpace(r.FormValue("link")),
	}

	// itemIndex optional
	if v := strings.TrimSpace(r.FormValue("itemIndex")); v != "" {
		if n, e := strconv.Atoi(v); e == nil {
			payload["itemIndex"] = n
		}
	} else if v := strings.TrimSpace(r.FormValue("item_index")); v != "" {
		if n, e := strconv.Atoi(v); e == nil {
			payload["item_index"] = n
		}
	}

	// image optional
	if dataURL, e := tryReadImageDataURL(r, "image", 4*1024*1024); e != nil {
		h.writeError(w, http.StatusBadRequest, e.Error())
		return
	} else if dataURL != "" {
		payload["imageDataUrl"] = dataURL
	}

	var updated any
	if err := h.Pure.Post(ctx, "/api/internal/carousel/update", payload, &updated); err != nil {
		h.writeErrFrom(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, updated)
}

// DELETE /api/admin/carousel/{id}
func (h *Handler) AdminCarouselDelete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || id <= 0 {
		h.writeError(w, http.StatusBadRequest, "Invalid carousel id")
		return
	}

	payload := map[string]any{"id": id}
	if err := h.Pure.Post(ctx, "/api/internal/carousel/delete", payload, nil); err != nil {
		h.writeErrFrom(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---------- Admin: Wallet (NEW) ----------
// POST /api/admin/users/{id}/wallet
func (h *Handler) AdminUpdateWallet(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := chi.URLParam(r, "id")
	
	var req struct {
		Balance float64 `json:"balance"`
	}
	if err := ReadJSON(r, &req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	_, err := h.ConcertDB.ExecContext(ctx, `
		INSERT INTO user_wallets (user_id, balance) VALUES ($1, $2)
		ON CONFLICT (user_id) DO UPDATE SET balance = $2
	`, userID, req.Balance)
	
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Failed to update wallet")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Wallet updated successfully"})
}

// ---------- Admin: Scan Ticket (NEW) ----------
// POST /api/admin/bookings/scan
func (h *Handler) AdminScanTicket(w http.ResponseWriter, r *http.Request) {
	var req map[string]string
	if err := ReadJSON(r, &req); err != nil {
		h.writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	token := req["token"]

	// ถอดรหัส Token
	decoded, err := base64.StdEncoding.DecodeString(token)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "QR Code ไม่ถูกต้อง (Invalid Format)")
		return
	}

	parts := strings.Split(string(decoded), "|")
	if len(parts) != 2 {
		h.writeError(w, http.StatusBadRequest, "QR Code ข้อมูลไม่ครบถ้วน")
		return
	}

	bookingID := parts[0]
	sig := parts[1]

	// ตรวจสอบลายเซ็น (Signature) ว่าไม่ได้ถูกปลอมแปลง
	secret := "concerttick_super_secret" // ต้องตรงกับฝั่ง Generate
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(bookingID))
	expectedSig := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(sig), []byte(expectedSig)) {
		h.writeError(w, http.StatusForbidden, "QR Code ปลอมแปลง! ไม่อนุญาตให้เข้างาน")
		return
	}

	ctx := r.Context()
	var currentStatus string
	err = h.ConcertDB.QueryRowContext(ctx, "SELECT status FROM bookings WHERE id = $1", bookingID).Scan(&currentStatus)
	if err != nil {
		h.writeError(w, http.StatusNotFound, "ไม่พบข้อมูลการจองในระบบ")
		return
	}

	switch currentStatus {
	case "used":
		h.writeError(w, http.StatusConflict, "บัตรใบนี้ถูกใช้งานแสกนเข้างานไปแล้ว!")
		return
	case "cancelled":
		h.writeError(w, http.StatusConflict, "บัตรใบนี้ถูกยกเลิกไปแล้ว!")
		return
	}

	// อัปเดตเป็น Used ป้องกันการแสกนซ้ำ
	_, err = h.ConcertDB.ExecContext(ctx, "UPDATE bookings SET status = 'used' WHERE id = $1", bookingID)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "Database Error")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{
		"message": fmt.Sprintf("ตรวจสอบบัตรสำเร็จ (ID: %s) อนุญาตให้เข้างาน", bookingID),
	})
}

// ---------- helpers ----------

func isUsernameUniqueViolation(err error) bool {
	var pe *pureapi.Error
	if !errors.As(err, &pe) {
		return false
	}
	m, ok := pe.Detail.(map[string]any)
	if !ok {
		return false
	}
	eo, ok := m["error"].(map[string]any)
	if !ok {
		return false
	}
	d, _ := eo["details"].(string)
	d = strings.ToLower(d)
	return strings.Contains(d, "duplicate key") && strings.Contains(d, "users_username_key")
}

func readImageDataURL(r *http.Request, field string, maxBytes int64) (string, error) {
	f, hdr, err := r.FormFile(field)
	if err != nil {
		return "", fmt.Errorf("No image")
	}
	defer f.Close()

	mime := hdr.Header.Get("Content-Type")
	if mime == "" {
		mime = hdr.Header.Get("content-type")
	}
	mime = strings.ToLower(strings.TrimSpace(mime))
	if !strings.HasPrefix(mime, "image/") {
		return "", fmt.Errorf("Unsupported file type")
	}
	if !allowedImageMime(mime) {
		return "", fmt.Errorf("Unsupported file type")
	}

	b, err := io.ReadAll(f)
	if err != nil {
		return "", fmt.Errorf("Read failed")
	}
	if int64(len(b)) > maxBytes {
		return "", fmt.Errorf("File too large")
	}
	enc := base64.StdEncoding.EncodeToString(b)
	return fmt.Sprintf("data:%s;base64,%s", mime, enc), nil
}

func tryReadImageDataURL(r *http.Request, field string, maxBytes int64) (string, error) {
	f, hdr, err := r.FormFile(field)
	if err != nil {
		return "", nil
	}
	defer f.Close()

	mime := hdr.Header.Get("Content-Type")
	if mime == "" {
		mime = hdr.Header.Get("content-type")
	}
	mime = strings.ToLower(strings.TrimSpace(mime))
	if !strings.HasPrefix(mime, "image/") {
		return "", fmt.Errorf("Unsupported file type")
	}
	if !allowedImageMime(mime) {
		return "", fmt.Errorf("Unsupported file type")
	}

	b, err := io.ReadAll(f)
	if err != nil {
		return "", fmt.Errorf("Read failed")
	}
	if int64(len(b)) > maxBytes {
		return "", fmt.Errorf("File too large")
	}
	enc := base64.StdEncoding.EncodeToString(b)
	return fmt.Sprintf("data:%s;base64,%s", mime, enc), nil
}

func allowedImageMime(m string) bool {
	switch m {
	case "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp":
		return true
	default:
		return false
	}
}