package registration

import (
	"context"
	"testing"
	"time"

	"github.com/yourorg/ws/internal/domain/audit"
	"github.com/yourorg/ws/internal/domain/invite"
	"github.com/yourorg/ws/internal/domain/user"
)

func TestClaimURLIsHubApp(t *testing.T) {
	s := NewService(nil, nil, nil, nil, nil, "http://localhost:8787/")
	if got := s.claimURL("secret-token"); got != "http://localhost:8787/app" {
		t.Fatalf("claimURL = %q", got)
	}
	bare := NewService(nil, nil, nil, nil, nil, "")
	if got := bare.claimURL("secret-token"); got != "http://192.168.137.1:8787/app" {
		t.Fatalf("default claimURL = %q", got)
	}
}

func TestMarkDownloadedActivatesNewestInviteOnce(t *testing.T) {
	u, err := user.New(user.NewInput{
		Role:      user.RoleUser,
		FullName:  "Ana Cruz",
		BirthDate: time.Date(1990, 1, 2, 0, 0, 0, 0, time.UTC),
		Address:   user.Address{Line1: "1", Barangay: "B", City: "C", Province: "P"},
	})
	if err != nil {
		t.Fatal(err)
	}
	inv, err := invite.New(u.ID(), time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	users := &memUsers{u: u}
	invites := &memInvites{items: []*invite.Invite{inv}}
	audits := &memAudits{}
	svc := NewService(nil, users, invites, audits, nil, "http://localhost:8787")

	if err := svc.MarkDownloaded(context.Background()); err != nil {
		t.Fatal(err)
	}
	if u.Status() != user.StatusActive {
		t.Fatalf("status = %s", u.Status())
	}
	if inv.ConsumedAt() == nil {
		t.Fatal("invite was not consumed")
	}
	if users.updates != 1 || audits.n != 1 {
		t.Fatalf("updates=%d audits=%d", users.updates, audits.n)
	}
	if err := svc.MarkDownloaded(context.Background()); err != nil {
		t.Fatal(err)
	}
	if users.updates != 1 || audits.n != 1 {
		t.Fatalf("second call updates=%d audits=%d", users.updates, audits.n)
	}
}

type memUsers struct {
	u       *user.User
	updates int
}

func (m *memUsers) Save(context.Context, *user.User) error { return nil }
func (m *memUsers) Update(context.Context, *user.User) error {
	m.updates++
	return nil
}
func (m *memUsers) FindByID(context.Context, string) (*user.User, error) {
	if m.u == nil {
		return nil, user.ErrNotFound
	}
	return m.u, nil
}
func (m *memUsers) FindByIDNumberHash(context.Context, string) (*user.User, error) {
	return nil, user.ErrNotFound
}
func (m *memUsers) FindByDeviceID(context.Context, string) (*user.User, error) {
	return nil, user.ErrNotFound
}
func (m *memUsers) List(context.Context, user.ListFilter) ([]*user.User, error) { return nil, nil }
func (m *memUsers) Stats(context.Context) (user.Stats, error)                   { return user.Stats{}, nil }

type memInvites struct {
	items []*invite.Invite
}

func (m *memInvites) Save(context.Context, *invite.Invite) error   { return nil }
func (m *memInvites) Update(context.Context, *invite.Invite) error { return nil }
func (m *memInvites) FindByID(context.Context, string) (*invite.Invite, error) {
	return nil, invite.ErrNotFound
}
func (m *memInvites) FindByToken(context.Context, string) (*invite.Invite, error) {
	return nil, invite.ErrNotFound
}
func (m *memInvites) FindActiveByUserID(context.Context, string) (*invite.Invite, error) {
	return nil, invite.ErrNotFound
}
func (m *memInvites) FindNewestActive(context.Context) (*invite.Invite, error) {
	now := time.Now()
	var best *invite.Invite
	for _, inv := range m.items {
		if inv.ConsumedAt() != nil || inv.RevokedAt() != nil || !now.Before(inv.ExpiresAt()) {
			continue
		}
		if best == nil || inv.CreatedAt().After(best.CreatedAt()) {
			best = inv
		}
	}
	if best == nil {
		return nil, invite.ErrNotFound
	}
	return best, nil
}

type memAudits struct{ n int }

func (m *memAudits) Append(context.Context, *audit.Event) error {
	m.n++
	return nil
}
func (m *memAudits) List(context.Context, audit.ListFilter) ([]*audit.Event, error) {
	return nil, nil
}
