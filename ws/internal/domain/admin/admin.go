package admin

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

type Status string

const (
	StatusActive  Status = "active"
	StatusRevoked Status = "revoked"
)

// Admin is a staff account that may sign in to the registration console.
// Farmers are not admins and never use this aggregate.
type Admin struct {
	id           string
	email        string
	passwordHash string
	fullName     string
	status       Status
	createdAt    time.Time
	updatedAt    time.Time
}

type NewInput struct {
	Email        string
	PasswordHash string
	FullName     string
}

func New(in NewInput) (*Admin, error) {
	email := strings.TrimSpace(strings.ToLower(in.Email))
	if email == "" || !strings.Contains(email, "@") {
		return nil, ErrInvalidEmail
	}
	if strings.TrimSpace(in.PasswordHash) == "" {
		return nil, ErrInvalidPassword
	}
	name := strings.TrimSpace(in.FullName)
	if name == "" {
		name = email
	}
	now := time.Now().UTC()
	return &Admin{
		id:           uuid.NewString(),
		email:        email,
		passwordHash: in.PasswordHash,
		fullName:     name,
		status:       StatusActive,
		createdAt:    now,
		updatedAt:    now,
	}, nil
}

func Reconstruct(id, email, passwordHash, fullName string, status Status, createdAt, updatedAt time.Time) *Admin {
	return &Admin{
		id: id, email: email, passwordHash: passwordHash, fullName: fullName,
		status: status, createdAt: createdAt, updatedAt: updatedAt,
	}
}

func (a *Admin) ID() string           { return a.id }
func (a *Admin) Email() string        { return a.email }
func (a *Admin) PasswordHash() string { return a.passwordHash }
func (a *Admin) FullName() string     { return a.fullName }
func (a *Admin) Status() Status       { return a.status }
func (a *Admin) CreatedAt() time.Time { return a.createdAt }
func (a *Admin) UpdatedAt() time.Time { return a.updatedAt }

func (a *Admin) CanLogin() bool {
	return a != nil && a.status == StatusActive && a.passwordHash != ""
}
