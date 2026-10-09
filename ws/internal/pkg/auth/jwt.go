package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

var ErrInvalidToken = errors.New("invalid token")

type Claims struct {
	Sub  string `json:"sub"`
	Role string `json:"role"`
	Exp  int64  `json:"exp"`
}

type Tokenizer struct {
	secret []byte
	ttl    time.Duration
}

func NewTokenizer(secret string, ttl time.Duration) (*Tokenizer, error) {
	if len(strings.TrimSpace(secret)) < 16 {
		return nil, errors.New("JWT_SECRET must be at least 16 characters")
	}
	if ttl <= 0 {
		ttl = 12 * time.Hour
	}
	return &Tokenizer{secret: []byte(secret), ttl: ttl}, nil
}

func (t *Tokenizer) Issue(userID, role string) (string, error) {
	claims := Claims{
		Sub:  userID,
		Role: role,
		Exp:  time.Now().UTC().Add(t.ttl).Unix(),
	}
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	body := base64.RawURLEncoding.EncodeToString(payload)
	sig := t.sign(body)
	return body + "." + sig, nil
}

func (t *Tokenizer) Parse(token string) (*Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return nil, ErrInvalidToken
	}
	if t.sign(parts[0]) != parts[1] {
		return nil, ErrInvalidToken
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, ErrInvalidToken
	}
	var c Claims
	if err := json.Unmarshal(raw, &c); err != nil {
		return nil, ErrInvalidToken
	}
	if time.Now().UTC().Unix() > c.Exp {
		return nil, ErrInvalidToken
	}
	return &c, nil
}

func (t *Tokenizer) sign(body string) string {
	mac := hmac.New(sha256.New, t.secret)
	_, _ = mac.Write([]byte(body))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func Bearer(header string) (string, error) {
	header = strings.TrimSpace(header)
	if !strings.HasPrefix(strings.ToLower(header), "bearer ") {
		return "", fmt.Errorf("%w: missing bearer", ErrInvalidToken)
	}
	return strings.TrimSpace(header[7:]), nil
}
