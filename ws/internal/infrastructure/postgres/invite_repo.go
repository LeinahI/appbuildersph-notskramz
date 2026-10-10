package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/yourorg/ws/internal/domain/invite"
)

type InviteRepository struct {
	db *sql.DB
}

func NewInviteRepository(db *sql.DB) *InviteRepository {
	return &InviteRepository{db: db}
}

func (r *InviteRepository) Save(ctx context.Context, inv *invite.Invite) error {
	const q = `
		INSERT INTO invites (id, user_id, token, single_use, expires_at, consumed_at, revoked_at, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
	`
	_, err := r.db.ExecContext(ctx, q,
		inv.ID(), inv.UserID(), inv.Token(), inv.SingleUse(), inv.ExpiresAt(),
		nullTime(inv.ConsumedAt()), nullTime(inv.RevokedAt()), inv.CreatedAt(),
	)
	if err != nil {
		return fmt.Errorf("insert invite: %w", err)
	}
	return nil
}

func (r *InviteRepository) Update(ctx context.Context, inv *invite.Invite) error {
	const q = `
		UPDATE invites SET consumed_at=$2, revoked_at=$3 WHERE id=$1
	`
	res, err := r.db.ExecContext(ctx, q, inv.ID(), nullTime(inv.ConsumedAt()), nullTime(inv.RevokedAt()))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return invite.ErrNotFound
	}
	return nil
}

func (r *InviteRepository) FindByID(ctx context.Context, id string) (*invite.Invite, error) {
	return r.scanOne(ctx, `SELECT id, user_id, token, single_use, expires_at, consumed_at, revoked_at, created_at FROM invites WHERE id=$1`, id)
}

func (r *InviteRepository) FindByToken(ctx context.Context, token string) (*invite.Invite, error) {
	return r.scanOne(ctx, `SELECT id, user_id, token, single_use, expires_at, consumed_at, revoked_at, created_at FROM invites WHERE token=$1`, token)
}

func (r *InviteRepository) FindActiveByUserID(ctx context.Context, userID string) (*invite.Invite, error) {
	const q = `
		SELECT id, user_id, token, single_use, expires_at, consumed_at, revoked_at, created_at
		FROM invites
		WHERE user_id=$1 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1
	`
	return r.scanOne(ctx, q, userID)
}

func (r *InviteRepository) FindNewestActive(ctx context.Context) (*invite.Invite, error) {
	const q = `
		SELECT id, user_id, token, single_use, expires_at, consumed_at, revoked_at, created_at
		FROM invites
		WHERE consumed_at IS NULL AND revoked_at IS NULL AND expires_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1
	`
	return r.scanOne(ctx, q)
}

func (r *InviteRepository) scanOne(ctx context.Context, q string, args ...any) (*invite.Invite, error) {
	var (
		id, userID, token string
		singleUse         bool
		expires, created  time.Time
		consumed, revoked sql.NullTime
	)
	err := r.db.QueryRowContext(ctx, q, args...).Scan(&id, &userID, &token, &singleUse, &expires, &consumed, &revoked, &created)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, invite.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	var cPtr, rPtr *time.Time
	if consumed.Valid {
		t := consumed.Time.UTC()
		cPtr = &t
	}
	if revoked.Valid {
		t := revoked.Time.UTC()
		rPtr = &t
	}
	return invite.Reconstruct(id, userID, token, singleUse, expires.UTC(), cPtr, rPtr, created.UTC()), nil
}
