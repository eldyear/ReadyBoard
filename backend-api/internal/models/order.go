package models

import "time"

// OrderStatus represents the lifecycle state of an order.
type OrderStatus string

const (
	StatusPreparing OrderStatus = "preparing"
	StatusReady     OrderStatus = "ready"
	StatusArchived  OrderStatus = "archived"
)

// OrderItem represents a single product in an order
type OrderItem struct {
	Name       string  `json:"name"`
	Price      float64 `json:"price"`
	CategoryID string  `json:"category_id"`
}

// Order represents a customer order on a board.
type Order struct {
	ID              string      `json:"id"`
	UserID          string      `json:"user_id"`
	BoardID         string      `json:"board_id,omitempty"`
	OrderNumber     *string     `json:"order_number,omitempty"`
	CounterNumber   string      `json:"counter_number"`
	Items           []string    `json:"items,omitempty"`
	StructuredItems []OrderItem `json:"structured_items,omitempty"`
	Status          OrderStatus `json:"status"`
	TotalPrice      float64     `json:"total_price"`
	Notes           string      `json:"notes,omitempty"`
	CreatedAt       time.Time   `json:"created_at"`
	ReadyAt         *time.Time  `json:"ready_at,omitempty"`
	ArchivedAt      *time.Time  `json:"archived_at,omitempty"`
}

// CreateOrderRequest is the payload for POST /api/orders.
type CreateOrderRequest struct {
	UserID          string      `json:"user_id,omitempty"`
	BoardID         string      `json:"board_id,omitempty"`
	OrderNumber     *string     `json:"order_number,omitempty"`
	CounterNumber   string      `json:"counter_number,omitempty"`
	Status          OrderStatus `json:"status,omitempty"`
	Notes           string      `json:"notes,omitempty"`
	Items           interface{} `json:"items,omitempty"` // Accepts string or []string
	StructuredItems []OrderItem `json:"structured_items,omitempty"`
	TotalPrice      float64     `json:"total_price"`

	// ResolvedItems holds the normalized array
	ResolvedItems []string `json:"-"`
}

// UpdateOrderStatusRequest is the payload for PUT /api/orders/:id/status.
type UpdateOrderStatusRequest struct {
	Status OrderStatus `json:"status"`
}

// OrderEvent is what gets broadcast over Redis Pub/Sub when an order changes.
type OrderEvent struct {
	UserID          string      `json:"user_id"`
	BoardID         string      `json:"board_id,omitempty"`
	OrderID         string      `json:"order_id"`
	OrderNumber     *string     `json:"order_number,omitempty"`
	CounterNumber   string      `json:"counter_number"`
	Items           []string    `json:"items,omitempty"`
	StructuredItems []OrderItem `json:"structured_items,omitempty"`
	Status          OrderStatus `json:"status"`
	TotalPrice      float64     `json:"total_price"`
	Timestamp       time.Time   `json:"timestamp"`
}
