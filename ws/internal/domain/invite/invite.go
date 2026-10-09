package invite

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"time"

	"github.com/google/uuid"
)

const DefaultTTL = 24 * time.Hour

type Invite struct {
	id         string
	userID     string
	token      string
	singleUse  bool
	expiresAt  time.Time
	consumedAt *time.Time
	revokedAt  *time.Time
	createdAt  time.Time
}

func New(userID string, ttl time.Duration) (*Invite, error) {
	if userID == "" {
		return nil, ErrInvalidToken
	}
	if ttl <= 0 {
		ttl = DefaultTTL
	}
	token, err := randomToken(32)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	return &Invite{
		id:        uuid.NewString(),
		userID:    userID,
		token:     token,
		singleUse: true,
		expiresAt: now.Add(ttl),
		createdAt: now,
	}, nil
}

func Reconstruct(
	id, userID, token string,
	singleUse bool,
	expiresAt time.Time,
	consumedAt, revokedAt *time.Time,
	createdAt time.Time,
) *Invite {
	return &Invite{
		id:         id,
		userID:     userID,
		token:      token,
		singleUse:  singleUse,
		expiresAt:  expiresAt,
		consumedAt: consumedAt,
		revokedAt:  revokedAt,
		createdAt:  createdAt,
	}
}

func randomToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func (i *Invite) Consume(now time.Time) error {
	if i.revokedAt != nil {
		return ErrInviteRevoked
	}
	if i.consumedAt != nil {
		return ErrInviteConsumed
	}
	if !now.Before(i.expiresAt) {
		return ErrInviteExpired
	}
	t := now.UTC()
	i.consumedAt = &t
	return nil
}

func (i *Invite) Revoke(now time.Time) error {
	if i.revokedAt != nil {
		return ErrInviteRevoked
	}
	if i.consumedAt != nil {
		return ErrInviteConsumed
	}
	t := now.UTC()
	i.revokedAt = &t
	return nil
}

func (i *Invite) ID() string             { return i.id }
func (i *Invite) UserID() string         { return i.userID }
func (i *Invite) Token() string          { return i.token }
func (i *Invite) SingleUse() bool        { return i.singleUse }
func (i *Invite) ExpiresAt() time.Time   { return i.expiresAt }
func (i *Invite) ConsumedAt() *time.Time { return i.consumedAt }
func (i *Invite) RevokedAt() *time.Time  { return i.revokedAt }
func (i *Invite) CreatedAt() time.Time   { return i.createdAt }

type Repository interface {
	Save(ctx context.Context, inv *Invite) error
	Update(ctx context.Context, inv *Invite) error
	FindByID(ctx context.Context, id string) (*Invite, error)
	FindByToken(ctx context.Context, token string) (*Invite, error)
	FindActiveByUserID(ctx context.Context, userID string) (*Invite, error)
}
