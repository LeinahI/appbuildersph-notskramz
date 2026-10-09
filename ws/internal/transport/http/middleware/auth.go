package middleware

import (
	"context"
	"net/http"

	pkgauth "github.com/yourorg/ws/internal/pkg/auth"
	"github.com/yourorg/ws/internal/transport/http/response"
)

type ctxKey string

const ClaimsKey ctxKey = "claims"

func AdminAuth(tokens *pkgauth.Tokenizer) func(http.Handler) http.Handler {
	return roleAuth(tokens, "admin")
}

// UserAuth requires a farmer JWT (role=user) from QR claim.
func UserAuth(tokens *pkgauth.Tokenizer) func(http.Handler) http.Handler {
	return roleAuth(tokens, "user")
}

func roleAuth(tokens *pkgauth.Tokenizer, role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			raw, err := pkgauth.Bearer(r.Header.Get("Authorization"))
			if err != nil {
				response.Error(w, http.StatusUnauthorized, "missing bearer token")
				return
			}
			claims, err := tokens.Parse(raw)
			if err != nil || claims.Role != role {
				response.Error(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			ctx := context.WithValue(r.Context(), ClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func ClaimsFrom(ctx context.Context) *pkgauth.Claims {
	c, _ := ctx.Value(ClaimsKey).(*pkgauth.Claims)
	return c
}
