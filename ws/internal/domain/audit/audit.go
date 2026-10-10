package audit

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

const (
	EventAdminLogin        = "admin.login"
	EventUserRegistered    = "user.registered"
	EventInviteCreated     = "invite.created"
	EventInviteClaimed     = "invite.claimed"
	EventInviteDownloaded  = "invite.downloaded"
	EventInviteRevoked     = "invite.revoked"
	EventInviteRegenerated = "invite.regenerated"
	EventUserRevoked       = "user.revoked"
)

type Event struct {
	id        string
	eventType string
	actorID   string
	subjectID string
	metadata  json.RawMessage
	createdAt time.Time
}

func New(eventType, actorID, subjectID string, metadata map[string]any) (*Event, error) {
	var raw json.RawMessage
	if metadata != nil {
		b, err := json.Marshal(metadata)
		if err != nil {
			return nil, err
		}
		raw = b
	} else {
		raw = json.RawMessage(`{}`)
	}
	return &Event{
		id:        uuid.NewString(),
		eventType: eventType,
		actorID:   actorID,
		subjectID: subjectID,
		metadata:  raw,
		createdAt: time.Now().UTC(),
	}, nil
}

func Reconstruct(id, eventType, actorID, subjectID string, metadata json.RawMessage, createdAt time.Time) *Event {
	if len(metadata) == 0 {
		metadata = json.RawMessage(`{}`)
	}
	return &Event{
		id:        id,
		eventType: eventType,
		actorID:   actorID,
		subjectID: subjectID,
		metadata:  metadata,
		createdAt: createdAt,
	}
}

func (e *Event) ID() string                { return e.id }
func (e *Event) EventType() string         { return e.eventType }
func (e *Event) ActorID() string           { return e.actorID }
func (e *Event) SubjectID() string         { return e.subjectID }
func (e *Event) Metadata() json.RawMessage { return e.metadata }
func (e *Event) CreatedAt() time.Time      { return e.createdAt }

type ListFilter struct {
	Limit int
}

type Repository interface {
	Append(ctx context.Context, e *Event) error
	List(ctx context.Context, filter ListFilter) ([]*Event, error)
}
