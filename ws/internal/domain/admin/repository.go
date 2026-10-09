package admin

import "context"

type Repository interface {
	Save(ctx context.Context, a *Admin) error
	FindByID(ctx context.Context, id string) (*Admin, error)
	FindByEmail(ctx context.Context, email string) (*Admin, error)
}
