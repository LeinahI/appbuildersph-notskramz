package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/yourorg/ws/internal/application/registration"
	"github.com/yourorg/ws/internal/domain/invite"
	"github.com/yourorg/ws/internal/domain/user"
	"github.com/yourorg/ws/internal/transport/http/middleware"
	"github.com/yourorg/ws/internal/transport/http/response"
)

type RegistrationHandler struct {
	svc *registration.Service
}

func NewRegistrationHandler(svc *registration.Service) *RegistrationHandler {
	return &RegistrationHandler{svc: svc}
}

func (h *RegistrationHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	res, err := h.svc.Login(r.Context(), registration.LoginInput{Email: req.Email, Password: req.Password})
	if err != nil {
		writeRegError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]any{
		"token": res.Token,
		"user":  toUserDTO(res.User),
	})
}

func (h *RegistrationHandler) Me(w http.ResponseWriter, r *http.Request) {
	c := middleware.ClaimsFrom(r.Context())
	if c == nil {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	u, err := h.svc.Me(r.Context(), c.Sub)
	if err != nil {
		writeRegError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, toUserDTO(u))
}

func (h *RegistrationHandler) Register(w http.ResponseWriter, r *http.Request) {
	c := middleware.ClaimsFrom(r.Context())
	if c == nil {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req struct {
		FullName  string `json:"fullName"`
		BirthDate string `json:"birthDate"` // YYYY-MM-DD
		Address   struct {
			Line1      string `json:"line1"`
			Line2      string `json:"line2"`
			Barangay   string `json:"barangay"`
			City       string `json:"city"`
			Province   string `json:"province"`
			PostalCode string `json:"postalCode"`
		} `json:"address"`
		Phone     string `json:"phone"`
		IDNumber  string `json:"idNumber"`
		ConsentAt string `json:"consentAt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	birth, err := time.Parse("2006-01-02", req.BirthDate)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "birthDate must be YYYY-MM-DD")
		return
	}
	var consent *time.Time
	if req.ConsentAt != "" {
		t, err := time.Parse(time.RFC3339, req.ConsentAt)
		if err != nil {
			response.Error(w, http.StatusBadRequest, "consentAt must be RFC3339")
			return
		}
		t = t.UTC()
		consent = &t
	}
	u, err := h.svc.RegisterUser(r.Context(), registration.RegisterInput{
		FullName:  req.FullName,
		BirthDate: birth,
		Address: user.Address{
			Line1: req.Address.Line1, Line2: req.Address.Line2, Barangay: req.Address.Barangay,
			City: req.Address.City, Province: req.Address.Province, PostalCode: req.Address.PostalCode,
		},
		Phone:     req.Phone,
		IDNumber:  req.IDNumber,
		ConsentAt: consent,
		AdminID:   c.Sub,
	})
	if err != nil {
		writeRegError(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, toUserDTO(u))
}

func (h *RegistrationHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListUsers(r.Context(), user.ListFilter{
		Query:  r.URL.Query().Get("q"),
		Status: user.Status(r.URL.Query().Get("status")),
		Limit:  50,
	})
	if err != nil {
		writeRegError(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, u := range items {
		out = append(out, toUserDTO(u))
	}
	response.JSON(w, http.StatusOK, out)
}

func (h *RegistrationHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	u, err := h.svc.GetUser(r.Context(), r.PathValue("id"))
	if err != nil {
		writeRegError(w, err)
		return
	}
	dto := toUserDTO(u)
	if inv, err := h.svc.ActiveInvite(r.Context(), u.ID()); err == nil {
		dto["invite"] = toInviteDTO(inv)
	}
	response.JSON(w, http.StatusOK, dto)
}

func (h *RegistrationHandler) CreateInvite(w http.ResponseWriter, r *http.Request) {
	c := middleware.ClaimsFrom(r.Context())
	res, err := h.svc.CreateInvite(r.Context(), c.Sub, r.PathValue("id"), invite.DefaultTTL)
	if err != nil {
		writeRegError(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, toInviteDTO(res))
}

func (h *RegistrationHandler) RegenerateInvite(w http.ResponseWriter, r *http.Request) {
	c := middleware.ClaimsFrom(r.Context())
	res, err := h.svc.RegenerateInvite(r.Context(), c.Sub, r.PathValue("id"), invite.DefaultTTL)
	if err != nil {
		writeRegError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, toInviteDTO(res))
}

func (h *RegistrationHandler) RevokeInvite(w http.ResponseWriter, r *http.Request) {
	c := middleware.ClaimsFrom(r.Context())
	if err := h.svc.RevokeInvite(r.Context(), c.Sub, r.PathValue("id")); err != nil {
		writeRegError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"status": "revoked"})
}

func (h *RegistrationHandler) Claim(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token    string `json:"token"`
		DeviceID string `json:"deviceId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	res, err := h.svc.ClaimInvite(r.Context(), registration.ClaimInput{Token: req.Token, DeviceID: req.DeviceID})
	if err != nil {
		writeRegError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]any{"userId": res.UserID, "token": res.Token})
}

func (h *RegistrationHandler) RevokeUser(w http.ResponseWriter, r *http.Request) {
	c := middleware.ClaimsFrom(r.Context())
	if err := h.svc.RevokeUser(r.Context(), c.Sub, r.PathValue("id")); err != nil {
		writeRegError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"status": "revoked"})
}

func (h *RegistrationHandler) ListAudit(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListAudit(r.Context(), 50)
	if err != nil {
		writeRegError(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, e := range items {
		out = append(out, map[string]any{
			"id": e.ID(), "eventType": e.EventType(), "actorId": e.ActorID(),
			"subjectId": e.SubjectID(), "metadata": json.RawMessage(e.Metadata()),
			"createdAt": e.CreatedAt().Format(time.RFC3339),
		})
	}
	response.JSON(w, http.StatusOK, out)
}

func toUserDTO(u *user.User) map[string]any {
	addr := u.Address()
	dto := map[string]any{
		"id": u.ID(), "role": u.Role(), "status": u.Status(), "email": u.Email(),
		"fullName": u.FullName(), "phone": u.Phone(), "deviceId": u.DeviceID(),
		"age": u.Age(), "createdAt": u.CreatedAt().Format(time.RFC3339),
		"address": map[string]string{
			"line1": addr.Line1, "line2": addr.Line2, "barangay": addr.Barangay,
			"city": addr.City, "province": addr.Province, "postalCode": addr.PostalCode,
		},
	}
	if !u.BirthDate().IsZero() {
		dto["birthDate"] = u.BirthDate().Format("2006-01-02")
	}
	if u.ConsentAt() != nil {
		dto["consentAt"] = u.ConsentAt().Format(time.RFC3339)
	}
	return dto
}

func toInviteDTO(res *registration.InviteResult) map[string]any {
	inv := res.Invite
	return map[string]any{
		"id": inv.ID(), "userId": inv.UserID(), "claimUrl": res.ClaimURL,
		"expiresAt": inv.ExpiresAt().Format(time.RFC3339),
		"singleUse": inv.SingleUse(),
	}
}

func writeRegError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, user.ErrNotFound), errors.Is(err, invite.ErrNotFound):
		response.Error(w, http.StatusNotFound, err.Error())
	case errors.Is(err, user.ErrUnauthorized), errors.Is(err, user.ErrInvalidCredentials):
		response.Error(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, user.ErrDuplicateUser):
		response.Error(w, http.StatusConflict, err.Error())
	case errors.Is(err, user.ErrUnderage), errors.Is(err, user.ErrIncompleteAddress),
		errors.Is(err, user.ErrInvalidName), errors.Is(err, user.ErrInvalidRole),
		errors.Is(err, invite.ErrInviteExpired), errors.Is(err, invite.ErrInviteConsumed),
		errors.Is(err, invite.ErrInviteRevoked), errors.Is(err, user.ErrAlreadyClaimed),
		errors.Is(err, user.ErrRevoked), errors.Is(err, user.ErrNotPending):
		response.Error(w, http.StatusBadRequest, err.Error())
	default:
		response.Error(w, http.StatusInternalServerError, "internal server error")
	}
}
