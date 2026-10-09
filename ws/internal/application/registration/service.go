package registration

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/yourorg/ws/internal/domain/audit"
	"github.com/yourorg/ws/internal/domain/invite"
	"github.com/yourorg/ws/internal/domain/user"
	pkgauth "github.com/yourorg/ws/internal/pkg/auth"
	"github.com/yourorg/ws/internal/pkg/crypto"
)

type Service struct {
	users   user.Repository
	invites invite.Repository
	audits  audit.Repository
	tokens  *pkgauth.Tokenizer
	claimBaseURL string
}

func NewService(
	users user.Repository,
	invites invite.Repository,
	audits audit.Repository,
	tokens *pkgauth.Tokenizer,
	claimBaseURL string,
) *Service {
	return &Service{
		users: users, invites: invites, audits: audits, tokens: tokens,
		claimBaseURL: strings.TrimRight(claimBaseURL, "/"),
	}
}

type LoginInput struct {
	Email    string
	Password string
}

type LoginResult struct {
	Token string
	User  *user.User
}

func (s *Service) Login(ctx context.Context, in LoginInput) (*LoginResult, error) {
	u, err := s.users.FindByEmail(ctx, in.Email)
	if err != nil {
		if errors.Is(err, user.ErrNotFound) {
			return nil, user.ErrInvalidCredentials
		}
		return nil, err
	}
	if u.Role() != user.RoleAdmin || u.Status() != user.StatusActive {
		return nil, user.ErrUnauthorized
	}
	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash()), []byte(in.Password)) != nil {
		return nil, user.ErrInvalidCredentials
	}
	tok, err := s.tokens.Issue(u.ID(), string(u.Role()))
	if err != nil {
		return nil, err
	}
	_ = s.append(ctx, audit.EventAdminLogin, u.ID(), u.ID(), nil)
	return &LoginResult{Token: tok, User: u}, nil
}

func (s *Service) Me(ctx context.Context, userID string) (*user.User, error) {
	u, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if u.Role() != user.RoleAdmin {
		return nil, user.ErrUnauthorized
	}
	return u, nil
}

type RegisterInput struct {
	FullName     string
	BirthDate    time.Time
	Address      user.Address
	Phone        string
	IDNumber     string
	ConsentAt    *time.Time
	AdminID      string
}

func (s *Service) RegisterUser(ctx context.Context, in RegisterInput) (*user.User, error) {
	hash := crypto.HashIDNumber(in.IDNumber)
	if hash != "" {
		if existing, err := s.users.FindByIDNumberHash(ctx, hash); err == nil && existing != nil {
			return nil, user.ErrDuplicateUser
		} else if err != nil && !errors.Is(err, user.ErrNotFound) {
			return nil, err
		}
	}
	u, err := user.New(user.NewInput{
		Role:         user.RoleUser,
		FullName:     in.FullName,
		BirthDate:    in.BirthDate,
		Address:      in.Address,
		Phone:        in.Phone,
		IDNumberHash: hash,
		ConsentAt:    in.ConsentAt,
	})
	if err != nil {
		return nil, err
	}
	if err := s.users.Save(ctx, u); err != nil {
		return nil, fmt.Errorf("save user: %w", err)
	}
	_ = s.append(ctx, audit.EventUserRegistered, in.AdminID, u.ID(), map[string]any{"has_id_hash": hash != ""})
	return u, nil
}

func (s *Service) ListUsers(ctx context.Context, filter user.ListFilter) ([]*user.User, error) {
	return s.users.List(ctx, filter)
}

func (s *Service) GetUser(ctx context.Context, id string) (*user.User, error) {
	return s.users.FindByID(ctx, id)
}

type InviteResult struct {
	Invite   *invite.Invite
	ClaimURL string
}

