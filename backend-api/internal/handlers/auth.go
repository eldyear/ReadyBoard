package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/readyboard/backend-api/internal/middleware"
	"github.com/readyboard/backend-api/internal/models"
	"github.com/readyboard/backend-api/internal/repository"
)

// AuthHandler handles authentication endpoints.
type AuthHandler struct {
	users            *repository.UserRepository
	jwtSecret        string
	jwtRefreshSecret string
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(users *repository.UserRepository, jwtSecret, jwtRefreshSecret string) *AuthHandler {
	return &AuthHandler{users: users, jwtSecret: jwtSecret, jwtRefreshSecret: jwtRefreshSecret}
}

// Register handles POST /api/auth/register
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Email == "" || len(req.Password) < 8 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "email and password (min 8 chars) are required"})
		return
	}

	user, err := h.users.Create(r.Context(), &req)
	if err != nil {
		if strings.Contains(err.Error(), "unique") {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "email already registered"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not create user"})
		return
	}

	tokens, err := middleware.GenerateTokenPair(user, h.jwtSecret, h.jwtRefreshSecret, "")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not generate tokens"})
		return
	}

	writeJSON(w, http.StatusCreated, &models.AuthResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		User:         user,
	})
}

// Login handles POST /api/auth/login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	user, err := h.users.FindByEmail(r.Context(), strings.ToLower(req.Email))
	if err != nil || !h.users.VerifyPassword(user.PasswordHash, req.Password) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
		return
	}

	tokens, err := middleware.GenerateTokenPair(user, h.jwtSecret, h.jwtRefreshSecret, "")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not generate tokens"})
		return
	}

	writeJSON(w, http.StatusOK, &models.AuthResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		User:         user,
	})
}

// Me handles GET /api/auth/me – always returns fresh data from the DB.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	user, err := h.users.FindByID(r.Context(), claims.UserID)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "user not found"})
		return
	}
	writeJSON(w, http.StatusOK, user)
}

// GenerateAPIKey handles POST /api/auth/api-key
func (h *AuthHandler) GenerateAPIKey(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil || claims.UserID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	apiKey, err := h.users.GenerateAPIKey(r.Context(), claims.UserID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not generate api key"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"api_key": apiKey})
}

// RevokeAPIKey handles DELETE /api/auth/api-key
func (h *AuthHandler) RevokeAPIKey(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil || claims.UserID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	if err := h.users.RevokeAPIKey(r.Context(), claims.UserID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not revoke api key"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// writeJSON is a reusable JSON response helper.
func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
