-- +goose Up
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role            VARCHAR(16) NOT NULL CHECK (role IN ('admin', 'user')),
    status          VARCHAR(16) NOT NULL CHECK (status IN ('pending', 'active', 'revoked')),
    email           VARCHAR(255) NOT NULL DEFAULT '',
    password_hash   TEXT NOT NULL DEFAULT '',
    -- AES-GCM ciphertext (base64) for PII; empty string means unset
    full_name_enc   TEXT NOT NULL DEFAULT '',
    birth_date_enc  TEXT NOT NULL DEFAULT '',
    address_enc     TEXT NOT NULL DEFAULT '',
    phone_enc       TEXT NOT NULL DEFAULT '',
    id_number_hash  VARCHAR(64) NOT NULL DEFAULT '',
    device_id       VARCHAR(128) NOT NULL DEFAULT '',
    consent_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_email_nonzero ON users (email) WHERE email <> '';
CREATE UNIQUE INDEX idx_users_id_hash_nonzero ON users (id_number_hash) WHERE id_number_hash <> '';
CREATE UNIQUE INDEX idx_users_device_nonzero ON users (device_id) WHERE device_id <> '';
CREATE INDEX idx_users_role_status ON users (role, status);

-- +goose Down
DROP TABLE IF EXISTS users;
