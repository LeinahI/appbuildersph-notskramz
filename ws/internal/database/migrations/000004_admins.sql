-- +goose Up
-- Staff credentials live in admins. Farmer records stay in users (role=user only).
-- Login for /admin uses admins.email + password_hash; farmers never authenticate here.

CREATE TABLE admins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL,
    password_hash   TEXT NOT NULL,
    full_name       TEXT NOT NULL DEFAULT '',
    status          VARCHAR(16) NOT NULL CHECK (status IN ('active', 'revoked')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_admins_email ON admins (LOWER(email));

-- Move any bootstrap admin rows out of users (name was PII-encrypted; use email as display until re-seed).
INSERT INTO admins (id, email, password_hash, full_name, status, created_at, updated_at)
SELECT id, email, password_hash, COALESCE(NULLIF(email, ''), 'Admin'), status, created_at, updated_at
FROM users
WHERE role = 'admin';

DELETE FROM users WHERE role = 'admin';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user'));

-- +goose Down
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user'));

INSERT INTO users (
    id, role, status, email, password_hash,
    full_name_enc, birth_date_enc, address_enc, phone_enc,
    id_number_hash, device_id, created_at, updated_at
)
SELECT
    id, 'admin', status, email, password_hash,
    '', '', '', '',
    '', '', created_at, updated_at
FROM admins;

DROP TABLE IF EXISTS admins;
