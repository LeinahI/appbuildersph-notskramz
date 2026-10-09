package seeder

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"

	"github.com/yourorg/ws/internal/application/registration"
	"github.com/yourorg/ws/internal/config"
	"github.com/yourorg/ws/internal/domain/admin"
)

type Seeder interface {
	Name() string
	Run(ctx context.Context) error
}

type Deps struct {
	DB        *sql.DB
	AppCfg    *config.Config
	SeederCfg *config.SeederConfig
}

func RunAll(ctx context.Context, deps Deps) error {
	seeders := []Seeder{
		NewAdminSeeder(deps),
	}

	for _, s := range seeders {
		if err := s.Run(ctx); err != nil {
			return fmt.Errorf("seeder %s: %w", s.Name(), err)
		}
	}
	return nil
}

type adminSeeder struct {
	db    *sql.DB
	admin config.SeederAdmin
}

func NewAdminSeeder(deps Deps) Seeder {
	adminCfg := config.SeederAdmin{}
	if deps.SeederCfg != nil {
		adminCfg = deps.SeederCfg.Admin
	}
	return &adminSeeder{db: deps.DB, admin: adminCfg}
}

func (s *adminSeeder) Name() string { return "admin" }

func (s *adminSeeder) Run(ctx context.Context) error {
	email := strings.TrimSpace(strings.ToLower(s.admin.Email))
	password := s.admin.Password
	name := strings.TrimSpace(s.admin.Name)
	if email == "" || password == "" {
		return fmt.Errorf("admin seeder: email and password are required in configs/seeder.yaml")
	}
	if name == "" {
		name = "Ugatan Admin"
	}

	var exists bool
	if err := s.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM admins WHERE email = $1)`, email).Scan(&exists); err != nil {
		return err
	}
	if exists {
		fmt.Fprintf(os.Stderr, "admin %s already present, skip\n", email)
		return nil
	}
	hash, err := registration.HashPassword(password)
	if err != nil {
		return err
	}
	a, err := admin.New(admin.NewInput{
		Email:        email,
		PasswordHash: hash,
		FullName:     name,
	})
	if err != nil {
		return err
	}
	repo := postgresAdminSaver{db: s.db}
	if err := repo.Save(ctx, a); err != nil {
		return err
	}
	fmt.Fprintf(os.Stderr, "seeded admin %s (%s)\n", email, name)
	return nil
}

// Avoid importing infrastructure from seeders: thin insert matching AdminRepository.Save.
type postgresAdminSaver struct{ db *sql.DB }

func (r postgresAdminSaver) Save(ctx context.Context, a *admin.Admin) error {
	const q = `
		INSERT INTO admins (id, email, password_hash, full_name, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
	`
	_, err := r.db.ExecContext(ctx, q,
		a.ID(), a.Email(), a.PasswordHash(), a.FullName(), string(a.Status()),
		a.CreatedAt(), a.UpdatedAt(),
	)
	return err
}
