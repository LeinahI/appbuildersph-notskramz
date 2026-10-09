package user

import "errors"

var (
	ErrNotFound           = errors.New("user not found")
	ErrInvalidName        = errors.New("name is required")
	ErrIncompleteAddress  = errors.New("address is incomplete")
	ErrUnderage           = errors.New("user must be at least 18 years old")
	ErrInvalidRole        = errors.New("role must be admin or user")
	ErrInvalidStatus      = errors.New("invalid user status")
	ErrDuplicateUser      = errors.New("user already registered")
	ErrUnauthorized       = errors.New("unauthorized")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrNotPending         = errors.New("user is not pending")
	ErrAlreadyClaimed     = errors.New("user already claimed")
	ErrRevoked            = errors.New("user is revoked")
)
