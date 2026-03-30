package db

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPool creates a new PostgreSQL connection pool.
func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse db config: %w", err)
	}

	cfg.MaxConns = 20
	cfg.MinConns = 2
	cfg.MaxConnLifetime = time.Hour
	cfg.MaxConnIdleTime = 30 * time.Minute
	cfg.HealthCheckPeriod = time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	// Verify connection
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return pool, nil
}

// RunMigrations applies all pending SQL migrations from the given path.
func RunMigrations(databaseURL, migrationsPath string) error {
	m, err := migrate.New(migrationsPath, databaseURL)
	if err != nil {
		return fmt.Errorf("create migrator: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("run migrations: %w", err)
	}

	return nil
}

// SeedThemes reads theme files from the themes directory and upserts them into the database.
func SeedThemes(ctx context.Context, pool *pgxpool.Pool, themesDir string) error {
	themes := []struct {
		ID          string
		Name        string
		Description string
		Filename    string
	}{
		{
			ID:          "11111111-1111-1111-1111-111111111111",
			Name:        "Modern Dark",
			Description: "A techno-noir terminal style theme with neon green/red accents.",
			Filename:    "modern_dark.html",
		},
		{
			ID:          "22222222-2222-2222-2222-222222222222",
			Name:        "Classic Light",
			Description: "A high-contrast, minimalist Swiss editorial style theme.",
			Filename:    "classic_light.html",
		},
	}

	query := `
		INSERT INTO themes (id, name, description, content, is_system)
		VALUES ($1, $2, $3, $4, true)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			content = EXCLUDED.content
	`

	for _, t := range themes {
		path := filepath.Join(themesDir, t.Filename)
		content, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read theme %s: %w", t.Filename, err)
		}

		_, err = pool.Exec(ctx, query, t.ID, t.Name, t.Description, string(content))
		if err != nil {
			return fmt.Errorf("upsert theme %s: %w", t.Name, err)
		}
	}
	return nil
}
