package repository

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/readyboard/backend-api/internal/models"
)

type NanoBaristaRepository struct {
	pool *pgxpool.Pool
}

func NewNanoBaristaRepository(pool *pgxpool.Pool) *NanoBaristaRepository {
	return &NanoBaristaRepository{pool: pool}
}

// --- Categories ---

func (r *NanoBaristaRepository) CreateCategory(ctx context.Context, userID, name string) (*models.Category, error) {
	const q = `
		INSERT INTO categories (user_id, name)
		VALUES ($1, $2)
		RETURNING id, user_id, name, created_at`
	c := &models.Category{}
	err := r.pool.QueryRow(ctx, q, userID, name).Scan(&c.ID, &c.UserID, &c.Name, &c.CreatedAt)
	return c, err
}

func (r *NanoBaristaRepository) ListCategories(ctx context.Context, userID string) ([]*models.Category, error) {
	const q = `SELECT id, user_id, name, created_at FROM categories WHERE user_id = $1 ORDER BY name ASC`
	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cats []*models.Category
	for rows.Next() {
		c := &models.Category{}
		if err := rows.Scan(&c.ID, &c.UserID, &c.Name, &c.CreatedAt); err != nil {
			return nil, err
		}
		cats = append(cats, c)
	}
	return cats, rows.Err()
}

func (r *NanoBaristaRepository) UpdateCategory(ctx context.Context, categoryID, userID, name string) (*models.Category, error) {
	const q = `
		UPDATE categories SET name = $1
		WHERE id = $2 AND user_id = $3
		RETURNING id, user_id, name, created_at`
	c := &models.Category{}
	err := r.pool.QueryRow(ctx, q, name, categoryID, userID).Scan(&c.ID, &c.UserID, &c.Name, &c.CreatedAt)
	return c, err
}

func (r *NanoBaristaRepository) DeleteCategory(ctx context.Context, categoryID, userID string) error {
	_, err := r.pool.Exec(ctx, "DELETE FROM categories WHERE id = $1 AND user_id = $2", categoryID, userID)
	return err
}

// --- Products ---

func (r *NanoBaristaRepository) CreateProduct(ctx context.Context, userID string, req *models.CreateProductRequest) (*models.Product, error) {
	const q = `
		INSERT INTO products (user_id, category_id, name, price, description)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, category_id, name, price, COALESCE(description,''), COALESCE(image_url,''), created_at`
	p := &models.Product{}
	err := r.pool.QueryRow(ctx, q, userID, req.CategoryID, req.Name, req.Price, req.Description).Scan(
		&p.ID, &p.UserID, &p.CategoryID, &p.Name, &p.Price, &p.Description, &p.ImageURL, &p.CreatedAt,
	)
	return p, err
}

func (r *NanoBaristaRepository) ListProducts(ctx context.Context, userID string) ([]*models.Product, error) {
	const q = `
		SELECT id, user_id, category_id, name, price, COALESCE(description,''), COALESCE(image_url,''), created_at 
		FROM products WHERE user_id = $1 ORDER BY name ASC`
	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var prods []*models.Product
	for rows.Next() {
		p := &models.Product{}
		if err := rows.Scan(&p.ID, &p.UserID, &p.CategoryID, &p.Name, &p.Price, &p.Description, &p.ImageURL, &p.CreatedAt); err != nil {
			return nil, err
		}
		prods = append(prods, p)
	}
	return prods, rows.Err()
}

func (r *NanoBaristaRepository) UpdateProduct(ctx context.Context, productID, userID string, req *models.CreateProductRequest) (*models.Product, error) {
	const q = `
		UPDATE products SET category_id = $1, name = $2, price = $3, description = $4
		WHERE id = $5 AND user_id = $6
		RETURNING id, user_id, category_id, name, price, COALESCE(description,''), COALESCE(image_url,''), created_at`
	p := &models.Product{}
	err := r.pool.QueryRow(ctx, q, req.CategoryID, req.Name, req.Price, req.Description, productID, userID).Scan(
		&p.ID, &p.UserID, &p.CategoryID, &p.Name, &p.Price, &p.Description, &p.ImageURL, &p.CreatedAt,
	)
	return p, err
}

func (r *NanoBaristaRepository) DeleteProduct(ctx context.Context, productID, userID string) error {
	_, err := r.pool.Exec(ctx, "DELETE FROM products WHERE id = $1 AND user_id = $2", productID, userID)
	return err
}
