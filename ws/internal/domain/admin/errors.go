package admin

import "errors"

var (
	ErrNotFound           = errors.New("admin not found")
	ErrInvalidEmail       = errors.New("invalid admin email")
	ErrInvalidPassword    = errors.New("invalid admin password")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUnauthorized       = errors.New("unauthorized")
)
