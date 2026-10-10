package conversation

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Role string

const (
	RoleUser      Role = "user"
	RoleAssistant Role = "assistant"
)

type Conversation struct {
	id        string
	userID    string
	title     string
	pinned    bool
	pinnedAt  *time.Time
	createdAt time.Time
	updatedAt time.Time
}

type Message struct {
	id             string
	conversationID string
	role           Role
	body           string
	meta           json.RawMessage
	clientUID      string
	createdAt      time.Time
}

func New(userID, title string) (*Conversation, error) {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, ErrUnauthorized
	}
	title = strings.TrimSpace(title)
	if title == "" {
		title = "Bagong usapan"
	}
	now := time.Now().UTC()
	return &Conversation{
		id:        uuid.NewString(),
		userID:    userID,
		title:     title,
		createdAt: now,
		updatedAt: now,
	}, nil
}

func Reconstruct(id, userID, title string, pinned bool, pinnedAt *time.Time, createdAt, updatedAt time.Time) *Conversation {
	return &Conversation{
		id: id, userID: userID, title: title, pinned: pinned, pinnedAt: pinnedAt,
		createdAt: createdAt, updatedAt: updatedAt,
	}
}

func (c *Conversation) Rename(title string) error {
	title = strings.TrimSpace(title)
	if title == "" {
		return ErrInvalidTitle
	}
	c.title = title
	c.updatedAt = time.Now().UTC()
	return nil
}

func (c *Conversation) SetPinned(pinned bool) {
	c.pinned = pinned
	now := time.Now().UTC()
	c.updatedAt = now
	if pinned {
		c.pinnedAt = &now
	} else {
		c.pinnedAt = nil
	}
}

func (c *Conversation) Touch() {
	c.updatedAt = time.Now().UTC()
}

func (c *Conversation) ID() string           { return c.id }
func (c *Conversation) UserID() string       { return c.userID }
func (c *Conversation) Title() string        { return c.title }
func (c *Conversation) Pinned() bool         { return c.pinned }
func (c *Conversation) PinnedAt() *time.Time { return c.pinnedAt }
func (c *Conversation) CreatedAt() time.Time { return c.createdAt }
func (c *Conversation) UpdatedAt() time.Time { return c.updatedAt }

func NewMessage(conversationID string, role Role, body, clientUID string, meta json.RawMessage) (*Message, error) {
	if role != RoleUser && role != RoleAssistant {
		return nil, ErrInvalidRole
	}
	body = strings.TrimSpace(body)
	if body == "" {
		return nil, ErrEmptyBody
	}
	if len(meta) == 0 {
		meta = json.RawMessage(`{}`)
	}
	return &Message{
		id:             uuid.NewString(),
		conversationID: conversationID,
		role:           role,
		body:           body,
		meta:           meta,
		clientUID:      strings.TrimSpace(clientUID),
		createdAt:      time.Now().UTC(),
	}, nil
}

func ReconstructMessage(id, conversationID string, role Role, body string, meta json.RawMessage, clientUID string, createdAt time.Time) *Message {
	if len(meta) == 0 {
		meta = json.RawMessage(`{}`)
	}
	return &Message{
		id: id, conversationID: conversationID, role: role, body: body,
		meta: meta, clientUID: clientUID, createdAt: createdAt,
	}
}

func (m *Message) ID() string             { return m.id }
func (m *Message) ConversationID() string { return m.conversationID }
func (m *Message) Role() Role             { return m.role }
func (m *Message) Body() string           { return m.body }
func (m *Message) Meta() json.RawMessage  { return m.meta }
func (m *Message) ClientUID() string      { return m.clientUID }
func (m *Message) CreatedAt() time.Time   { return m.createdAt }

type ListFilter struct {
	UserID string
	Query  string
	Limit  int
}

type Repository interface {
	Save(ctx context.Context, c *Conversation) error
	Update(ctx context.Context, c *Conversation) error
	Delete(ctx context.Context, userID, id string) error
	FindByID(ctx context.Context, userID, id string) (*Conversation, error)
	List(ctx context.Context, filter ListFilter) ([]*Conversation, error)
	ReplaceMessages(ctx context.Context, conversationID string, msgs []*Message) error
	ListMessages(ctx context.Context, conversationID string) ([]*Message, error)
}
