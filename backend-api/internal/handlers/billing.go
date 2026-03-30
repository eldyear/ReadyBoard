package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"context"

	"github.com/readyboard/backend-api/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stripe/stripe-go/v78"
	"github.com/stripe/stripe-go/v78/checkout/session"
	"github.com/stripe/stripe-go/v78/webhook"
	stripeSubscription "github.com/stripe/stripe-go/v78/subscription"

	"github.com/readyboard/backend-api/internal/config"
	"github.com/readyboard/backend-api/internal/middleware"
)

// UserRepo defines the interface for user data operations.
type UserRepo interface {
	FindByID(ctx context.Context, userID string) (*models.User, error)
	ActivatePro(ctx context.Context, userID, stripeSubID, stripeCustID string) error
	FindByStripeSubscriptionID(ctx context.Context, subID string) (*models.User, error)
	SetAutoRenew(ctx context.Context, userID string, autoRenew bool) error
	UpdateFreedomPayToken(ctx context.Context, userID, token string) error
	Pool() *pgxpool.Pool
}

// ThemeRepo defines the interface for theme data operations.
type ThemeRepo interface {
	Purchase(ctx context.Context, userID, themeID string) error
}

// BillingHandler manages subscription and payment endpoints.
type BillingHandler struct {
	users  UserRepo
	themes ThemeRepo
	cfg    *config.Config
}

// NewBillingHandler creates a new BillingHandler.
func NewBillingHandler(users UserRepo, themes ThemeRepo, cfg *config.Config) *BillingHandler {
	return &BillingHandler{users: users, themes: themes, cfg: cfg}
}

// GetPreferredPaymentGateway returns "freedom_pay" for Central Asian countries, "stripe" otherwise.
func (h *BillingHandler) GetPreferredPaymentGateway(u *models.User) string {
	switch u.CountryCode {
	case "KG", "KZ", "UZ":
		return "freedom_pay"
	default:
		return "stripe"
	}
}

// MockActivatePro handles POST /api/billing/mock-pro
// Elevates the authenticated user's plan to 'pro' for testing purposes.
func (h *BillingHandler) MockActivatePro(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	if err := h.users.ActivatePro(r.Context(), claims.UserID, "mock_sub_123", "mock_cust_123"); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not activate pro plan"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"plan":    "pro",
		"message": "Pro plan activated successfully (mock)",
	})
}

// CreateCheckoutSession handles POST /api/checkout/create-session
func (h *BillingHandler) CreateCheckoutSession(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var req struct {
		PriceID string `json:"price_id"`
	}
	// It's okay if decoding fails or the body is empty, we will check if the result is empty
	_ = json.NewDecoder(r.Body).Decode(&req)

	// Prevent duplicate sessions if user is already pro
	u, err := h.users.FindByID(r.Context(), claims.UserID)
	if err == nil && u.SubscriptionPlan == "pro" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "User already has an active Pro subscription"})
		return
	}

	// Route to correct gateway
	gateway := h.GetPreferredPaymentGateway(u)
	if gateway == "freedom_pay" {
		// Placeholder for Freedom Pay initiation logic
		writeJSON(w, http.StatusOK, map[string]string{
			"gateway": "freedom_pay",
			"message": "Freedom Pay integration in progress",
			"url":     "/admin/billing/freedompay-init", // Frontend will handle this 
		})
		return
	}

	priceID := req.PriceID
	// ... (rest of Stripe logic remains)
	if priceID == "" {
		priceID = h.cfg.StripePriceID
	}

	if priceID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Stripe price ID is not configured (missing in request body and backend env)"})
		return
	}

	origin := r.Header.Get("Origin")
	if origin == "" {
		origin = "http://localhost" // Default for local dev admin panel behind Nginx
	}

	// We append /admin/ if we're dealing with the standard Nginx setup
	basePath := "/admin/billing"
	if origin == "http://localhost:5173" || origin == "http://localhost:3000" {
		// Vite direct or frontend-admin direct
		basePath = "/billing"
	}

	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(priceID),
				Quantity: stripe.Int64(1),
			},
		},
		Mode:              stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		SuccessURL:        stripe.String(origin + basePath + "?payment=success"),
		CancelURL:         stripe.String(origin + basePath + "?payment=cancelled"),
		ClientReferenceID: stripe.String(claims.UserID),
	}

	if u != nil && u.StripeCustomerID != nil {
		params.Customer = stripe.String(*u.StripeCustomerID)
	}

	s, err := session.New(params)
	if err != nil {
		log.Printf("stripe session creation error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to create checkout session"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"url": s.URL, "gateway": "stripe"})
}