func (s *Service) CreateInvite(ctx context.Context, adminID, userID string, ttl time.Duration) (*InviteResult, error) {
	u, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if u.Role() != user.RoleUser {
		return nil, user.ErrUnauthorized
	}
	if u.Status() == user.StatusRevoked {
		return nil, user.ErrRevoked
	}
	// Revoke any previous active invite
	if old, err := s.invites.FindActiveByUserID(ctx, userID); err == nil {
		_ = old.Revoke(time.Now().UTC())
		_ = s.invites.Update(ctx, old)
	} else if !errors.Is(err, invite.ErrNotFound) {
		return nil, err
	}
	inv, err := invite.New(userID, ttl)
	if err != nil {
		return nil, err
	}
	if err := s.invites.Save(ctx, inv); err != nil {
		return nil, err
	}
	_ = s.append(ctx, audit.EventInviteCreated, adminID, userID, map[string]any{"invite_id": inv.ID()})
	return &InviteResult{Invite: inv, ClaimURL: s.claimURL(inv.Token())}, nil
}

func (s *Service) RegenerateInvite(ctx context.Context, adminID, userID string, ttl time.Duration) (*InviteResult, error) {
	res, err := s.CreateInvite(ctx, adminID, userID, ttl)
	if err != nil {
		return nil, err
	}
	_ = s.append(ctx, audit.EventInviteRegenerated, adminID, userID, map[string]any{"invite_id": res.Invite.ID()})
	return res, nil
}

func (s *Service) RevokeInvite(ctx context.Context, adminID, inviteID string) error {
	inv, err := s.invites.FindByID(ctx, inviteID)
	if err != nil {
		return err
	}
	if err := inv.Revoke(time.Now().UTC()); err != nil {
		return err
	}
	if err := s.invites.Update(ctx, inv); err != nil {
		return err
	}
	_ = s.append(ctx, audit.EventInviteRevoked, adminID, inv.UserID(), map[string]any{"invite_id": inv.ID()})
	return nil
}

type ClaimInput struct {
	Token    string
	DeviceID string
}

type ClaimResult struct {
	UserID string
	Token  string // farmer session JWT (role user)
}

func (s *Service) ClaimInvite(ctx context.Context, in ClaimInput) (*ClaimResult, error) {
	inv, err := s.invites.FindByToken(ctx, strings.TrimSpace(in.Token))
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	// Reject used/expired/revoked invites before touching the user.
	if err := inv.Consume(now); err != nil {
		return nil, err
	}
	u, err := s.users.FindByID(ctx, inv.UserID())
	if err != nil {
		return nil, err
	}
	if err := u.MarkClaimed(in.DeviceID); err != nil {
		return nil, err
	}
	if err := s.users.Update(ctx, u); err != nil {
		return nil, err
	}
	if err := s.invites.Update(ctx, inv); err != nil {
		return nil, err
	}
	tok, err := s.tokens.Issue(u.ID(), string(u.Role()))
	if err != nil {
		return nil, err
	}
	_ = s.append(ctx, audit.EventInviteClaimed, u.ID(), u.ID(), map[string]any{"invite_id": inv.ID()})
	return &ClaimResult{UserID: u.ID(), Token: tok}, nil
}

func (s *Service) RevokeUser(ctx context.Context, adminID, userID string) error {
	u, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return err
	}
	if err := u.Revoke(); err != nil {
		return err
	}
	if err := s.users.Update(ctx, u); err != nil {
		return err
	}
	if old, err := s.invites.FindActiveByUserID(ctx, userID); err == nil {
		_ = old.Revoke(time.Now().UTC())
		_ = s.invites.Update(ctx, old)
	}
	_ = s.append(ctx, audit.EventUserRevoked, adminID, userID, nil)
	return nil
}

func (s *Service) ListAudit(ctx context.Context, limit int) ([]*audit.Event, error) {
	return s.audits.List(ctx, audit.ListFilter{Limit: limit})
}

func (s *Service) ActiveInvite(ctx context.Context, userID string) (*InviteResult, error) {
	inv, err := s.invites.FindActiveByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &InviteResult{Invite: inv, ClaimURL: s.claimURL(inv.Token())}, nil
}

func (s *Service) claimURL(token string) string {
	base := s.claimBaseURL
	if base == "" {
		base = "http://localhost:3000"
	}
	return base + "/claim?token=" + token
}

func (s *Service) append(ctx context.Context, eventType, actor, subject string, meta map[string]any) error {
	e, err := audit.New(eventType, actor, subject, meta)
	if err != nil {
		return err
	}
	return s.audits.Append(ctx, e)
}

func HashPassword(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(b), err
}
