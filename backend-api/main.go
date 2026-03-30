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
	"github.com/stripe/stripe-go/v78"

	"github.com/readyboard/backend-api/internal/config"
	"github.com/readyboard/backend-api/internal/db"
	"github.com/readyboard/backend-api/internal/handlers"
	"github.com/readyboard/backend-api/internal/middleware"
	"github.com/readyboard/backend-api/internal/repository"
	"github.com/readyboard/backend-api/internal/service"
)

func main() {
	// ── Load configuration ──────────────────────────────────────
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	// ── Database connections ────────────────────────────────────
	ctx := context.Background()

	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("postgres: %v", err)
	}
	defer pool.Close()

	redisClient, err := db.NewRedisClient(ctx, cfg.RedisURL)
	if err != nil {
		log.Fatalf("redis: %v", err)
	}
	defer redisClient.Close()

	// ── Run migrations ──────────────────────────────────────────
	if err := db.RunMigrations(cfg.DatabaseURL, cfg.MigrationsPath); err != nil {
		log.Fatalf("migrations: %v", err)
	}
	log.Println("Migrations applied successfully")

	// ── Seed Themes ─────────────────────────────────────────────
	if err := db.SeedThemes(ctx, pool, "/app/themes"); err != nil {
		log.Printf("Warning: failed to seed themes: %v", err)
	} else {
		log.Println("System themes seeded successfully")
	}

	stripe.Key = cfg.StripeSecretKey

	// ── Repositories ────────────────────────────────────────────
	userRepo := repository.NewUserRepository(pool)
	boardRepo := repository.NewBoardRepository(pool, redisClient)
	orderRepo := repository.NewOrderRepository(pool, redisClient)
	themeRepo := repository.NewThemeRepository(pool)
	baristaRepo := repository.NewBaristaRepository(pool)
	nanoBaristaRepo := repository.NewNanoBaristaRepository(pool)

	// ── Handlers ────────────────────────────────────────────────
	authH := handlers.NewAuthHandler(userRepo, cfg.JWTSecret, cfg.JWTRefreshSecret)
	boardH := handlers.NewBoardHandler(boardRepo, orderRepo, redisClient)
	orderH := handlers.NewOrderHandler(orderRepo, boardRepo)
	billingH := handlers.NewBillingHandler(userRepo, themeRepo, cfg)
	themeH := handlers.NewThemeHandler(themeRepo)
	pairingH := handlers.NewPairingHandler(redisClient) // TV Pairing
	baristaH := handlers.NewBaristaHandler(baristaRepo, userRepo, boardRepo, cfg.JWTSecret, cfg.JWTRefreshSecret)
	nanoBaristaH := handlers.NewNanoBaristaHandler(nanoBaristaRepo, baristaRepo)

	// Start internal billing worker for Freedom Pay renewals
	billingWorker := service.NewBillingWorker(userRepo)
	go billingWorker.Start(ctx)

	// ── Routing ──────────────────────────────────────────────────
	r := mux.NewRouter()

	// CORS middleware
	r.Use(corsMiddleware)

	// Global OPTIONS handler to ensure CORS middleware executes for preflight requests
	// before Gorilla mux rejects them as 405 Method Not Allowed
	r.PathPrefix("/").Methods(http.MethodOptions).HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})

	// Health / liveness endpoint
	r.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"status":"ok"}`)
	}).Methods(http.MethodGet)

	// Auth routes (public)
	api := r.PathPrefix("/api").Subrouter()
	api.HandleFunc("/auth/register", authH.Register).Methods(http.MethodPost)
	api.HandleFunc("/auth/login", authH.Login).Methods(http.MethodPost)

	// Stripe webhook (public – Stripe won't send auth headers)
	api.HandleFunc("/webhooks/stripe", billingH.StripeWebhook).Methods(http.MethodPost)

	// Freedom Pay Webhook (public)
	api.HandleFunc("/webhooks/freedompay", billingH.FreedomPayWebhook).Methods(http.MethodPost)

	// Public Marketplace
	api.HandleFunc("/marketplace/themes", themeH.GetMarketplaceThemes).Methods(http.MethodGet)

	// Public board display route (no auth – TV display app)
	api.HandleFunc("/boards/public/{slug}", boardH.GetPublic).Methods(http.MethodGet)

	// Public orders list (read-only, used by display app)
	api.HandleFunc("/orders", orderH.ListActive).Methods(http.MethodGet)

	// Public TV Pairing code generation (TV Display App requests this without auth)
	api.HandleFunc("/pairing/generate", pairingH.GenerateCode).Methods(http.MethodPost)
	api.HandleFunc("/pairing/barista/verify", baristaH.VerifyCode).Methods(http.MethodPost)

	// JWT-protected routes
	jwtMW := middleware.RequireJWT(cfg.JWTSecret)

	protected := api.NewRoute().Subrouter()
	protected.Use(jwtMW)
	protected.HandleFunc("/auth/me", authH.Me).Methods(http.MethodGet)
	protected.HandleFunc("/auth/api-key", authH.GenerateAPIKey).Methods(http.MethodPost)
	protected.HandleFunc("/auth/api-key", authH.RevokeAPIKey).Methods(http.MethodDelete)
	protected.HandleFunc("/boards", boardH.List).Methods(http.MethodGet)
	protected.HandleFunc("/boards", boardH.Create).Methods(http.MethodPost)
	protected.HandleFunc("/boards/{id}", boardH.Get).Methods(http.MethodGet)
	protected.HandleFunc("/boards/{id}", boardH.Update).Methods(http.MethodPut)
	protected.HandleFunc("/boards/{id}", boardH.Delete).Methods(http.MethodDelete)
	protected.HandleFunc("/orders", orderH.Create).Methods(http.MethodPost)
	protected.HandleFunc("/orders/{id}/status", orderH.UpdateStatus).Methods(http.MethodPut)

	// Themes
	protected.HandleFunc("/themes", themeH.GetUserLibrary).Methods(http.MethodGet)
	protected.HandleFunc("/themes", themeH.CreateTheme).Methods(http.MethodPost)
	protected.HandleFunc("/marketplace/buy", themeH.BuyTheme).Methods(http.MethodPost)

	// Nano-Barista Menu Management
	protected.HandleFunc("/barista/categories", nanoBaristaH.ListCategories).Methods(http.MethodGet)
	protected.HandleFunc("/barista/categories", nanoBaristaH.CreateCategory).Methods(http.MethodPost)
	protected.HandleFunc("/barista/categories/{id}", nanoBaristaH.UpdateCategory).Methods(http.MethodPut)
	protected.HandleFunc("/barista/categories/{id}", nanoBaristaH.DeleteCategory).Methods(http.MethodDelete)
	protected.HandleFunc("/barista/products", nanoBaristaH.ListProducts).Methods(http.MethodGet)
	protected.HandleFunc("/barista/products", nanoBaristaH.CreateProduct).Methods(http.MethodPost)
	protected.HandleFunc("/barista/products/{id}", nanoBaristaH.UpdateProduct).Methods(http.MethodPut)
	protected.HandleFunc("/barista/products/{id}", nanoBaristaH.DeleteProduct).Methods(http.MethodDelete)
	protected.HandleFunc("/barista/menu", nanoBaristaH.GetMenu).Methods(http.MethodGet)
	protected.HandleFunc("/barista/pairing-status", nanoBaristaH.GetPairingStatus).Methods(http.MethodGet)

	// Admin linking a generated TV Pairing code
	protected.HandleFunc("/pairing/link", pairingH.LinkTerminal).Methods(http.MethodPost)
	protected.HandleFunc("/pairing/barista/generate", baristaH.GenerateCode).Methods(http.MethodPost)
	protected.HandleFunc("/pairing/unpair", pairingH.UnpairTerminal).Methods(http.MethodPost)

	// Billing – both URL variants accepted
	protected.HandleFunc("/billing/activate-mock-pro", billingH.MockActivatePro).Methods(http.MethodPost)
	protected.HandleFunc("/billing/mock-pro", billingH.MockActivatePro).Methods(http.MethodPost)
	protected.HandleFunc("/billing/cancel", billingH.CancelSubscription).Methods(http.MethodPost)
	protected.HandleFunc("/checkout/create-session", billingH.CreateCheckoutSession).Methods(http.MethodPost)

	// API-key protected routes (for POS systems - legacy)
	apiKeyMW := middleware.RequireAPIKey(userRepo)
	posRoutes := api.NewRoute().Subrouter()
	posRoutes.Use(apiKeyMW)
	posRoutes.HandleFunc("/pos/orders", orderH.Create).Methods(http.MethodPost)
	posRoutes.HandleFunc("/pos/orders/{id}/status", orderH.UpdateStatus).Methods(http.MethodPut)

	// Universal Order Ingest API (Account level Master API Key)
	masterKeyMW := middleware.RequireMasterAPIKey(userRepo)
	v1 := api.PathPrefix("/v1").Subrouter()
	v1.Use(masterKeyMW)
	v1.HandleFunc("/orders", orderH.IngestOrder).Methods(http.MethodPost)
	v1.HandleFunc("/boards", boardH.List).Methods(http.MethodGet)

	// ── HTTP Server ──────────────────────────────────────────────
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// ── Graceful shutdown ────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("backend-api listening on :%s (env=%s)", cfg.Port, cfg.Env)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	<-quit
	log.Println("shutdown signal received, draining connections...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("graceful shutdown failed: %v", err)
	}
	log.Println("server stopped cleanly")
}

// corsMiddleware allows cross-origin requests from the frontend containers.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
