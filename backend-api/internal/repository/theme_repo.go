package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/readyboard/backend-api/internal/models"
)

type ThemeRepository struct {
	pool *pgxpool.Pool
}

func NewThemeRepository(pool *pgxpool.Pool) *ThemeRepository {
	return &ThemeRepository{pool: pool}
}

// Create saved a newly uploaded/created theme.
func (r *ThemeRepository) Create(ctx context.Context, theme *models.Theme) error {
	query := `
		INSERT INTO themes (creator_id, name, description, content, price, is_system)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`
	return r.pool.QueryRow(ctx, query,
		theme.CreatorID,
		theme.Name,
		theme.Description,
		theme.Content,
		theme.Price,
		theme.IsSystem,
	).Scan(&theme.ID, &theme.CreatedAt)
}

// GetByID returns a theme given its ID
func (r *ThemeRepository) GetByID(ctx context.Context, id string) (*models.Theme, error) {
	query := `
		SELECT id, creator_id, name, description, content, price, is_system, created_at
		FROM themes
		WHERE id = $1
	`
	var t models.Theme
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&t.ID,
		&t.CreatorID,
		&t.Name,
		&t.Description,
		&t.Content,
		&t.Price,
		&t.IsSystem,
		&t.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// Purchase linking a theme to user's library.
func (r *ThemeRepository) Purchase(ctx context.Context, userID, themeID string) error {
	query := `
		INSERT INTO user_themes (user_id, theme_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING;
	`
	_, err := r.pool.Exec(ctx, query, userID, themeID)
	return err
}

// GetUserLibrary returns all themes available to a user (System default + Uploaded by them + Purchased library).
func (r *ThemeRepository) GetUserLibrary(ctx context.Context, userID string) ([]models.Theme, error) {
	query := `
		SELECT t.id, t.creator_id, t.name, t.description, t.content, t.price, t.is_system, t.created_at
		FROM themes t
		LEFT JOIN user_themes ut ON t.id = ut.theme_id AND ut.user_id = $1
		WHERE t.is_system = true 
		   OR t.creator_id = $1 
		   OR ut.user_id = $1
		ORDER BY t.is_system DESC, t.created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var themes []models.Theme
	for rows.Next() {
		var t models.Theme
		if err := rows.Scan(
			&t.ID,
			&t.CreatorID,
			&t.Name,
			&t.Description,
			&t.Content,
			&t.Price,
			&t.IsSystem,
			&t.CreatedAt,
		); err != nil {
			return nil, err
		}
		themes = append(themes, t)
	}
	return themes, nil
}

// GetMarketplaceThemes gets all non-system themes publicly available
func (r *ThemeRepository) GetMarketplaceThemes(ctx context.Context) ([]models.Theme, error) {
	query := `
		SELECT id, creator_id, name, description, content, price, is_system, created_at
		FROM themes
		WHERE is_system = false
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var themes []models.Theme
	for rows.Next() {
		var t models.Theme
		if err := rows.Scan(
			&t.ID,
			&t.CreatorID,
			&t.Name,
			&t.Description,
			&t.Content,
			&t.Price,
			&t.IsSystem,
			&t.CreatedAt,
		); err != nil {
			return nil, err
		}
		themes = append(themes, t)
	}
	return themes, nil
}
