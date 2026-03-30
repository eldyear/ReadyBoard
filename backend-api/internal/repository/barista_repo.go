package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type BaristaRepository struct {
	pool *pgxpool.Pool
}

func NewBaristaRepository(pool *pgxpool.Pool) *BaristaRepository {
	return &BaristaRepository{pool: pool}
}

// CreatePairing saves a new 6-digit pairing code for a user account.
func (r *BaristaRepository) CreatePairing(ctx context.Context, userID, code string, expiresAt time.Time) error {
	// First, deactivate any existing codes for this user
	_, err := r.pool.Exec(ctx, "UPDATE barista_pairing SET is_active = FALSE WHERE user_id = $1", userID)
	if err != nil {
		return fmt.Errorf("deactivate old pairings: %w", err)
	}

	const q = `
		INSERT INTO barista_pairing (user_id, code, expires_at)
		VALUES ($1, $2, $3)`
	_, err = r.pool.Exec(ctx, q, userID, code, expiresAt)
	return err
}

// VerifyPairing finds an active, non-expired pairing and returns the user_id.
func (r *BaristaRepository) VerifyPairing(ctx context.Context, code string) (string, error) {
	const q = `
		SELECT user_id FROM barista_pairing 
		WHERE code = $1 AND is_active = TRUE AND expires_at > NOW()`
	
	var userID string
	err := r.pool.QueryRow(ctx, q, code).Scan(&userID)
	if err != nil {
		return "", err
	}
	return userID, nil
}

// DeactivatePairing marks a code as used/inactive.
func (r *BaristaRepository) DeactivatePairing(ctx context.Context, code string) error {
	_, err := r.pool.Exec(ctx, "UPDATE barista_pairing SET is_active = FALSE WHERE code = $1", code)
	return err
}

// GetActiveCode returns the current active code for a user if it hasn't expired.
func (r *BaristaRepository) GetActiveCode(ctx context.Context, userID string) (string, time.Time, error) {
	const q = `
		SELECT code, expires_at FROM barista_pairing 
		WHERE user_id = $1 AND is_active = TRUE AND expires_at > NOW()
		ORDER BY created_at DESC LIMIT 1`
	
	var code string
	var expiresAt time.Time
	err := r.pool.QueryRow(ctx, q, userID).Scan(&code, &expiresAt)
	if err != nil {
		return "", time.Time{}, err
	}
	return code, expiresAt, nil
}
