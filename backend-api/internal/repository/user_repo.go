package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/readyboard/backend-api/internal/models"
)

// UserRepository handles all user database operations.
type UserRepository struct {
	pool *pgxpool.Pool
}

// NewUserRepository creates a new UserRepository.
func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

// scan columns shared by all user SELECT queries.
const userColumns = `id, email, password_hash, full_name, subscription_plan, subscription_status, pro_expires_at, stripe_customer_id, stripe_subscription_id, freedompay_card_token, country_code, auto_renew, api_key, is_active, created_at, updated_at`

func scanUser(row interface {
	Scan(...interface{}) error
}) (*models.User, error) {
	u := &models.User{}
	err := row.Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.FullName,
		&u.SubscriptionPlan, &u.SubscriptionStatus, &u.ProExpiresAt,
		&u.StripeCustomerID, &u.StripeSubscriptionID,
		&u.FreedomPayCardToken, &u.CountryCode, &u.AutoRenew,
		&u.APIKey, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
	)
	return u, err
}

// Create inserts a new user and returns it.
func (r *UserRepository) Create(ctx context.Context, req *models.RegisterRequest) (*models.User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	q := `INSERT INTO users (email, password_hash, full_name, country_code)
		VALUES ($1, $2, $3, $4)
		RETURNING ` + userColumns

	u, err := scanUser(r.pool.QueryRow(ctx, q, req.Email, string(hash), req.FullName, req.CountryCode))
	if err != nil {
		return nil, fmt.Errorf("insert user: %w", err)
	}
	return u, nil
}

// FindByEmail retrieves a user by email address.
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	q := `SELECT ` + userColumns + ` FROM users WHERE email = $1 AND is_active = true`
	u, err := scanUser(r.pool.QueryRow(ctx, q, email))
	if err != nil {
		return nil, fmt.Errorf("find user by email: %w", err)
	}
	return u, nil
}

// FindByID retrieves a user by ID and performs the pro-expiry check inline.
func (r *UserRepository) FindByID(ctx context.Context, userID string) (*models.User, error) {
	q := `SELECT ` + userColumns + ` FROM users WHERE id = $1 AND is_active = true`
	u, err := scanUser(r.pool.QueryRow(ctx, q, userID))
	if err != nil {
		return nil, fmt.Errorf("find user by id: %w", err)
	}

	// Auto-revert to free if pro subscription has expired.
	if u.ProExpiresAt != nil && time.Now().After(*u.ProExpiresAt) && u.SubscriptionPlan == models.PlanPro {
		_ = r.pool.QueryRow(ctx,
			`UPDATE users SET subscription_plan='free', subscription_status='inactive' WHERE id=$1 RETURNING `+userColumns,
			userID,
		).Scan(
			&u.ID, &u.Email, &u.PasswordHash, &u.FullName,
			&u.SubscriptionPlan, &u.SubscriptionStatus, &u.ProExpiresAt,
			&u.StripeCustomerID, &u.StripeSubscriptionID,
			&u.FreedomPayCardToken, &u.CountryCode, &u.AutoRenew,
			&u.APIKey, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
		)
	}

	return u, nil
}

// FindByAPIKey retrieves a user by their API key (for POS integrations).
func (r *UserRepository) FindByAPIKey(ctx context.Context, apiKey string) (*models.User, error) {
	q := `SELECT ` + userColumns + ` FROM users WHERE api_key = $1 AND is_active = true`
	u, err := scanUser(r.pool.QueryRow(ctx, q, apiKey))
	if err != nil {
		return nil, fmt.Errorf("find user by api key: %w", err)
	}
	return u, nil
}

// VerifyPassword checks a plaintext password against the stored hash.
func (r *UserRepository) VerifyPassword(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}

// GenerateAPIKey creates a new random API key for the user.
func (r *UserRepository) GenerateAPIKey(ctx context.Context, userID string) (string, error) {
	apiKey := fmt.Sprintf("rb_%s_%d", userID[:8], time.Now().UnixNano())
	const q = `UPDATE users SET api_key = $1 WHERE id = $2`
	_, err := r.pool.Exec(ctx, q, apiKey, userID)
	return apiKey, err
}

// RevokeAPIKey nullifies the Master API Key for the user.
func (r *UserRepository) RevokeAPIKey(ctx context.Context, userID string) error {
	const q = `UPDATE users SET api_key = NULL WHERE id = $1`
	_, err := r.pool.Exec(ctx, q, userID)
	return err
}

// ActivatePro sets plan to 'pro', status to 'active', and pro_expires_at to +30 days.
// It also stores the Stripe subscription and customer IDs for idempotency.
func (r *UserRepository) ActivatePro(ctx context.Context, userID, stripeSubID, stripeCustID string) error {
	const q = `UPDATE users
		SET subscription_plan = 'pro',
		    subscription_status = 'active',
		    pro_expires_at = NOW() + INTERVAL '30 days',
		    stripe_subscription_id = $2,
		    stripe_customer_id = $3
		WHERE id = $1`
	_, err := r.pool.Exec(ctx, q, userID, stripeSubID, stripeCustID)
	return err
}

// FindByStripeSubscriptionID retrieves a user by their Stripe subscription ID.
func (r *UserRepository) FindByStripeSubscriptionID(ctx context.Context, subID string) (*models.User, error) {
	q := `SELECT ` + userColumns + ` FROM users WHERE stripe_subscription_id = $1 AND is_active = true`
	u, err := scanUser(r.pool.QueryRow(ctx, q, subID))
	if err != nil {
		return nil, fmt.Errorf("find user by stripe sub id: %w", err)
	}
	return u, err
}

// SetAutoRenew updates the auto_renew flag for the user.
func (r *UserRepository) SetAutoRenew(ctx context.Context, userID string, autoRenew bool) error {
	const q = `UPDATE users SET auto_renew = $2 WHERE id = $1`
	_, err := r.pool.Exec(ctx, q, userID, autoRenew)
	return err
}

// UpdateFreedomPayToken stores the recurrent payment card token from Freedom Pay.
func (r *UserRepository) UpdateFreedomPayToken(ctx context.Context, userID, token string) error {
	const q = `UPDATE users SET freedompay_card_token = $2 WHERE id = $1`
	_, err := r.pool.Exec(ctx, q, userID, token)
	return err
}

// Pool returns the underlying pgxpool.Pool.
func (r *UserRepository) Pool() *pgxpool.Pool {
	return r.pool
}

// CountBoardsByUser returns the number of active boards owned by a user.
func (r *UserRepository) CountBoardsByUser(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM boards WHERE user_id = $1 AND is_active = true`, userID).Scan(&count)
	return count, err
}
