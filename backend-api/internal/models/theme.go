package models

import (
	"time"
)

// Theme represents a visual theme in the platform.
type Theme struct {
	ID          string    `json:"id"`
	CreatorID   *string   `json:"creator_id,omitempty"` // null if system theme
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Content     string    `json:"content"`
	Price       float64   `json:"price"`
	IsSystem    bool      `json:"is_system"`
	CreatedAt   time.Time `json:"created_at"`
}

// UserTheme represents a library record of a purchased/installed theme.
type UserTheme struct {
	UserID      string    `json:"user_id"`
	ThemeID     string    `json:"theme_id"`
	PurchasedAt time.Time `json:"purchased_at"`
	// Theme details joined in queries
	Theme *Theme `json:"theme,omitempty"`
}
