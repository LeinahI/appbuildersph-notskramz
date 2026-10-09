package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/yourorg/ws/internal/domain/audit"
)

type AuditRepository struct {
	db *sql.DB
}

func NewAuditRepository(db *sql.DB) *AuditRepository {
	return &AuditRepository{db: db}
}

func (r *AuditRepository) Append(ctx context.Context, e *audit.Event) error {
	const q = `
		INSERT INTO audit_events (id, event_type, actor_id, subject_id, metadata, created_at)
		VALUES ($1,$2,$3,$4,$5::jsonb,$6)
	`
	_, err := r.db.ExecContext(ctx, q, e.ID(), e.EventType(), e.ActorID(), e.SubjectID(), string(e.Metadata()), e.CreatedAt())
	if err != nil {
		return fmt.Errorf("append audit: %w", err)
	}
	return nil
}

func (r *AuditRepository) List(ctx context.Context, filter audit.ListFilter) ([]*audit.Event, error) {
	limit := filter.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, event_type, actor_id, subject_id, metadata, created_at
		FROM audit_events
		ORDER BY created_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*audit.Event
	for rows.Next() {
		var (
			id, et, actor, subject string
			meta                   []byte
			created                time.Time
		)
		if err := rows.Scan(&id, &et, &actor, &subject, &meta, &created); err != nil {
			return nil, err
		}
		out = append(out, audit.Reconstruct(id, et, actor, subject, json.RawMessage(meta), created.UTC()))
	}
	return out, rows.Err()
}
