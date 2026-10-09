-- +goose Up
CREATE TABLE invites (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token        VARCHAR(128) NOT NULL,
    single_use   BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at   TIMESTAMPTZ NOT NULL,
    consumed_at  TIMESTAMPTZ,
    revoked_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_invites_token ON invites (token);
CREATE INDEX idx_invites_user ON invites (user_id);

CREATE TABLE audit_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type  VARCHAR(64) NOT NULL,
    actor_id    VARCHAR(64) NOT NULL DEFAULT '',
    subject_id  VARCHAR(64) NOT NULL DEFAULT '',
    metadata    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_created ON audit_events (created_at DESC);
CREATE INDEX idx_audit_type ON audit_events (event_type);

-- +goose Down
DROP TABLE IF EXISTS audit_events;
DROP TABLE IF EXISTS invites;
