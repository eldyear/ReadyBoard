package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"

	"github.com/readyboard/backend-api/internal/middleware"
	"github.com/readyboard/backend-api/internal/models"
	"github.com/readyboard/backend-api/internal/repository"
	"github.com/redis/go-redis/v9"
)

// BoardHandler handles board CRUD endpoints.
type BoardHandler struct {
	boards *repository.BoardRepository
	orders *repository.OrderRepository
	redis  *redis.Client
}

// NewBoardHandler creates a new BoardHandler.
func NewBoardHandler(boards *repository.BoardRepository, orders *repository.OrderRepository, redisClient *redis.Client) *BoardHandler {
	return &BoardHandler{boards: boards, orders: orders, redis: redisClient}
}

// List handles GET /api/boards
func (h *BoardHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	boards, err := h.boards.ListByUser(r.Context(), claims.UserID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not fetch boards"})
		return
	}
	if boards == nil {
		boards = []*models.Board{}
	} else {
		// Populate real-time connection status from Redis active_terminals set
		ctx := r.Context()
		for _, board := range boards {
			isMember, _ := h.redis.SIsMember(ctx, "active_terminals", board.ID).Result()
			board.IsOnline = isMember
		}
	}
	writeJSON(w, http.StatusOK, boards)
}

// Create handles POST /api/boards
func (h *BoardHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	var req models.CreateBoardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.Name == "" || req.Slug == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name and slug are required"})
		return
	}
	if req.DisplayMode == "" {
		req.DisplayMode = models.DisplayStandard
	}

	// Free-tier limit: max 1 active board
	if claims.Plan == models.PlanFree {
		count, err := h.boards.CountByUser(r.Context(), claims.UserID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not check board limit"})
			return
		}
		if count >= 1 {
			writeJSON(w, http.StatusForbidden, map[string]interface{}{
				"error":   "upgrade_required",
				"message": "Free plan is limited to 1 board. Upgrade to Pro for unlimited boards.",
			})
			return
		}
	}

	board, err := h.boards.Create(r.Context(), claims.UserID, &req)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not create board"})
		return
	}
	writeJSON(w, http.StatusCreated, board)
}

// Get handles GET /api/boards/{id}
func (h *BoardHandler) Get(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	boardID := mux.Vars(r)["id"]

	board, err := h.boards.GetByID(r.Context(), boardID, claims.UserID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "board not found"})
		return
	}
	writeJSON(w, http.StatusOK, board)
}

// GetPublic handles GET /api/boards/public/{slug} (no auth – used by display app)
func (h *BoardHandler) GetPublic(w http.ResponseWriter, r *http.Request) {
	slug := mux.Vars(r)["slug"]
	board, err := h.boards.GetBySlug(r.Context(), slug)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "board not found"})
		return
	}
	writeJSON(w, http.StatusOK, board)
}

// Update handles PUT /api/boards/{id}
func (h *BoardHandler) Update(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	boardID := mux.Vars(r)["id"]

	var req models.UpdateBoardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	board, err := h.boards.Update(r.Context(), boardID, claims.UserID, &req)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not update board"})
		return
	}
	writeJSON(w, http.StatusOK, board)
}

// Delete handles DELETE /api/boards/{id}
// Verifies ownership and hard-deletes the board. Associated orders are deleted via Postgres ON DELETE CASCADE.
func (h *BoardHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	boardID := mux.Vars(r)["id"]

	// Verify ownership before touching anything
	if _, err := h.boards.GetByID(r.Context(), boardID, claims.UserID); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "board not found or access denied"})
		return
	}

	// Hard-delete the board (orders are deleted by CASCADE)
	if err := h.boards.Delete(r.Context(), boardID, claims.UserID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not delete board"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
