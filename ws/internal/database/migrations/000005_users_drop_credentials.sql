-- +goose Up
-- Farmers are PII + QR claim only. Staff credentials live in admins (000004).
DROP INDEX IF EXISTS idx_users_email_nonzero;
ALTER TABLE users DROP COLUMN IF EXISTS email;
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- +goose Down
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_nonzero ON users (email) WHERE email <> '';