// CancelSubscription handles POST /api/billing/cancel
func (h *BillingHandler) CancelSubscription(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	u, err := h.users.FindByID(r.Context(), claims.UserID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "user not found"})
		return
	}

	gateway := h.GetPreferredPaymentGateway(u)
	if gateway == "stripe" {
		if u.StripeSubscriptionID == nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "No active Stripe subscription found"})
			return
		}

		// Update Stripe subscription to cancel at period end
		params := &stripe.SubscriptionParams{
			CancelAtPeriodEnd: stripe.Bool(true),
		}
		_, err := stripeSubscription.Update(*u.StripeSubscriptionID, params)
		if err != nil {
			log.Printf("Failed to cancel Stripe subscription %s: %v", *u.StripeSubscriptionID, err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to cancel Stripe subscription"})
			return
		}
	} else if gateway == "freedom_pay" {
		// For Freedom Pay, we just set the auto_renew flag to false
		if err := h.users.SetAutoRenew(r.Context(), u.ID, false); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to update cancellation status"})
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "message": "Subscription will be cancelled at the end of the current period"})
}

// StripeWebhook handles POST /api/webhooks/stripe
func (h *BillingHandler) StripeWebhook(w http.ResponseWriter, r *http.Request) {
	const MaxBodyBytes = int64(65536)
	r.Body = http.MaxBytesReader(w, r.Body, MaxBodyBytes)
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusServiceUnavailable)
		return
	}

	signatureHeader := r.Header.Get("Stripe-Signature")
	event, err := webhook.ConstructEventWithOptions(payload, signatureHeader, h.cfg.StripeWebhookSecret, webhook.ConstructEventOptions{
		IgnoreAPIVersionMismatch: true,
	})
	if err != nil {
		log.Printf("⚠️  Webhook signature verification failed: %v", err)
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	switch event.Type {
	case "checkout.session.completed":
		var sess stripe.CheckoutSession
		err := json.Unmarshal(event.Data.Raw, &sess)
		if err != nil {
			log.Printf("Error parsing checkout session JSON: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		userID := sess.ClientReferenceID
		stripeSubID := ""
		if sess.Subscription != nil {
			stripeSubID = sess.Subscription.ID
		}
		stripeCustID := ""
		if sess.Customer != nil {
			stripeCustID = sess.Customer.ID
		}

		// Handle theme purchase metadata
		if sess.Metadata["type"] == "theme_purchase" {
			themeID := sess.Metadata["theme_id"]
			if userID != "" && themeID != "" {
				err = h.themes.Purchase(r.Context(), userID, themeID)
				if err != nil {
					log.Printf("Failed to link theme %s to user %s: %v", themeID, userID, err)
				}
			}
			break
		}

		// Activation logic (idempotent)
		if userID != "" && stripeSubID != "" {
			err = h.users.ActivatePro(r.Context(), userID, stripeSubID, stripeCustID)
			if err != nil {
				log.Printf("Failed to activate pro for user %s: %v", userID, err)
			} else {
				log.Printf("✅ Activated Pro for user %s (Sub: %s)", userID, stripeSubID)
			}
		}

	case "invoice.paid":
		var inv stripe.Invoice
		err := json.Unmarshal(event.Data.Raw, &inv)
		if err != nil {
			log.Printf("Error parsing invoice JSON: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		// Subscription ID is required here
		if inv.Subscription == nil {
			break
		}

		stripeSubID := inv.Subscription.ID
		stripeCustID := ""
		if inv.Customer != nil {
			stripeCustID = inv.Customer.ID
		}

		// Find user by stripe_subscription_id
		u, err := h.users.FindByStripeSubscriptionID(r.Context(), stripeSubID)
		if err == nil {
			err = h.users.ActivatePro(r.Context(), u.ID, stripeSubID, stripeCustID)
			if err != nil {
				log.Printf("Failed to renew pro for user %s: %v", u.ID, err)
			} else {
				log.Printf("✅ Renewed Pro for user %s (Sub: %s)", u.ID, stripeSubID)
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]string{"received": "true"})
}

// FreedomPayWebhook handles POST /api/webhooks/freedompay
func (h *BillingHandler) FreedomPayWebhook(w http.ResponseWriter, r *http.Request) {
	// Freedom Pay sends XML or POST parameters usually. 
	// For now, we log the body and return success.
	body, _ := io.ReadAll(r.Body)
	log.Printf("Freedom Pay Webhook received: %s", string(body))

	// In a real implementation, we would:
	// 1. Verify signature (pg_sig)
	// 2. Parse pg_result (success/failure)
	// 3. Extract pg_card_id/token for recurrent payments
	// 4. Update user's freedompay_card_token and activate pro

	// Placeholder for activating Pro if we find a userID in metadata/params
	// userID := r.FormValue("pg_order_id") // Assuming pg_order_id maps to userID
	// if r.FormValue("pg_result") == "1" && userID != "" {
	//     _ = h.users.UpdateFreedomPayToken(r.Context(), userID, r.FormValue("pg_card_id"))
	//     _ = h.users.ActivatePro(r.Context(), userID, "fp_sub_"+userID, "fp_cust_"+userID)
	// }

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
