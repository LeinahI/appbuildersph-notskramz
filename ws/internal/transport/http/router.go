package http

import (
	"database/sql"
	"net/http"

	httpSwagger "github.com/swaggo/http-swagger/v2"

	appconv "github.com/yourorg/ws/internal/application/conversation"
	"github.com/yourorg/ws/internal/application/registration"
	"github.com/yourorg/ws/internal/config"
	"github.com/yourorg/ws/internal/infrastructure/postgres"
	pkgauth "github.com/yourorg/ws/internal/pkg/auth"
	"github.com/yourorg/ws/internal/pkg/crypto"
	"github.com/yourorg/ws/internal/transport/http/middleware"
)

func NewRouter(cfg *config.Config, db *sql.DB) (http.Handler, error) {
	box, err := crypto.NewBox(cfg.PIIEncryptionKey)
	if err != nil {
		return nil, err
	}
	tokens, err := pkgauth.NewTokenizer(cfg.JWTSecret, 0)
	if err != nil {
		return nil, err
	}

	mux := http.NewServeMux()

	userRepo := postgres.NewUserRepository(db, box)
	inviteRepo := postgres.NewInviteRepository(db)
	auditRepo := postgres.NewAuditRepository(db)
	regSvc := registration.NewService(userRepo, inviteRepo, auditRepo, tokens, cfg.ClaimBaseURL)
	reg := NewRegistrationHandler(regSvc)
	adminOnly := middleware.AdminAuth(tokens)
	farmerOnly := middleware.UserAuth(tokens)

	convRepo := postgres.NewConversationRepository(db)
	convSvc := appconv.NewService(convRepo)
	convs := NewConversationHandler(convSvc)

	mux.HandleFunc("GET /up", Health(db))

	mux.HandleFunc("POST /api/v1/auth/login", reg.Login)
	mux.Handle("GET /api/v1/auth/me", adminOnly(http.HandlerFunc(reg.Me)))
	mux.Handle("POST /api/v1/users", adminOnly(http.HandlerFunc(reg.Register)))
	mux.Handle("GET /api/v1/users", adminOnly(http.HandlerFunc(reg.ListUsers)))
	mux.Handle("GET /api/v1/users/{id}", adminOnly(http.HandlerFunc(reg.GetUser)))
	mux.Handle("POST /api/v1/users/{id}/invites", adminOnly(http.HandlerFunc(reg.CreateInvite)))
	mux.Handle("POST /api/v1/users/{id}/invites/regenerate", adminOnly(http.HandlerFunc(reg.RegenerateInvite)))
	mux.Handle("POST /api/v1/users/{id}/revoke", adminOnly(http.HandlerFunc(reg.RevokeUser)))
	mux.Handle("POST /api/v1/invites/{id}/revoke", adminOnly(http.HandlerFunc(reg.RevokeInvite)))
	mux.Handle("GET /api/v1/audit", adminOnly(http.HandlerFunc(reg.ListAudit)))
	mux.HandleFunc("POST /api/v1/invites/claim", reg.Claim)

	mux.Handle("GET /api/v1/conversations", farmerOnly(http.HandlerFunc(convs.List)))
	mux.Handle("POST /api/v1/conversations", farmerOnly(http.HandlerFunc(convs.Create)))
	mux.Handle("PATCH /api/v1/conversations/{id}", farmerOnly(http.HandlerFunc(convs.Patch)))
	mux.Handle("DELETE /api/v1/conversations/{id}", farmerOnly(http.HandlerFunc(convs.Delete)))
	mux.Handle("GET /api/v1/conversations/{id}/messages", farmerOnly(http.HandlerFunc(convs.ListMessages)))
	mux.Handle("PUT /api/v1/conversations/{id}/messages", farmerOnly(http.HandlerFunc(convs.PutMessages)))

	if cfg.IsDevelopment() {
		mux.Handle("/swagger/", httpSwagger.Handler(
			httpSwagger.URL("/swagger/doc.json"),
		))
	}

	var h http.Handler = mux
	h = middleware.Logging(h)
	h = middleware.CORS(cfg, h)
	return h, nil
}
