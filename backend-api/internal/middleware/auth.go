package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/readyboard/backend-api/internal/models"
	"github.com/readyboard/backend-api/internal/repository"
)

type contextKey string

const UserContextKey contextKey = "user"
const BoardContextKey contextKey = "board_id"

// JWTClaims is the payload stored in the JWT access token.
type JWTClaims struct {
	UserID  string                  `json:"user_id"`
	Plan    models.SubscriptionPlan `json:"plan"`
	BoardID string                  `json:"board_id,omitempty"`
	jwt.RegisteredClaims
}

// TokenPair represents an access + refresh token pair.
type TokenPair struct {
	AccessToken  string
	RefreshToken string
}

// GenerateTokenPair creates a new JWT access token (30 days) and refresh token (7 days).
// Optionally accepts a BoardID to restrict the token scope (e.g. for Nano-Barista).
func GenerateTokenPair(user *models.User, secret, refreshSecret string, boardID string) (*TokenPair, error) {
	// Access token – 30 days
	access := jwt.NewWithClaims(jwt.SigningMethodHS256, &JWTClaims{
		UserID:  user.ID,
		Plan:    user.SubscriptionPlan,
		BoardID: boardID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID,
		},
	})
	accessStr, err := access.SignedString([]byte(secret))
	if err != nil {
		return nil, err
	}

	// Refresh token – 7 days
	refresh := jwt.NewWithClaims(jwt.SigningMethodHS256, &jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		Subject:   user.ID,
	})
	refreshStr, err := refresh.SignedString([]byte(refreshSecret))
	if err != nil {
		return nil, err
	}

	return &TokenPair{AccessToken: accessStr, RefreshToken: refreshStr}, nil
}

// RequireJWT validates the Bearer token and injects the user into context.
func RequireJWT(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				http.Error(w, `{"error":"missing or invalid Authorization header"}`, http.StatusUnauthorized)
				return
			}

			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			claims := &JWTClaims{}
			token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(secret), nil
			})

			if err != nil || !token.Valid {
				http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireAPIKey validates the X-API-Key header for POS integrations (Account level).
func RequireAPIKey(userRepo *repository.UserRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			apiKey := r.Header.Get("X-API-Key")
			if apiKey == "" {
				http.Error(w, `{"error":"X-API-Key header is required"}`, http.StatusUnauthorized)
				return
			}

			user, err := userRepo.FindByAPIKey(r.Context(), apiKey)
			if err != nil {
				http.Error(w, `{"error":"invalid API key"}`, http.StatusUnauthorized)
				return
			}

			// Inject as synthetic JWT claims so handlers work uniformly
			claims := &JWTClaims{UserID: user.ID, Plan: user.SubscriptionPlan}
			ctx := context.WithValue(r.Context(), UserContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireMasterAPIKey validates the Authorization Bearer token as an account-level Master API Key.
func RequireMasterAPIKey(userRepo *repository.UserRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				http.Error(w, `{"error":"missing or invalid Authorization header"}`, http.StatusUnauthorized)
				return
			}
			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

			user, err := userRepo.FindByAPIKey(r.Context(), tokenStr)
			if err != nil || user == nil {
				http.Error(w, `{"error":"Invalid Master API Key"}`, http.StatusUnauthorized)
				return
			}

			// Inject as synthetic JWT claims so handlers work uniformly
			claims := &JWTClaims{UserID: user.ID, Plan: user.SubscriptionPlan}
			ctx := context.WithValue(r.Context(), UserContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// ClaimsFromContext extracts JWTClaims from request context.
func ClaimsFromContext(ctx context.Context) *JWTClaims {
	if v := ctx.Value(UserContextKey); v != nil {
		return v.(*JWTClaims)
	}
	return nil
}
