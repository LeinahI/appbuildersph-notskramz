package conversation

import "errors"

var (
	ErrNotFound     = errors.New("conversation not found")
	ErrUnauthorized = errors.New("unauthorized")
	ErrInvalidTitle = errors.New("title is required")
	ErrInvalidRole  = errors.New("message role must be user or assistant")
	ErrEmptyBody    = errors.New("message body is required")
)
