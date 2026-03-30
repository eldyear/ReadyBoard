package models

import (
	"time"
)

// SubscriptionPlan represents a user's subscription tier.
type SubscriptionPlan string

const (
	PlanFree    SubscriptionPlan = "free"
	PlanPro     SubscriptionPlan = "pro"
	PlanPremium SubscriptionPlan = "premium"
)

// User represents a café owner account.
type User struct {
	ID                 string           `json:"id"`
	Email              string           `json:"email"`
	PasswordHash       string           `json:"-"`
	FullName           string           `json:"full_name"`
	SubscriptionPlan   SubscriptionPlan `json:"subscription_plan"`
	SubscriptionStatus string           `json:"subscription_status"`
	ProExpiresAt       *time.Time       `json:"pro_expires_at,omitempty"`
	StripeCustomerID   *string          `json:"stripe_customer_id,omitempty"`
	StripeSubscriptionID *string          `json:"stripe_subscription_id,omitempty"`
	FreedomPayCardToken *string          `json:"freedompay_card_token,omitempty"`
	CountryCode        string           `json:"country_code"`
	AutoRenew          bool             `json:"auto_renew"`
	APIKey             *string          `json:"api_key,omitempty"`
	IsActive           bool             `json:"is_active"`
	CreatedAt          time.Time        `json:"created_at"`
	UpdatedAt          time.Time        `json:"updated_at"`
}

// RegisterRequest is the payload for POST /api/auth/register.
type RegisterRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	FullName    string `json:"full_name"`
	CountryCode string `json:"country_code"`
}

// LoginRequest is the payload for POST /api/auth/login.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// AuthResponse is returned after successful register/login.
type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	User         *User  `json:"user"`
}
