package seeder

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"

	"github.com/yourorg/ws/internal/application/registration"
	"github.com/yourorg/ws/internal/config"
	"github.com/yourorg/ws/internal/domain/user"
	"github.com/yourorg/ws/internal/pkg/crypto"
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
	db        *sql.DB
	app       *config.Config
	admin     config.SeederAdmin
}

func NewAdminSeeder(deps Deps) Seeder {
	admin := config.SeederAdmin{}
	if deps.SeederCfg != nil {
		admin = deps.SeederCfg.Admin
	}
	return &adminSeeder{db: deps.DB, app: deps.AppCfg, admin: admin}
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
	if s.app == nil {
		return fmt.Errorf("admin seeder: app config required for PII encryption")
	}

	box, err := crypto.NewBox(s.app.PIIEncryptionKey)
	if err != nil {
		return err
	}
	var exists bool
	if err := s.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`, email).Scan(&exists); err != nil {
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
	u, err := user.New(user.NewInput{
		Role:         user.RoleAdmin,
		Email:        email,
		PasswordHash: hash,
		FullName:     name,
	})
	if err != nil {
		return err
	}
	nameEnc, err := box.Encrypt(u.FullName())
	if err != nil {
		return err
	}
	const q = `
		INSERT INTO users (id, role, status, email, password_hash, full_name_enc, birth_date_enc, address_enc, phone_enc, id_number_hash, device_id, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,'','','','','',$7,$8)
	`
	_, err = s.db.ExecContext(ctx, q, u.ID(), string(u.Role()), string(u.Status()), u.Email(), u.PasswordHash(), nameEnc, u.CreatedAt(), u.UpdatedAt())
	if err != nil {
		return err
	}
	fmt.Fprintf(os.Stderr, "seeded admin %s (%s)\n", email, name)
	return nil
}
