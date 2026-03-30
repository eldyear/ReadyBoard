package models

import "time"

// BaristaPairing represents a 6-digit code linking a device to a user account.
type BaristaPairing struct {
	ID        string    `json:"id"`
	Code      string    `json:"code"`
	UserID    string    `json:"user_id"`
	ExpiresAt time.Time `json:"expires_at"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

// GenerateBaristaPairingRequest is the payload to generate a new code.
type GenerateBaristaPairingRequest struct {
	// No fields needed for global account pairing
}

// VerifyBaristaPairingRequest is the payload to verify a code.
type VerifyBaristaPairingRequest struct {
	Code string `json:"code"`
}

// BaristaAuthResponse is returned after successful verification.
type BaristaAuthResponse struct {
	AccessToken string `json:"access_token"`
	UserID      string `json:"user_id"`
}
