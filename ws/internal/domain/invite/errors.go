package invite

import "errors"

var (
	ErrNotFound       = errors.New("invite not found")
	ErrInviteExpired  = errors.New("invite expired")
	ErrInviteConsumed = errors.New("invite already used")
	ErrInviteRevoked  = errors.New("invite revoked")
	ErrInvalidToken   = errors.New("invalid invite token")
)
