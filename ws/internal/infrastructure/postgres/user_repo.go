package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/yourorg/ws/internal/domain/user"
	"github.com/yourorg/ws/internal/pkg/crypto"
)

type UserRepository struct {
	db  *sql.DB
	box *crypto.Box
}

func NewUserRepository(db *sql.DB, box *crypto.Box) *UserRepository {
	return &UserRepository{db: db, box: box}
}

func (r *UserRepository) Save(ctx context.Context, u *user.User) error {
	nameEnc, birthEnc, addrEnc, phoneEnc, err := r.encryptPII(u)
	if err != nil {
		return err
	}
	const q = `
		INSERT INTO users (
			id, role, status, email, password_hash,
			full_name_enc, birth_date_enc, address_enc, phone_enc,
			id_number_hash, device_id, consent_at, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
	`
	_, err = r.db.ExecContext(ctx, q,
		u.ID(), string(u.Role()), string(u.Status()), u.Email(), u.PasswordHash(),
		nameEnc, birthEnc, addrEnc, phoneEnc,
		u.IDNumberHash(), u.DeviceID(), nullTime(u.ConsentAt()), u.CreatedAt(), u.UpdatedAt(),
	)
	if err != nil {
		return fmt.Errorf("insert user: %w", err)
	}
	return nil
}

func (r *UserRepository) Update(ctx context.Context, u *user.User) error {
	nameEnc, birthEnc, addrEnc, phoneEnc, err := r.encryptPII(u)
	if err != nil {
		return err
	}
	const q = `
		UPDATE users SET
			role=$2, status=$3, email=$4, password_hash=$5,
			full_name_enc=$6, birth_date_enc=$7, address_enc=$8, phone_enc=$9,
			id_number_hash=$10, device_id=$11, consent_at=$12, updated_at=$13
		WHERE id=$1
	`
	res, err := r.db.ExecContext(ctx, q,
		u.ID(), string(u.Role()), string(u.Status()), u.Email(), u.PasswordHash(),
		nameEnc, birthEnc, addrEnc, phoneEnc,
		u.IDNumberHash(), u.DeviceID(), nullTime(u.ConsentAt()), u.UpdatedAt(),
	)
	if err != nil {
		return fmt.Errorf("update user: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return user.ErrNotFound
	}
	return nil
}

func (r *UserRepository) FindByID(ctx context.Context, id string) (*user.User, error) {
	return r.scanOne(ctx, `SELECT `+userColumns+` FROM users WHERE id=$1`, id)
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*user.User, error) {
	return r.scanOne(ctx, `SELECT `+userColumns+` FROM users WHERE email=$1`, strings.ToLower(strings.TrimSpace(email)))
}

func (r *UserRepository) FindByIDNumberHash(ctx context.Context, hash string) (*user.User, error) {
	return r.scanOne(ctx, `SELECT `+userColumns+` FROM users WHERE id_number_hash=$1`, hash)
}

func (r *UserRepository) FindByDeviceID(ctx context.Context, deviceID string) (*user.User, error) {
	return r.scanOne(ctx, `SELECT `+userColumns+` FROM users WHERE device_id=$1`, deviceID)
}

func (r *UserRepository) List(ctx context.Context, filter user.ListFilter) ([]*user.User, error) {
	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	where := "WHERE role = 'user'"
	args := []any{}
	n := 1
	if filter.Status != "" {
		where += fmt.Sprintf(" AND status=$%d", n)
		args = append(args, string(filter.Status))
		n++
	}
	query := fmt.Sprintf(`SELECT %s FROM users %s ORDER BY created_at DESC LIMIT %d`, userColumns, where, limit)
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*user.User
	for rows.Next() {
		u, err := r.scanRow(rows)
		if err != nil {
			return nil, err
		}
		if q := strings.TrimSpace(strings.ToLower(filter.Query)); q != "" {
			if !strings.Contains(strings.ToLower(u.FullName()), q) && !strings.Contains(strings.ToLower(u.Phone()), q) {
				continue
			}
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

const userColumns = `id, role, status, email, password_hash, full_name_enc, birth_date_enc, address_enc, phone_enc, id_number_hash, device_id, consent_at, created_at, updated_at`

func (r *UserRepository) encryptPII(u *user.User) (nameEnc, birthEnc, addrEnc, phoneEnc string, err error) {
	nameEnc, err = r.box.Encrypt(u.FullName())
	if err != nil {
		return
	}
	if !u.BirthDate().IsZero() {
		birthEnc, err = r.box.Encrypt(u.BirthDate().Format(time.RFC3339))
		if err != nil {
			return
		}
	}
	addrEnc, err = r.box.EncryptJSON(u.Address())
	if err != nil {
		return
	}
	phoneEnc, err = r.box.Encrypt(u.Phone())
	return
}

type scannable interface {
	Scan(dest ...any) error
}

func (r *UserRepository) scanOne(ctx context.Context, q string, arg any) (*user.User, error) {
	row := r.db.QueryRowContext(ctx, q, arg)
	u, err := r.scanRow(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, user.ErrNotFound
	}
	return u, err
}

func (r *UserRepository) scanRow(row scannable) (*user.User, error) {
	var (
		id, role, status, email, passHash string
		nameEnc, birthEnc, addrEnc, phoneEnc string
		idHash, deviceID string
		consent sql.NullTime
		created, updated time.Time
	)
	if err := row.Scan(&id, &role, &status, &email, &passHash, &nameEnc, &birthEnc, &addrEnc, &phoneEnc, &idHash, &deviceID, &consent, &created, &updated); err != nil {
		return nil, err
	}
	name, err := r.box.Decrypt(nameEnc)
	if err != nil {
		return nil, err
	}
	phone, err := r.box.Decrypt(phoneEnc)
	if err != nil {
		return nil, err
	}
	var addr user.Address
	if err := r.box.DecryptJSON(addrEnc, &addr); err != nil {
		return nil, err
	}
	var birth time.Time
	if birthEnc != "" {
		s, err := r.box.Decrypt(birthEnc)
		if err != nil {
			return nil, err
		}
		birth, err = time.Parse(time.RFC3339, s)
		if err != nil {
			return nil, err
		}
	}
	var consentPtr *time.Time
	if consent.Valid {
		t := consent.Time.UTC()
		consentPtr = &t
	}
	return user.Reconstruct(id, user.Role(role), user.Status(status), email, passHash, name, birth, addr, phone, idHash, deviceID, consentPtr, created.UTC(), updated.UTC()), nil
}

func nullTime(t *time.Time) any {
	if t == nil {
		return nil
	}
	return *t
}
