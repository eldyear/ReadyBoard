package handlers

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"

	"github.com/readyboard/backend-ws/internal/hub"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Allow all origins in dev; restrict in production via environment check
	CheckOrigin: func(r *http.Request) bool { return true },
}

// WSHandler upgrades HTTP connections to WebSocket and manages client lifecycle.
type WSHandler struct {
	h *hub.Hub
}

// NewWSHandler creates a WSHandler.
func NewWSHandler(h *hub.Hub) *WSHandler {
	return &WSHandler{h: h}
}

// ServeWS handles GET /ws?board_id={id}&user_id={uid}
func (wsh *WSHandler) ServeWS(w http.ResponseWriter, r *http.Request) {
	boardID := r.URL.Query().Get("board_id")
	userID := r.URL.Query().Get("user_id")
	catsStr := r.URL.Query().Get("linked_categories")
	var linkedCategories []string
	if catsStr != "" {
		linkedCategories = strings.Split(catsStr, ",")
	}

	if boardID == "" {
		http.Error(w, "board_id query param is required", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade error: %v", err)
		return
	}

	client := &hub.Client{
		BoardID:          boardID,
		UserID:           userID,
		LinkedCategories: linkedCategories,
		Send:             make(chan []byte, 64),
	}

	wsh.h.Register(client)
	log.Printf("ws: new client for board %s (user %s, cats %v) from %s", boardID, userID, linkedCategories, r.RemoteAddr)

	// Write pump: forwards hub messages to the WebSocket connection.
	go writePump(conn, client, wsh.h)
	// Read pump: keeps connection alive and detects disconnects.
	readPump(conn, client, wsh.h)
}

func readPump(conn *websocket.Conn, client *hub.Client, h *hub.Hub) {
	defer func() {
		h.Unregister(client)
		conn.Close()
	}()

	conn.SetReadLimit(maxMessageSize)
	conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func writePump(conn *websocket.Conn, client *hub.Client, h *hub.Hub) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		conn.Close()
	}()

	for {
		select {
		case msg, ok := <-client.Send:
			conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}

		case <-ticker.C:
			conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
