package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	appconv "github.com/yourorg/ws/internal/application/conversation"
	domain "github.com/yourorg/ws/internal/domain/conversation"
	"github.com/yourorg/ws/internal/transport/http/middleware"
	"github.com/yourorg/ws/internal/transport/http/response"
)

type ConversationHandler struct {
	svc *appconv.Service
}

func NewConversationHandler(svc *appconv.Service) *ConversationHandler {
	return &ConversationHandler{svc: svc}
}

func (h *ConversationHandler) List(w http.ResponseWriter, r *http.Request) {
	c := middleware.ClaimsFrom(r.Context())
	items, err := h.svc.List(r.Context(), c.Sub, r.URL.Query().Get("q"))
	if err != nil {
		writeConvError(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, toConvDTO(item))
	}
	response.JSON(w, http.StatusOK, out)
}

func (h *ConversationHandler) Create(w http.ResponseWriter, r *http.Request) {
	c := middleware.ClaimsFrom(r.Context())
	var req struct {
		Title string `json:"title"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	item, err := h.svc.Create(r.Context(), c.Sub, req.Title)
	if err != nil {
		writeConvError(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, toConvDTO(item))
}

func (h *ConversationHandler) Patch(w http.ResponseWriter, r *http.Request) {
	c := middleware.ClaimsFrom(r.Context())
	var req struct {
		Title  *string `json:"title"`
		Pinned *bool   `json:"pinned"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	item, err := h.svc.Patch(r.Context(), c.Sub, r.PathValue("id"), appconv.PatchInput{Title: req.Title, Pinned: req.Pinned})
	if err != nil {
		writeConvError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, toConvDTO(item))
}

func (h *ConversationHandler) Delete(w http.ResponseWriter, r *http.Request) {
	c := middleware.ClaimsFrom(r.Context())
	if err := h.svc.Delete(r.Context(), c.Sub, r.PathValue("id")); err != nil {
		writeConvError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *ConversationHandler) ListMessages(w http.ResponseWriter, r *http.Request) {
	c := middleware.ClaimsFrom(r.Context())
	items, err := h.svc.ListMessages(r.Context(), c.Sub, r.PathValue("id"))
	if err != nil {
		writeConvError(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, m := range items {
		out = append(out, toMsgDTO(m))
	}
	response.JSON(w, http.StatusOK, out)
}

func (h *ConversationHandler) PutMessages(w http.ResponseWriter, r *http.Request) {
	c := middleware.ClaimsFrom(r.Context())
	var req struct {
		Messages []appconv.MessageInput `json:"messages"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	items, err := h.svc.ReplaceMessages(r.Context(), c.Sub, r.PathValue("id"), req.Messages)
	if err != nil {
		writeConvError(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, m := range items {
		out = append(out, toMsgDTO(m))
	}
	response.JSON(w, http.StatusOK, out)
}

func toConvDTO(c *domain.Conversation) map[string]any {
	dto := map[string]any{
		"id": c.ID(), "userId": c.UserID(), "title": c.Title(), "pinned": c.Pinned(),
		"createdAt": c.CreatedAt().Format(time.RFC3339),
		"updatedAt": c.UpdatedAt().Format(time.RFC3339),
	}
	if c.PinnedAt() != nil {
		dto["pinnedAt"] = c.PinnedAt().Format(time.RFC3339)
	}
	return dto
}

func toMsgDTO(m *domain.Message) map[string]any {
	return map[string]any{
		"id": m.ID(), "conversationId": m.ConversationID(), "role": m.Role(),
		"body": m.Body(), "meta": json.RawMessage(m.Meta()), "clientUid": m.ClientUID(),
		"createdAt": m.CreatedAt().Format(time.RFC3339),
	}
}

func writeConvError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		response.Error(w, http.StatusNotFound, err.Error())
	case errors.Is(err, domain.ErrUnauthorized):
		response.Error(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, domain.ErrInvalidTitle), errors.Is(err, domain.ErrInvalidRole), errors.Is(err, domain.ErrEmptyBody):
		response.Error(w, http.StatusBadRequest, err.Error())
	default:
		response.Error(w, http.StatusInternalServerError, "internal server error")
	}
}
