package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/readyboard/backend-api/internal/models"
)

// OrderRepository handles order operations and Redis publishing.
type OrderRepository struct {
	pool  *pgxpool.Pool
	redis *redis.Client
}

// NewOrderRepository creates a new OrderRepository.
func NewOrderRepository(pool *pgxpool.Pool, redisClient *redis.Client) *OrderRepository {
	return &OrderRepository{pool: pool, redis: redisClient}
}

// Create inserts a new order and publishes an event.
func (r *OrderRepository) Create(ctx context.Context, req *models.CreateOrderRequest) (*models.Order, error) {
	// Default to 'preparing' if no status supplied (status is a Postgres ENUM — can't use NULLIF in SQL)
	status := req.Status
	if status == "" {
		status = models.StatusPreparing
	}

	const q = `
		INSERT INTO orders (user_id, board_id, order_number, counter_number, items, structured_items, status, notes, total_price)
		VALUES ($1, NULLIF($2, '')::uuid, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, user_id, board_id, order_number, counter_number, items, structured_items, status, COALESCE(notes,''), created_at, total_price`

	o := &models.Order{}
	// Convert StructuredItems to JSON for PG
	sj, _ := json.Marshal(req.StructuredItems)

	var boardID sql.NullString
	err := r.pool.QueryRow(ctx, q, req.UserID, req.BoardID, req.OrderNumber, req.CounterNumber, req.ResolvedItems, sj, status, req.Notes, req.TotalPrice).Scan(
		&o.ID, &o.UserID, &boardID, &o.OrderNumber, &o.CounterNumber, &o.Items, &o.StructuredItems, &o.Status, &o.Notes, &o.CreatedAt, &o.TotalPrice,
	)
	if boardID.Valid { o.BoardID = boardID.String }
	if err != nil {
		return nil, fmt.Errorf("insert order: %w", err)
	}

	r.publish(ctx, o.UserID, o.BoardID, &models.OrderEvent{
		UserID:          o.UserID,
		BoardID:         o.BoardID,
		OrderID:         o.ID,
		OrderNumber:     o.OrderNumber,
		CounterNumber:   o.CounterNumber,
		Items:           o.Items,
		StructuredItems: o.StructuredItems,
		Status:          o.Status,
		TotalPrice:      o.TotalPrice,
		Timestamp:       time.Now(),
	})

	return o, nil
}

// ListActive returns all non-archived orders for a board, filtered by categories.
func (r *OrderRepository) ListActive(ctx context.Context, userID, boardID string) ([]*models.Order, error) {
	// 1. Get Board's linked categories
	var linkedCats []string
	err := r.pool.QueryRow(ctx, "SELECT linked_categories FROM boards WHERE id = $1", boardID).Scan(&linkedCats)
	if err != nil {
		return nil, fmt.Errorf("get board categories: %w", err)
	}

	const q = `
		SELECT id, user_id, board_id, order_number, counter_number, items, structured_items, status, COALESCE(notes,''), created_at, ready_at, archived_at, total_price
		FROM orders
		WHERE user_id = $1 AND status IN ('preparing','ready')
		ORDER BY created_at ASC`

	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, fmt.Errorf("list user orders: %w", err)
	}
	defer rows.Close()

	var orders []*models.Order
	for rows.Next() {
		o := &models.Order{}
		var boardID sql.NullString
		if err := rows.Scan(&o.ID, &o.UserID, &boardID, &o.OrderNumber, &o.CounterNumber, &o.Items, &o.StructuredItems, &o.Status, &o.Notes, &o.CreatedAt, &o.ReadyAt, &o.ArchivedAt, &o.TotalPrice); err != nil {
			return nil, fmt.Errorf("scan order: %w", err)
		}
		if boardID.Valid { o.BoardID = boardID.String }

		// 2. Filter items by category if board has linked categories
		if len(linkedCats) > 0 {
			var filteredItems []string
			var filteredStructured []models.OrderItem
			
			catMap := make(map[string]bool)
			for _, c := range linkedCats { catMap[c] = true }

			for _, item := range o.StructuredItems {
				if catMap[item.CategoryID] {
					filteredStructured = append(filteredStructured, item)
					filteredItems = append(filteredItems, item.Name)
				}
			}
			
			// Only include order if it has items for this board
			if len(filteredStructured) > 0 {
				o.Items = filteredItems
				o.StructuredItems = filteredStructured
				orders = append(orders, o)
			}
		} else {
			// No filter, show all
			orders = append(orders, o)
		}
	}
	return orders, rows.Err()
}

// UpdateStatus changes an order's status and publishes the change to Redis.
func (r *OrderRepository) UpdateStatus(ctx context.Context, orderID string, status models.OrderStatus) (*models.Order, error) {
	var readyAt *time.Time
	if status == models.StatusReady {
		now := time.Now()
		readyAt = &now
	}

	var archivedAt *time.Time
	if status == models.StatusArchived {
		now := time.Now()
		archivedAt = &now
	}

	const q = `
		UPDATE orders SET status=$1, ready_at=COALESCE($2, ready_at), archived_at=COALESCE($3, archived_at)
		WHERE id=$4
		RETURNING id, user_id, board_id, order_number, counter_number, items, structured_items, status, COALESCE(notes,''), created_at, ready_at, archived_at, total_price`

	o := &models.Order{}
	var bID sql.NullString
	err := r.pool.QueryRow(ctx, q, status, readyAt, archivedAt, orderID).Scan(
		&o.ID, &o.UserID, &bID, &o.OrderNumber, &o.CounterNumber, &o.Items, &o.StructuredItems, &o.Status, &o.Notes,
		&o.CreatedAt, &o.ReadyAt, &o.ArchivedAt, &o.TotalPrice,
	)
	if bID.Valid { o.BoardID = bID.String }
	if err != nil {
		return nil, fmt.Errorf("update order status: %w", err)
	}

	// Publish real-time event to global user channel AND board-specific if set
	r.publish(ctx, o.UserID, o.BoardID, &models.OrderEvent{
		UserID:          o.UserID,
		BoardID:         o.BoardID,
		OrderID:         o.ID,
		OrderNumber:     o.OrderNumber,
		CounterNumber:   o.CounterNumber,
		Items:           o.Items,
		StructuredItems: o.StructuredItems,
		Status:          o.Status,
		TotalPrice:      o.TotalPrice,
		Timestamp:       time.Now(),
	})

	return o, nil
}

// publish serialises an OrderEvent to JSON and publishes it to Redis.
// It publishes to the global user channel and optionally a board-specific channel.
func (r *OrderRepository) publish(ctx context.Context, userID, boardID string, event *models.OrderEvent) {
	data, err := json.Marshal(event)
	if err != nil {
		return
	}
	
	// 1. Global user-level channel (for Nano-Barista or multi-display sync)
	userChannel := fmt.Sprintf("user:%s", userID)
	r.redis.Publish(ctx, userChannel, data)

	// 2. Board-specific channel (legacy/target support)
	if boardID != "" {
		boardChannel := fmt.Sprintf("board:%s", boardID)
		r.redis.Publish(ctx, boardChannel, data)
	}
}

// ArchiveByBoardID archives all active orders for a board.
// Called when a board is deleted so no orphaned orders remain visible on displays.
func (r *OrderRepository) ArchiveByBoardID(ctx context.Context, boardID string) error {
	now := time.Now()
	_, err := r.pool.Exec(ctx,
		`UPDATE orders SET status='archived', archived_at=$1 WHERE board_id=$2 AND status IN ('preparing','ready')`,
		now, boardID,
	)
	return err
}
