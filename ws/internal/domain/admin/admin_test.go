package admin

import "testing"

func TestNewAdmin(t *testing.T) {
	a, err := New(NewInput{
		Email:        "Admin@ugatan.com",
		PasswordHash: "hash",
		FullName:     "Ugatan Admin",
	})
	if err != nil {
		t.Fatal(err)
	}
	if a.Email() != "admin@ugatan.com" {
		t.Fatalf("email %q", a.Email())
	}
	if !a.CanLogin() {
		t.Fatal("expected active admin to login")
	}
}

func TestNewAdminRejectsBlankEmail(t *testing.T) {
	if _, err := New(NewInput{Email: "nope", PasswordHash: "x"}); err != ErrInvalidEmail {
		t.Fatalf("got %v", err)
	}
}
