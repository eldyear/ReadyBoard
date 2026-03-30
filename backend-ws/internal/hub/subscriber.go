package hub

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
)

// Subscriber subscribes to Redis Pub/Sub pattern "board:*" and "pairing_events"
// and forwards messages to the Hub for broadcast to WebSocket clients.
type Subscriber struct {
	hub   *Hub
	redis *redis.Client
}

// NewSubscriber creates a Subscriber.
func NewSubscriber(h *Hub, rdb *redis.Client) *Subscriber {
	return &Subscriber{hub: h, redis: rdb}
}

// Run blocks and continuously listens on "board:*" and "pairing_events".
// Must be called in a goroutine. Reconnects automatically if the
// Redis connection drops.
func (s *Subscriber) Run(ctx context.Context) {
	for {
		if err := ctx.Err(); err != nil {
			log.Println("subscriber: context cancelled, stopping")
			return
		}

		if err := s.subscribe(ctx); err != nil {
			log.Printf("subscriber: redis error: %v – reconnecting in 2s", err)
		}

		select {
		case <-ctx.Done():
			return
		default:
		}
	}
}

func (s *Subscriber) subscribe(ctx context.Context) error {
	pubsub := s.redis.Subscribe(ctx, "pairing_events")
	// Also subscribe to the psubscribe patterns
	if err := pubsub.PSubscribe(ctx, "board:*", "user:*"); err != nil {
		return err
	}
	defer pubsub.Close()

	log.Println("subscriber: subscribed to patterns board:*, user:* and channel pairing_events")

	ch := pubsub.Channel()
	for {
		select {
		case <-ctx.Done():
			return nil
		case msg, ok := <-ch:
			if !ok {
				return fmt.Errorf("redis pubsub channel closed")
			}
			if msg.Channel == "pairing_events" {
				var payload map[string]interface{}
				if err := json.Unmarshal([]byte(msg.Payload), &payload); err == nil {
					if code, ok := payload["pairing_code"].(string); ok {
						s.hub.Broadcast <- &Message{
							BoardID: code,
							Data:    []byte(msg.Payload),
						}
					}
				}
			} else if len(msg.Channel) > 6 && msg.Channel[:6] == "board:" { // safe check
				boardID := msg.Channel[6:] // strip "board:" prefix
				s.hub.Broadcast <- &Message{
					BoardID: boardID,
					Data:    []byte(msg.Payload),
				}
			} else if len(msg.Channel) > 5 && msg.Channel[:5] == "user:" {
				userID := msg.Channel[5:] // strip "user:" prefix
				// We broadcast to the hub using the userID as the "BoardID"
				// The hub now handles this by checking its userClients map
				s.hub.Broadcast <- &Message{
					BoardID: userID,
					Data:    []byte(msg.Payload),
				}
			}
		}
	}
}
