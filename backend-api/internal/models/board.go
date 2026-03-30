package models

import (
	"encoding/json"
	"time"
)

// DisplayMode controls which layout the TV display uses.
type DisplayMode string

const (
	DisplayStandard DisplayMode = "standard"
	DisplayPro      DisplayMode = "pro"
)

// MenuConfig is the JSONB config stored in boards.menu_config.
type MenuConfig struct {
	BackgroundImage string     `json:"background_image,omitempty"`
	BgType          string     `json:"bg_type,omitempty"`
	BgValue         string     `json:"bg_value,omitempty"`
	TextColor       string     `json:"text_color,omitempty"`
	TickerText      string     `json:"ticker_text,omitempty"`
	TickerSpeed     int        `json:"ticker_speed,omitempty"`
	TickerColor     string     `json:"ticker_color,omitempty"`
	MenuItems       []MenuItem `json:"menu_items,omitempty"`
	FontSizeScale   float64    `json:"font_size_scale,omitempty"`
	ReadyColor      string     `json:"ready_color,omitempty"`
	PreparingColor  string     `json:"preparing_color,omitempty"`
	ChimeEnabled    bool       `json:"chime_enabled,omitempty"`
	// LayoutPreset selects the named display preset on the frontend.
	// Valid values: "bucket-dynamism" | "crazy-menu" | "urban-chaos"
	LayoutPreset string `json:"layout_preset,omitempty"`
	// HideMenu hides the right-side menu panel in Pro mode.
	HideMenu bool `json:"hide_menu,omitempty"`
	// MainText replaces "ReadyBoard" branding in the ticker bar.
	MainText string `json:"main_text,omitempty"`
	// MainTextColor is the CSS color for MainText.
	MainTextColor string `json:"main_text_color,omitempty"`
	// CustomHTML holds raw HTML code injected into the CustomThemeEngine iframe.
	CustomHTML string `json:"custom_html,omitempty"`
}

// MenuItem represents one item on the dynamic menu overlay.
type MenuItem struct {
	Name  string `json:"name"`
	Price string `json:"price"`
	Image string `json:"image,omitempty"`
}

// Board represents a display screen configuration.
type Board struct {
	ID               string          `json:"id"`
	UserID           string          `json:"user_id"`
	Name             string          `json:"name"`
	Slug             string          `json:"slug"`
	DisplayMode      DisplayMode     `json:"display_mode"`
	CustomCSS        string          `json:"custom_css,omitempty"`
	MenuConfig       json.RawMessage `json:"menu_config"`
	LinkedCategories []string        `json:"linked_categories,omitempty"`
	IsActive         bool            `json:"is_active"`
	IsOnline         bool            `json:"is_online"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

// CreateBoardRequest is the payload for POST /api/boards.
type CreateBoardRequest struct {
	Name             string      `json:"name"`
	Slug             string      `json:"slug"`
	DisplayMode      DisplayMode `json:"display_mode"`
	MenuConfig       MenuConfig  `json:"menu_config,omitempty"`
	LinkedCategories []string    `json:"linked_categories,omitempty"`
}

// BoardEvent represents a real-time board configuration update.
type BoardEvent struct {
	Type      string    `json:"type"` // "board_update"
	Board     *Board    `json:"board"`
	Timestamp time.Time `json:"timestamp"`
}

// UpdateBoardRequest is the payload for PUT /api/boards/:id.
type UpdateBoardRequest struct {
	Name             *string      `json:"name,omitempty"`
	DisplayMode      *DisplayMode `json:"display_mode,omitempty"`
	CustomCSS        *string      `json:"custom_css,omitempty"`
	MenuConfig       *MenuConfig  `json:"menu_config,omitempty"`
	LinkedCategories []string    `json:"linked_categories,omitempty"`
}
