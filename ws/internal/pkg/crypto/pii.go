package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
)

var ErrInvalidKey = errors.New("PII_ENCRYPTION_KEY must be at least 16 characters")

// Box encrypts and decrypts PII with AES-GCM. Key material is hashed to 32 bytes.
type Box struct {
	gcm cipher.AEAD
}

func NewBox(key string) (*Box, error) {
	key = strings.TrimSpace(key)
	if len(key) < 16 {
		return nil, ErrInvalidKey
	}
	sum := sha256.Sum256([]byte(key))
	block, err := aes.NewCipher(sum[:])
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return &Box{gcm: gcm}, nil
}

func (b *Box) Encrypt(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}
	nonce := make([]byte, b.gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	out := b.gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(out), nil
}

func (b *Box) Decrypt(ciphertext string) (string, error) {
	if ciphertext == "" {
		return "", nil
	}
	raw, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", fmt.Errorf("decode ciphertext: %w", err)
	}
	ns := b.gcm.NonceSize()
	if len(raw) < ns {
		return "", errors.New("ciphertext too short")
	}
	plain, err := b.gcm.Open(nil, raw[:ns], raw[ns:], nil)
	if err != nil {
		return "", err
	}
	return string(plain), nil
}

func (b *Box) EncryptJSON(v any) (string, error) {
	raw, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return b.Encrypt(string(raw))
}

func (b *Box) DecryptJSON(ciphertext string, dest any) error {
	plain, err := b.Decrypt(ciphertext)
	if err != nil {
		return err
	}
	if plain == "" {
		return nil
	}
	return json.Unmarshal([]byte(plain), dest)
}

// HashIDNumber returns a stable SHA-256 hex digest of a normalized ID number for duplicate checks.
func HashIDNumber(raw string) string {
	n := strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(raw), " ", ""))
	n = strings.ReplaceAll(n, "-", "")
	if n == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(n))
	return hex.EncodeToString(sum[:])
}
