package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/readyboard/backend-api/internal/models"
)

// BoardRepository provides CRUD for boards.
type BoardRepository struct {
	pool  *pgxpool.Pool
	redis *redis.Client
}

// NewBoardRepository returns a new BoardRepository.
func NewBoardRepository(pool *pgxpool.Pool, redisClient *redis.Client) *BoardRepository {
	return &BoardRepository{pool: pool, redis: redisClient}
}

// Create inserts a new board for a user.
func (r *BoardRepository) Create(ctx context.Context, userID string, req *models.CreateBoardRequest) (*models.Board, error) {
	menuJSON, err := json.Marshal(req.MenuConfig)
	if err != nil {
		return nil, fmt.Errorf("marshal menu config: %w", err)
	}

	const q = `
		INSERT INTO boards (user_id, name, slug, display_mode, menu_config, linked_categories)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, user_id, name, slug, display_mode, COALESCE(custom_css,''), menu_config, linked_categories, is_active, created_at, updated_at`

	b := &models.Board{}
	err = r.pool.QueryRow(ctx, q, userID, req.Name, req.Slug, req.DisplayMode, menuJSON, req.LinkedCategories).Scan(
		&b.ID, &b.UserID, &b.Name, &b.Slug, &b.DisplayMode,
		&b.CustomCSS, &b.MenuConfig, &b.LinkedCategories, &b.IsActive, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert board: %w", err)
	}
	return b, nil
}

// ListByUser returns all boards belonging to a user.
func (r *BoardRepository) ListByUser(ctx context.Context, userID string) ([]*models.Board, error) {
	const q = `
		SELECT id, user_id, name, slug, display_mode, COALESCE(custom_css,''), menu_config, linked_categories, is_active, created_at, updated_at
		FROM boards WHERE user_id = $1 ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, fmt.Errorf("list boards: %w", err)
	}
	defer rows.Close()

	var boards []*models.Board
	for rows.Next() {
		b := &models.Board{}
		if err := rows.Scan(
			&b.ID, &b.UserID, &b.Name, &b.Slug, &b.DisplayMode,
			&b.CustomCSS, &b.MenuConfig, &b.LinkedCategories, &b.IsActive, &b.CreatedAt, &b.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan board: %w", err)
		}
		boards = append(boards, b)
	}
	return boards, rows.Err()
}

// GetByID retrieves a single board by ID, ensuring it belongs to userID.
func (r *BoardRepository) GetByID(ctx context.Context, boardID, userID string) (*models.Board, error) {
	const q = `
		SELECT id, user_id, name, slug, display_mode, COALESCE(custom_css,''), menu_config, linked_categories, is_active, created_at, updated_at
		FROM boards WHERE id = $1 AND user_id = $2`

	b := &models.Board{}
	err := r.pool.QueryRow(ctx, q, boardID, userID).Scan(
		&b.ID, &b.UserID, &b.Name, &b.Slug, &b.DisplayMode,
		&b.CustomCSS, &b.MenuConfig, &b.LinkedCategories, &b.IsActive, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get board: %w", err)
	}
	return b, nil
}

// GetBySlug retrieves a board by its public slug (used by the display app).
func (r *BoardRepository) GetBySlug(ctx context.Context, slug string) (*models.Board, error) {
	const q = `
		SELECT id, user_id, name, slug, display_mode, COALESCE(custom_css,''), menu_config, linked_categories, is_active, created_at, updated_at
		FROM boards WHERE (slug = $1 OR id::text = $1) AND is_active = true`

	b := &models.Board{}
	err := r.pool.QueryRow(ctx, q, slug).Scan(
		&b.ID, &b.UserID, &b.Name, &b.Slug, &b.DisplayMode,
		&b.CustomCSS, &b.MenuConfig, &b.LinkedCategories, &b.IsActive, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get board by slug: %w", err)
	}
	return b, nil
}

// GetByIDPublic retrieves a board by ID without requiring a userID (for internal/pairing use).
func (r *BoardRepository) GetByIDPublic(ctx context.Context, id string) (*models.Board, error) {
	const q = `
		SELECT id, user_id, name, slug, display_mode, COALESCE(custom_css,''), menu_config, linked_categories, is_active, created_at, updated_at
		FROM boards WHERE id = $1`

	b := &models.Board{}
	err := r.pool.QueryRow(ctx, q, id).Scan(
		&b.ID, &b.UserID, &b.Name, &b.Slug, &b.DisplayMode,
		&b.CustomCSS, &b.MenuConfig, &b.LinkedCategories, &b.IsActive, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get board public: %w", err)
	}
	return b, nil
}

// Update applies partial updates to a board.
func (r *BoardRepository) Update(ctx context.Context, boardID, userID string, req *models.UpdateBoardRequest) (*models.Board, error) {
	b, err := r.GetByID(ctx, boardID, userID)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		b.Name = *req.Name
	}
	if req.DisplayMode != nil {
		b.DisplayMode = *req.DisplayMode
	}
	if req.CustomCSS != nil {
		b.CustomCSS = *req.CustomCSS
	}
	if req.MenuConfig != nil {
		mc, _ := json.Marshal(req.MenuConfig)
		b.MenuConfig = mc
	}

	if req.LinkedCategories != nil {
		b.LinkedCategories = req.LinkedCategories
	}

	const q = `
		UPDATE boards SET name=$1, display_mode=$2, custom_css=$3, menu_config=$4, linked_categories=$5
		WHERE id=$6 AND user_id=$7
		RETURNING id, user_id, name, slug, display_mode, COALESCE(custom_css,''), menu_config, linked_categories, is_active, created_at, updated_at`

	updated := &models.Board{}
	err = r.pool.QueryRow(ctx, q, b.Name, b.DisplayMode, b.CustomCSS, b.MenuConfig, b.LinkedCategories, boardID, userID).Scan(
		&updated.ID, &updated.UserID, &updated.Name, &updated.Slug, &updated.DisplayMode,
		&updated.CustomCSS, &updated.MenuConfig, &updated.LinkedCategories, &updated.IsActive, &updated.CreatedAt, &updated.UpdatedAt,
	)
	if err == nil {
		r.publish(ctx, updated)
	}
	return updated, err
}

// publish serialises a BoardEvent to JSON and publishes it to Redis.
func (r *BoardRepository) publish(ctx context.Context, board *models.Board) {
	event := &models.BoardEvent{
		Type:      "BOARD_CONFIG_UPDATED",
		Board:     board,
		Timestamp: time.Now(),
	}
	data, err := json.Marshal(event)
	if err != nil {
		return
	}
	channel := fmt.Sprintf("board:%s", board.ID)
	r.redis.Publish(ctx, channel, data)
}

// Delete hard-deletes a board. Postgres ON DELETE CASCADE will handle deleting all associated orders.
func (r *BoardRepository) Delete(ctx context.Context, boardID, userID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM boards WHERE id=$1 AND user_id=$2`, boardID, userID)
	return err
}

// CountByUser returns the number of active boards owned by a user.
func (r *BoardRepository) CountByUser(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM boards WHERE user_id = $1 AND is_active = true`, userID).Scan(&count)
	return count, err
}
