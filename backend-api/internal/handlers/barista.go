package handlers

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"time"

	"github.com/readyboard/backend-api/internal/middleware"
	"github.com/readyboard/backend-api/internal/models"
	"github.com/readyboard/backend-api/internal/repository"
)

type BaristaHandler struct {
	baristaRepo  *repository.BaristaRepository
	userRepo     *repository.UserRepository
	boardRepo    *repository.BoardRepository
	jwtSecret    string
	refreshSecret string
}

func NewBaristaHandler(br *repository.BaristaRepository, ur *repository.UserRepository, bor *repository.BoardRepository, js, rs string) *BaristaHandler {
	return &BaristaHandler{
		baristaRepo:   br,
		userRepo:      ur,
		boardRepo:     bor,
		jwtSecret:     js,
		refreshSecret: rs,
	}
}

// GenerateCode handles POST /api/pairing/barista/generate
func (h *BaristaHandler) GenerateCode(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	code := generateNumericCode(6)
	expiresAt := time.Now().Add(1 * time.Hour)

	if err := h.baristaRepo.CreatePairing(r.Context(), claims.UserID, code, expiresAt); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not generate code"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"code": code, "expires_at": expiresAt.Format(time.RFC3339)})
}

// VerifyCode handles POST /api/pairing/barista/verify
func (h *BaristaHandler) VerifyCode(w http.ResponseWriter, r *http.Request) {
	var req models.VerifyBaristaPairingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.Code == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "code is required"})
		return
	}

	userID, err := h.baristaRepo.VerifyPairing(r.Context(), req.Code)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid or expired pairing code"})
		return
	}

	user, err := h.userRepo.FindByID(r.Context(), userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not fetch user details"})
		return
	}

	// Generate a restricted JWT (account-level, no specific board)
	tokens, err := middleware.GenerateTokenPair(user, h.jwtSecret, h.refreshSecret, "")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not generate barista token"})
		return
	}

	// Mark code as used
	_ = h.baristaRepo.DeactivatePairing(r.Context(), req.Code)

	writeJSON(w, http.StatusOK, models.BaristaAuthResponse{
		AccessToken: tokens.AccessToken,
		UserID:      userID,
	})
}

func generateNumericCode(length int) string {
	const charset = "0123456789"
	b := make([]byte, length)
	seed := rand.New(rand.NewSource(time.Now().UnixNano()))
	for i := range b {
		b[i] = charset[seed.Intn(len(charset))]
	}
	return string(b)
}
