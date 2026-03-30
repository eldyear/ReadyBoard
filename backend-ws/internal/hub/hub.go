package hub

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// Client represents a single connected WebSocket consumer.
type Client struct {
	BoardID          string
	UserID           string
	LinkedCategories []string
	Send             chan []byte
	done             chan struct{}
}

// OrderItem and OrderEvent are mirrored from backend-api for filtering
type OrderItem struct {
	Name       string `json:"name"`
	CategoryID string `json:"category_id"`
}

type OrderEvent struct {
	UserID          string      `json:"user_id"`
	BoardID         string      `json:"board_id,omitempty"`
	OrderID         string      `json:"order_id"`
	OrderNumber     *string     `json:"order_number,omitempty"`
	CounterNumber   string      `json:"counter_number"`
	Items           []string    `json:"items,omitempty"`
	StructuredItems []OrderItem `json:"structured_items,omitempty"`
	Status          string      `json:"status"`
	TotalPrice      float64     `json:"total_price"`
	Timestamp       time.Time   `json:"timestamp"`
}

// Hub maintains the set of active clients for all boards.
// It owns the clients map and uses channels for all mutations
// to avoid external mutex usage.
type Hub struct {
	// clients maps boardID → set of clients
	clients map[string]map[*Client]struct{}
	// userClients maps userID → set of clients (for global account updates)
	userClients map[string]map[*Client]struct{}
	mu          sync.RWMutex

	// broadcast receives messages for a specific board
	Broadcast chan *Message

	register   chan *Client
	unregister chan *Client

	rdb *redis.Client
}

// Message carries a boardID and the raw JSON payload.
type Message struct {
	BoardID string
	Data    []byte
}

// New creates a Hub ready to Run.
func New(rdb *redis.Client) *Hub {
	return &Hub{
		clients:     make(map[string]map[*Client]struct{}),
		userClients: make(map[string]map[*Client]struct{}),
		Broadcast:   make(chan *Message, 256),
		register:    make(chan *Client, 64),
		unregister:  make(chan *Client, 64),
		rdb:         rdb,
	}
}

// Run starts the hub's dispatch loop (blocking – run in goroutine).
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if _, ok := h.clients[client.BoardID]; !ok {
				h.clients[client.BoardID] = make(map[*Client]struct{})
				// This is the first client for this board, mark online
				if client.BoardID != "admin" {
					h.rdb.SAdd(context.Background(), "active_terminals", client.BoardID)
					h.publishAdminEvent("TERMINAL_ONLINE", client.BoardID)
				}
			}
			h.clients[client.BoardID][client] = struct{}{}
			
			// Map by UserID if provided
			if client.UserID != "" {
				if _, ok := h.userClients[client.UserID]; !ok {
					h.userClients[client.UserID] = make(map[*Client]struct{})
				}
				h.userClients[client.UserID][client] = struct{}{}
			}
			h.mu.Unlock()
			log.Printf("hub: client registered for board %s (total=%d)", client.BoardID, h.countTotal())

		case client := <-h.unregister:
			h.mu.Lock()
			if board, ok := h.clients[client.BoardID]; ok {
				if len(board) == 0 {
					delete(h.clients, client.BoardID)
					// Last client disconnected, mark offline
					if client.BoardID != "admin" {
						h.rdb.SRem(context.Background(), "active_terminals", client.BoardID)
						h.publishAdminEvent("TERMINAL_OFFLINE", client.BoardID)
					}
				}
			}
			if client.UserID != "" {
				if userGroup, ok := h.userClients[client.UserID]; ok {
					delete(userGroup, client)
					if len(userGroup) == 0 {
						delete(h.userClients, client.UserID)
					}
				}
			}
			h.mu.Unlock()
			close(client.Send)

		case msg := <-h.Broadcast:
			h.mu.RLock()
			var targets []*Client
			
			// Check board-specific clients
			if clients, ok := h.clients[msg.BoardID]; ok {
				for c := range clients {
					targets = append(targets, c)
				}
			}
			
			// Check user-level clients (broadcasting by UserID)
			if userClients, ok := h.userClients[msg.BoardID]; ok {
				for c := range userClients {
					found := false
					for _, existing := range targets {
						if existing == c { found = true; break }
					}
					if !found { targets = append(targets, c) }
				}
			}
			h.mu.RUnlock()

			// Pre-parse if it's an order event to enable filtering
			var event OrderEvent
			isOrder := json.Unmarshal(msg.Data, &event) == nil && event.OrderID != "" && len(event.StructuredItems) > 0

			for _, c := range targets {
				payload := msg.Data

				// Real-time Filtering:
				// If the board has linked categories, prune the order items.
				if isOrder && len(c.LinkedCategories) > 0 {
					var filteredItems []OrderItem
					for _, item := range event.StructuredItems {
						match := false
						for _, catID := range c.LinkedCategories {
							if item.CategoryID == catID {
								match = true
								break
							}
						}
						if match {
							filteredItems = append(filteredItems, item)
						}
					}

					// If no items match this board's categories, skip sending entirely
					if len(filteredItems) == 0 {
						continue
					}

					// If filtered, rebuild the JSON payload for this specific client
					if len(filteredItems) < len(event.StructuredItems) {
						filteredEvent := event
						filteredEvent.StructuredItems = filteredItems
						// Also update the simple Items array (strings) for compatibility if needed
						var newItems []string
						for _, fi := range filteredItems {
							newItems = append(newItems, fi.Name)
						}
						filteredEvent.Items = newItems
						
						if d, err := json.Marshal(filteredEvent); err == nil {
							payload = d
						}
					}
				}

				select {
				case c.Send <- payload:
				default:
					h.unregister <- c
				}
			}
		}
	}
}

// Register adds a client to the hub.
func (h *Hub) Register(c *Client) {
	h.register <- c
}

// Unregister removes a client from the hub.
func (h *Hub) Unregister(c *Client) {
	h.unregister <- c
}

func (h *Hub) countTotal() int {
	total := 0
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, board := range h.clients {
		total += len(board)
	}
	return total
}

func (h *Hub) publishAdminEvent(eventType, boardID string) {
	payload := map[string]string{
		"type":     eventType,
		"board_id": boardID,
	}
	data, _ := json.Marshal(payload)
	// Publish to Redis so it goes across instances to admin WS listeners
	h.rdb.Publish(context.Background(), "board:admin", data)
}
