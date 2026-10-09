package postgres

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/yourorg/ws/internal/domain/admin"
)

type AdminRepository struct {
	db *sql.DB
}

func NewAdminRepository(db *sql.DB) *AdminRepository {
	return &AdminRepository{db: db}
}

func (r *AdminRepository) Save(ctx context.Context, a *admin.Admin) error {
	const q = `
		INSERT INTO admins (id, email, password_hash, full_name, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT (id) DO UPDATE SET
			email = EXCLUDED.email,
			password_hash = EXCLUDED.password_hash,
			full_name = EXCLUDED.full_name,
			status = EXCLUDED.status,
			updated_at = EXCLUDED.updated_at
	`
	_, err := r.db.ExecContext(ctx, q,
		a.ID(), a.Email(), a.PasswordHash(), a.FullName(), string(a.Status()),
		a.CreatedAt(), a.UpdatedAt(),
	)
	return err
}

func (r *AdminRepository) FindByID(ctx context.Context, id string) (*admin.Admin, error) {
	return r.scanOne(ctx, `SELECT id, email, password_hash, full_name, status, created_at, updated_at FROM admins WHERE id=$1`, id)
}

func (r *AdminRepository) FindByEmail(ctx context.Context, email string) (*admin.Admin, error) {
	return r.scanOne(ctx, `SELECT id, email, password_hash, full_name, status, created_at, updated_at FROM admins WHERE email=$1`, strings.ToLower(strings.TrimSpace(email)))
}

func (r *AdminRepository) scanOne(ctx context.Context, q string, arg any) (*admin.Admin, error) {
	var (
		id, email, passHash, fullName, status string
		created, updated                      time.Time
	)
	err := r.db.QueryRowContext(ctx, q, arg).Scan(&id, &email, &passHash, &fullName, &status, &created, &updated)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, admin.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return admin.Reconstruct(id, email, passHash, fullName, admin.Status(status), created.UTC(), updated.UTC()), nil
}
