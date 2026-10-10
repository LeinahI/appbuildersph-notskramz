package user

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
)

const MinAge = 18

type Role string

const (
	RoleUser Role = "user"
)

type Status string

const (
	StatusPending Status = "pending"
	StatusActive  Status = "active"
	StatusRevoked Status = "revoked"
)

type Address struct {
	Line1      string
	Line2      string
	Barangay   string
	City       string
	Province   string
	PostalCode string
}

func (a Address) Complete() bool {
	return strings.TrimSpace(a.Line1) != "" &&
		strings.TrimSpace(a.Barangay) != "" &&
		strings.TrimSpace(a.City) != "" &&
		strings.TrimSpace(a.Province) != ""
}

// User is a farmer registration record. No email/password — access is via QR claim.
type User struct {
	id           string
	role         Role
	status       Status
	fullName     string
	birthDate    time.Time
	address      Address
	phone        string
	idNumberHash string // SHA-256 hex of normalized government ID; empty if none
	deviceID     string // set on QR claim
	consentAt    *time.Time
	createdAt    time.Time
	updatedAt    time.Time
}

type NewInput struct {
	Role         Role
	FullName     string
	BirthDate    time.Time
	Address      Address
	Phone        string
	IDNumberHash string
	ConsentAt    *time.Time
}

func New(in NewInput) (*User, error) {
	name := strings.TrimSpace(in.FullName)
	if name == "" {
		return nil, ErrInvalidName
	}
	if in.Role != RoleUser {
		return nil, ErrInvalidRole
	}
	if !in.Address.Complete() {
		return nil, ErrIncompleteAddress
	}
	if ageYears(in.BirthDate, time.Now().UTC()) < MinAge {
		return nil, ErrUnderage
	}
	now := time.Now().UTC()
	return &User{
		id:           uuid.NewString(),
		role:         in.Role,
		status:       StatusPending,
		fullName:     name,
		birthDate:    in.BirthDate.UTC(),
		address:      in.Address,
		phone:        strings.TrimSpace(in.Phone),
		idNumberHash: strings.TrimSpace(in.IDNumberHash),
		consentAt:    in.ConsentAt,
		createdAt:    now,
		updatedAt:    now,
	}, nil
}

func Reconstruct(
	id string,
	role Role,
	status Status,
	fullName string,
	birthDate time.Time,
	address Address,
	phone, idNumberHash, deviceID string,
	consentAt *time.Time,
	createdAt, updatedAt time.Time,
) *User {
	return &User{
		id:           id,
		role:         role,
		status:       status,
		fullName:     fullName,
		birthDate:    birthDate,
		address:      address,
		phone:        phone,
		idNumberHash: idNumberHash,
		deviceID:     deviceID,
		consentAt:    consentAt,
		createdAt:    createdAt,
		updatedAt:    updatedAt,
	}
}

func ageYears(birth, now time.Time) int {
	years := now.Year() - birth.Year()
	if now.YearDay() < birth.YearDay() {
		years--
	}
	return years
}

func (u *User) Activate() error {
	if u.status == StatusRevoked {
		return ErrRevoked
	}
	u.status = StatusActive
	u.updatedAt = time.Now().UTC()
	return nil
}

func (u *User) Revoke() error {
	u.status = StatusRevoked
	u.updatedAt = time.Now().UTC()
	return nil
}

// MarkClaimed links a device to this farmer. A later claim with a valid invite
// may re-bind to a new device (another phone/browser) so QR redo still works.
func (u *User) MarkClaimed(deviceID string) error {
	if u.status == StatusRevoked {
		return ErrRevoked
	}
	deviceID = strings.TrimSpace(deviceID)
	if deviceID == "" {
		return ErrUnauthorized
	}
	u.deviceID = deviceID
	u.status = StatusActive
	u.updatedAt = time.Now().UTC()
	return nil
}

// Rename updates the farmer's display name (non-empty after trim).
func (u *User) Rename(fullName string) error {
	if u.status == StatusRevoked {
		return ErrRevoked
	}
	name := strings.TrimSpace(fullName)
	if name == "" {
		return ErrInvalidName
	}
	u.fullName = name
	u.updatedAt = time.Now().UTC()
	return nil
}

func (u *User) ID() string            { return u.id }
func (u *User) Role() Role            { return u.role }
func (u *User) Status() Status        { return u.status }
func (u *User) FullName() string      { return u.fullName }
func (u *User) BirthDate() time.Time  { return u.birthDate }
func (u *User) Address() Address      { return u.address }
func (u *User) Phone() string         { return u.phone }
func (u *User) IDNumberHash() string  { return u.idNumberHash }
func (u *User) DeviceID() string      { return u.deviceID }
func (u *User) ConsentAt() *time.Time { return u.consentAt }
func (u *User) CreatedAt() time.Time  { return u.createdAt }
func (u *User) UpdatedAt() time.Time  { return u.updatedAt }
func (u *User) Age() int              { return ageYears(u.birthDate, time.Now().UTC()) }

type ListFilter struct {
	Query  string
	Role   Role
	Status Status
	Limit  int
}

// Stats are the counts the staff overview shows. Today is the Philippine calendar day.
type Stats struct {
	Total   int
	Active  int
	Pending int
	Revoked int
	Today   int
}

type Repository interface {
	Save(ctx context.Context, u *User) error
	Update(ctx context.Context, u *User) error
	FindByID(ctx context.Context, id string) (*User, error)
	FindByIDNumberHash(ctx context.Context, hash string) (*User, error)
	FindByDeviceID(ctx context.Context, deviceID string) (*User, error)
	List(ctx context.Context, filter ListFilter) ([]*User, error)
	Stats(ctx context.Context) (Stats, error)
}
