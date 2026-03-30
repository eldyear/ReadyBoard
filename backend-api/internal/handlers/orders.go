package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/gorilla/mux"

	"github.com/readyboard/backend-api/internal/middleware"
	"github.com/readyboard/backend-api/internal/models"
	"github.com/readyboard/backend-api/internal/repository"
)

// OrderHandler handles order management endpoints.
type OrderHandler struct {
	orders *repository.OrderRepository
	boards *repository.BoardRepository
}

// NewOrderHandler creates a new OrderHandler.
func NewOrderHandler(orders *repository.OrderRepository, boards *repository.BoardRepository) *OrderHandler {
	return &OrderHandler{orders: orders, boards: boards}
}

// parseItems gracefully handles single strings or arrays of strings from JSON bodies.
func parseItems(raw interface{}) []string {
	if raw == nil {
		return []string{}
	}
	switch v := raw.(type) {
	case string:
		return []string{v}
	case []interface{}:
		items := make([]string, 0, len(v))
		for _, item := range v {
			if str, ok := item.(string); ok {
				items = append(items, str)
			}
		}
		return items
	case []string:
		return v
	default:
		return []string{}
	}
}

// ListActive handles GET /api/orders?board_id={id}
func (h *OrderHandler) ListActive(w http.ResponseWriter, r *http.Request) {
	boardID := r.URL.Query().Get("board_id")
	if boardID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "board_id query param is required"})
		return
	}

	// 1. Get board to find its owner (user_id)
	board, err := h.boards.GetByIDPublic(r.Context(), boardID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "board not found"})
		return
	}

	orders, err := h.orders.ListActive(r.Context(), board.UserID, boardID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not fetch orders"})
		return
	}
	if orders == nil {
		orders = []*models.Order{}
	}
	writeJSON(w, http.StatusOK, orders)
}

// Create handles POST /api/orders
// Accessible via JWT OR API Key (for POS systems).
func (h *OrderHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var req models.CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	// Set UserID from claims
	req.UserID = claims.UserID

	// Restriction for Barista-JWT (still can restrict to a board if it was issued that way)
	if claims.BoardID != "" {
		req.BoardID = claims.BoardID
	}

	if req.CounterNumber == "" {
		req.CounterNumber = "1"
	}
	req.ResolvedItems = parseItems(req.Items)

	order, err := h.orders.Create(r.Context(), &req)
	if err != nil {
		log.Printf("error creating order: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not create order"})
		return
	}
	writeJSON(w, http.StatusCreated, order)
}

// UpdateStatus handles PUT /api/orders/{id}/status
func (h *OrderHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	orderID := mux.Vars(r)["id"]

	var req models.UpdateOrderStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	validStatuses := map[models.OrderStatus]bool{
		models.StatusPreparing: true,
		models.StatusReady:     true,
		models.StatusArchived:  true,
	}
	if !validStatuses[req.Status] {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "status must be preparing, ready, or archived"})
		return
	}

	order, err := h.orders.UpdateStatus(r.Context(), orderID, req.Status)
	if err != nil {
		log.Printf("error updating status: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not update order status"})
		return
	}

	writeJSON(w, http.StatusOK, order)
}

// IngestOrder handles POST /api/v1/orders for the Developer Portal Webhooks
// Validated by RequireMasterAPIKey.
func (h *OrderHandler) IngestOrder(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil || claims.UserID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "could not read request body"})
		return
	}
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	log.Printf("[API Ingest] Headers: %v", r.Header)
	log.Printf("[API Ingest] Body: %s", string(bodyBytes))

	var req models.CreateOrderRequest
	if err := json.Unmarshal(bodyBytes, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.BoardID == "" {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": "board_id is required"})
		return
	}

	// Safety: Enforce the BoardID actually belongs to the user holding the Master API Key
	if _, err := h.boards.GetByID(r.Context(), req.BoardID, claims.UserID); err != nil {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "board access denied or not found"})
		return
	}

	if req.CounterNumber == "" {
		req.CounterNumber = "1"
	}
	req.ResolvedItems = parseItems(req.Items)

	order, err := h.orders.Create(r.Context(), &req)
	if err != nil {
		log.Printf("error creating ingested order: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not create order"})
		return
	}
	writeJSON(w, http.StatusCreated, order)
}
