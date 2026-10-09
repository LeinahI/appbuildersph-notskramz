-- +goose Up
CREATE TABLE conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title       TEXT NOT NULL DEFAULT 'Bagong usapan',
    pinned      BOOLEAN NOT NULL DEFAULT FALSE,
    pinned_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_user_updated ON conversations (user_id, updated_at DESC);
CREATE INDEX idx_conversations_user_pinned ON conversations (user_id, pinned) WHERE pinned = TRUE;
CREATE INDEX idx_conversations_title ON conversations (user_id, title);

CREATE TABLE messages (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id  UUID NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    role             VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant')),
    body             TEXT NOT NULL DEFAULT '',
    meta             JSONB NOT NULL DEFAULT '{}',
    client_uid       VARCHAR(128) NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at);
CREATE UNIQUE INDEX idx_messages_client_uid ON messages (conversation_id, client_uid) WHERE client_uid <> '';

-- +goose Down
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
