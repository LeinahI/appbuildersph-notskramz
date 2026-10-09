package conversation

import (
	"context"
	"encoding/json"
	"strings"

	domain "github.com/yourorg/ws/internal/domain/conversation"
)

type Service struct {
	repo domain.Repository
}

func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, userID, title string) (*domain.Conversation, error) {
	c, err := domain.New(userID, title)
	if err != nil {
		return nil, err
	}
	if err := s.repo.Save(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *Service) List(ctx context.Context, userID, q string) ([]*domain.Conversation, error) {
	return s.repo.List(ctx, domain.ListFilter{UserID: userID, Query: q, Limit: 100})
}

func (s *Service) Get(ctx context.Context, userID, id string) (*domain.Conversation, error) {
	return s.repo.FindByID(ctx, userID, id)
}

type PatchInput struct {
	Title  *string
	Pinned *bool
}

func (s *Service) Patch(ctx context.Context, userID, id string, in PatchInput) (*domain.Conversation, error) {
	c, err := s.repo.FindByID(ctx, userID, id)
	if err != nil {
		return nil, err
	}
	if in.Title != nil {
		if err := c.Rename(*in.Title); err != nil {
			return nil, err
		}
	}
	if in.Pinned != nil {
		c.SetPinned(*in.Pinned)
	}
	if err := s.repo.Update(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *Service) Delete(ctx context.Context, userID, id string) error {
	return s.repo.Delete(ctx, userID, id)
}

func (s *Service) ListMessages(ctx context.Context, userID, id string) ([]*domain.Message, error) {
	if _, err := s.repo.FindByID(ctx, userID, id); err != nil {
		return nil, err
	}
	return s.repo.ListMessages(ctx, id)
}

type MessageInput struct {
	Role      string          `json:"role"`
	Body      string          `json:"body"`
	ClientUID string          `json:"clientUid"`
	Meta      json.RawMessage `json:"meta"`
}

func (s *Service) ReplaceMessages(ctx context.Context, userID, id string, inputs []MessageInput) ([]*domain.Message, error) {
	c, err := s.repo.FindByID(ctx, userID, id)
	if err != nil {
		return nil, err
	}
	msgs := make([]*domain.Message, 0, len(inputs))
	for _, in := range inputs {
		m, err := domain.NewMessage(c.ID(), domain.Role(strings.TrimSpace(in.Role)), in.Body, in.ClientUID, in.Meta)
		if err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	if err := s.repo.ReplaceMessages(ctx, c.ID(), msgs); err != nil {
		return nil, err
	}
	c.Touch()
	_ = s.repo.Update(ctx, c)
	return msgs, nil
}
