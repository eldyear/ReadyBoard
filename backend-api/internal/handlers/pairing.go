package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"
)

type GeneratePairingCodeRequest struct {
	Fingerprint string `json:"fingerprint"`
}

type GeneratePairingCodeResponse struct {
	PairingCode string `json:"pairing_code"`
	ExpiresIn   int    `json:"expires_in"` // seconds
}

type LinkTerminalRequest struct {
	PairingCode string `json:"pairing_code"`
	BoardID     string `json:"board_id"`
}

type LinkTerminalResponse struct {
	Success bool `json:"success"`
}

type UnpairTerminalRequest struct {
	BoardID string `json:"board_id"`
}

type PairingHandler struct {
	redisClient *redis.Client
}

func NewPairingHandler(rdb *redis.Client) *PairingHandler {
	return &PairingHandler{redisClient: rdb}
}

// GenerateCode creates a short 4-character alphanumeric code and stores it in Redis.
func (h *PairingHandler) GenerateCode(w http.ResponseWriter, r *http.Request) {
	var req GeneratePairingCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.Fingerprint == "" {
		http.Error(w, "Fingerprint is required", http.StatusBadRequest)
		return
	}

	code := generateCode(4)
	ctx := context.Background()

	// Store code -> fingerprint (optional, mostly just storing code for 10 min)
	key := fmt.Sprintf("pairing:%s", code)
	err := h.redisClient.Set(ctx, key, req.Fingerprint, 10*time.Minute).Err()
	if err != nil {
		http.Error(w, "Error generating pairing code", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(GeneratePairingCodeResponse{
		PairingCode: code,
		ExpiresIn:   600,
	})
}

// LinkTerminal accepts a typed pairing_code and associates it via Pub/Sub to the active WebSocket holding that code.
func (h *PairingHandler) LinkTerminal(w http.ResponseWriter, r *http.Request) {
	var req LinkTerminalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.PairingCode == "" || req.BoardID == "" {
		http.Error(w, "pairing_code and board_id required", http.StatusBadRequest)
		return
	}

	ctx := context.Background()
	key := fmt.Sprintf("pairing:%s", req.PairingCode)

	// Check if the code exists
	res, err := h.redisClient.Get(ctx, key).Result()
	if err == redis.Nil {
		http.Error(w, "Invalid or expired pairing code", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Code is valid. Delete it so it can't be used again.
	h.redisClient.Del(ctx, key)

	// Publish to Redis so backend-ws can pick it up and emit over the correct socket
	pubSubPayload := map[string]interface{}{
		"type":         "TERMINAL_LINKED",
		"pairing_code": req.PairingCode,
		"board_id":     req.BoardID,
		"fingerprint":  res, // The device that originally requested it
	}

	payloadBytes, _ := json.Marshal(pubSubPayload)
	err = h.redisClient.Publish(ctx, "pairing_events", payloadBytes).Err()

	if err != nil {
		http.Error(w, "Failed to publish link event", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(LinkTerminalResponse{Success: true})
}

// UnpairTerminal forces a specific terminal showing a board to disconnect via WebSocket PubSub
func (h *PairingHandler) UnpairTerminal(w http.ResponseWriter, r *http.Request) {
	var req UnpairTerminalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.BoardID == "" {
		http.Error(w, "board_id required", http.StatusBadRequest)
		return
	}

	ctx := context.Background()

	// Publish an unpair event to the specific board's channel.
	pubSubPayload := map[string]interface{}{
		"type":     "TERMINAL_UNPAIR",
		"board_id": req.BoardID,
	}

	payloadBytes, _ := json.Marshal(pubSubPayload)

	// In the real system backend-ws routes messages via board:<id>
	channel := fmt.Sprintf("board:%s", req.BoardID)
	err := h.redisClient.Publish(ctx, channel, payloadBytes).Err()

	if err != nil {
		http.Error(w, "Failed to publish unpair event", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// Helper to generate a random uppercase alphanumeric string
func generateCode(length int) string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	rand.Seed(time.Now().UnixNano())
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}
