package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/readyboard/backend-api/internal/middleware"
	"github.com/readyboard/backend-api/internal/models"
	"github.com/readyboard/backend-api/internal/repository"
	"github.com/stripe/stripe-go/v78"
	"github.com/stripe/stripe-go/v78/checkout/session"
)

type ThemeHandler struct {
	themes *repository.ThemeRepository
}

func NewThemeHandler(themes *repository.ThemeRepository) *ThemeHandler {
	return &ThemeHandler{themes: themes}
}

// GetUserLibrary handles GET /api/themes (Returns themes owned/available to current user)
func (h *ThemeHandler) GetUserLibrary(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	themes, err := h.themes.GetUserLibrary(r.Context(), claims.UserID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, themes)
}

// CreateTheme handles POST /api/themes (User uploading a custom theme)
func (h *ThemeHandler) CreateTheme(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var req struct {
		Name        string  `json:"name"`
		Description string  `json:"description"`
		Content     string  `json:"content"`
		Price       float64 `json:"price"` // 0.00 for private/free
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	theme := &models.Theme{
		CreatorID:   &claims.UserID,
		Name:        req.Name,
		Description: req.Description,
		Content:     req.Content,
		Price:       req.Price,
		IsSystem:    false,
	}

	if err := h.themes.Create(r.Context(), theme); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not save theme"})
		return
	}

	writeJSON(w, http.StatusCreated, theme)
}

// GetMarketplaceThemes handles GET /api/marketplace/themes
func (h *ThemeHandler) GetMarketplaceThemes(w http.ResponseWriter, r *http.Request) {
	themes, err := h.themes.GetMarketplaceThemes(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not fetch marketplace themes"})
		return
	}
	writeJSON(w, http.StatusOK, themes)
}

// BuyTheme handles POST /api/marketplace/buy
// It creates a Stripe checkout session for the requested theme.
func (h *ThemeHandler) BuyTheme(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var req struct {
		ThemeID string `json:"theme_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	theme, err := h.themes.GetByID(r.Context(), req.ThemeID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "theme not found"})
		return
	}

	// 1. If theme is free, purchase it immediately
	if theme.Price <= 0 {
		if err := h.themes.Purchase(r.Context(), claims.UserID, req.ThemeID); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not link theme"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{
			"status":  "ok",
			"message": "Free theme added to your library.",
		})
		return
	}

	// 2. Paid Theme: Create Stripe Session
	origin := r.Header.Get("Origin")
	if origin == "" {
		origin = "http://localhost" // Fallback
	}

	basePath := "/admin/marketplace"
	if origin == "http://localhost:5173" || origin == "http://localhost:3000" {
		basePath = "/marketplace"
	}

	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("usd"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name: stripe.String("Theme: " + theme.Name),
					},
					UnitAmount: stripe.Int64(int64(theme.Price * 100)), // Convert dollars to cents
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode:              stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL:        stripe.String(origin + basePath + "?payment=success&theme=" + theme.ID),
		CancelURL:         stripe.String(origin + basePath + "?payment=cancelled"),
		ClientReferenceID: stripe.String(claims.UserID),
		Metadata: map[string]string{
			"type":     "theme_purchase",
			"theme_id": theme.ID,
		},
	}

	s, err := session.New(params)
	if err != nil {
		log.Printf("session.New Theme purchase error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to create checkout session"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"url": s.URL})
}
