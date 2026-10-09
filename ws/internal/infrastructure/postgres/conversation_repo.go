package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/yourorg/ws/internal/domain/conversation"
)

type ConversationRepository struct {
	db *sql.DB
}

func NewConversationRepository(db *sql.DB) *ConversationRepository {
	return &ConversationRepository{db: db}
}

func (r *ConversationRepository) Save(ctx context.Context, c *conversation.Conversation) error {
	const q = `
		INSERT INTO conversations (id, user_id, title, pinned, pinned_at, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
	`
	_, err := r.db.ExecContext(ctx, q,
		c.ID(), c.UserID(), c.Title(), c.Pinned(), nullTime(c.PinnedAt()), c.CreatedAt(), c.UpdatedAt(),
	)
	if err != nil {
		return fmt.Errorf("insert conversation: %w", err)
	}
	return nil
}

func (r *ConversationRepository) Update(ctx context.Context, c *conversation.Conversation) error {
	const q = `
		UPDATE conversations SET title=$3, pinned=$4, pinned_at=$5, updated_at=$6
		WHERE id=$1 AND user_id=$2
	`
	res, err := r.db.ExecContext(ctx, q, c.ID(), c.UserID(), c.Title(), c.Pinned(), nullTime(c.PinnedAt()), c.UpdatedAt())
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return conversation.ErrNotFound
	}
	return nil
}

func (r *ConversationRepository) Delete(ctx context.Context, userID, id string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM conversations WHERE id=$1 AND user_id=$2`, id, userID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return conversation.ErrNotFound
	}
	return nil
}

func (r *ConversationRepository) FindByID(ctx context.Context, userID, id string) (*conversation.Conversation, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, title, pinned, pinned_at, created_at, updated_at
		FROM conversations WHERE id=$1 AND user_id=$2
	`, id, userID)
	return scanConversation(row)
}

func (r *ConversationRepository) List(ctx context.Context, filter conversation.ListFilter) ([]*conversation.Conversation, error) {
	limit := filter.Limit
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	args := []any{filter.UserID}
	where := `WHERE user_id=$1`
	if q := strings.TrimSpace(filter.Query); q != "" {
		args = append(args, "%"+strings.ToLower(q)+"%")
		where += fmt.Sprintf(` AND lower(title) LIKE $%d`, len(args))
	}
	query := fmt.Sprintf(`
		SELECT id, user_id, title, pinned, pinned_at, created_at, updated_at
		FROM conversations %s
		ORDER BY pinned DESC, COALESCE(pinned_at, updated_at) DESC, updated_at DESC
		LIMIT %d
	`, where, limit)
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*conversation.Conversation
	for rows.Next() {
		c, err := scanConversation(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *ConversationRepository) ReplaceMessages(ctx context.Context, conversationID string, msgs []*conversation.Message) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, `DELETE FROM messages WHERE conversation_id=$1`, conversationID); err != nil {
		return err
	}
	const q = `
		INSERT INTO messages (id, conversation_id, role, body, meta, client_uid, created_at)
		VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)
	`
	for _, m := range msgs {
		if _, err := tx.ExecContext(ctx, q,
			m.ID(), m.ConversationID(), string(m.Role()), m.Body(), string(m.Meta()), m.ClientUID(), m.CreatedAt(),
		); err != nil {
			return err
		}
	}
	if _, err := tx.ExecContext(ctx, `UPDATE conversations SET updated_at=$2 WHERE id=$1`, conversationID, time.Now().UTC()); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *ConversationRepository) ListMessages(ctx context.Context, conversationID string) ([]*conversation.Message, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, conversation_id, role, body, meta, client_uid, created_at
		FROM messages WHERE conversation_id=$1 ORDER BY created_at ASC
	`, conversationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*conversation.Message
	for rows.Next() {
		var (
			id, cid, role, body, clientUID string
			meta                           []byte
			created                        time.Time
		)
		if err := rows.Scan(&id, &cid, &role, &body, &meta, &clientUID, &created); err != nil {
			return nil, err
		}
		out = append(out, conversation.ReconstructMessage(id, cid, conversation.Role(role), body, json.RawMessage(meta), clientUID, created.UTC()))
	}
	return out, rows.Err()
}

func scanConversation(row scannable) (*conversation.Conversation, error) {
	var (
		id, userID, title string
		pinned            bool
		pinnedAt          sql.NullTime
		created, updated  time.Time
	)
	if err := row.Scan(&id, &userID, &title, &pinned, &pinnedAt, &created, &updated); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, conversation.ErrNotFound
		}
		return nil, err
	}
	var pinnedPtr *time.Time
	if pinnedAt.Valid {
		t := pinnedAt.Time.UTC()
		pinnedPtr = &t
	}
	return conversation.Reconstruct(id, userID, title, pinned, pinnedPtr, created.UTC(), updated.UTC()), nil
}
