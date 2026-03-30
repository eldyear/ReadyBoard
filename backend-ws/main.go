package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/redis/go-redis/v9"

	"github.com/readyboard/backend-ws/internal/config"
	"github.com/readyboard/backend-ws/internal/handlers"
	"github.com/readyboard/backend-ws/internal/hub"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// ── Redis ────────────────────────────────────────────────────
	opts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		log.Fatalf("parse redis url: %v", err)
	}
	rdb := redis.NewClient(opts)
	defer rdb.Close()

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("redis ping: %v", err)
	}
	log.Println("Connected to Redis")

	// ── Hub ──────────────────────────────────────────────────────
	h := hub.New(rdb)
	go h.Run()

	// ── Redis Subscriber ─────────────────────────────────────────
	sub := hub.NewSubscriber(h, rdb)
	go sub.Run(ctx)

	// ── Router ───────────────────────────────────────────────────
	r := mux.NewRouter()

	r.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"status":"ok"}`)
	})

	wsHandler := handlers.NewWSHandler(h)
	r.HandleFunc("/ws", wsHandler.ServeWS)

	// ── HTTP Server ──────────────────────────────────────────────
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 0, // no timeout for long-lived WebSocket connections
		IdleTimeout:  120 * time.Second,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("backend-ws listening on :%s (env=%s)", cfg.Port, cfg.Env)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	<-quit
	log.Println("backend-ws: shutting down...")
	cancel() // stop Redis subscriber

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	_ = srv.Shutdown(shutdownCtx)

	log.Println("backend-ws: stopped")
}
