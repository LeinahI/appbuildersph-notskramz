package user

import (
	"testing"
	"time"
)

func TestNewUserUnderage(t *testing.T) {
	t.Parallel()
	_, err := New(NewInput{
		Role:      RoleUser,
		FullName:  "Batang Magsasaka",
		BirthDate: time.Now().UTC().AddDate(-17, 0, 0),
		Address: Address{
			Line1: "1 Rizal St", Barangay: "Poblacion", City: "Nabua", Province: "Camarines Sur",
		},
	})
	if err != ErrUnderage {
		t.Fatalf("got %v, want ErrUnderage", err)
	}
}

func TestNewUserIncompleteAddress(t *testing.T) {
	t.Parallel()
	_, err := New(NewInput{
		Role:      RoleUser,
		FullName:  "Juan Dela Cruz",
		BirthDate: time.Now().UTC().AddDate(-25, 0, 0),
		Address:   Address{Line1: "1 Rizal St"},
	})
	if err != ErrIncompleteAddress {
		t.Fatalf("got %v, want ErrIncompleteAddress", err)
	}
}

func TestNewUserPendingThenClaim(t *testing.T) {
	t.Parallel()
	u, err := New(NewInput{
		Role:      RoleUser,
		FullName:  "Juan Dela Cruz",
		BirthDate: time.Now().UTC().AddDate(-30, 0, 0),
		Address: Address{
			Line1: "1 Rizal St", Barangay: "Poblacion", City: "Nabua", Province: "Camarines Sur",
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if u.Status() != StatusPending {
		t.Fatalf("status %s", u.Status())
	}
	if err := u.MarkClaimed("device-1"); err != nil {
		t.Fatal(err)
	}
	if u.Status() != StatusActive || u.DeviceID() != "device-1" {
		t.Fatalf("claim failed: %+v", u)
	}
	// New browser / regenerated QR may re-bind the device.
	if err := u.MarkClaimed("device-2"); err != nil {
		t.Fatal(err)
	}
	if u.DeviceID() != "device-2" {
		t.Fatalf("rebind failed: %s", u.DeviceID())
	}
}

func TestNewRejectsNonUserRole(t *testing.T) {
	t.Parallel()
	_, err := New(NewInput{
		Role:      Role("admin"),
		FullName:  "Admin",
		BirthDate: time.Now().UTC().AddDate(-30, 0, 0),
		Address: Address{
			Line1: "1 Rizal St", Barangay: "Poblacion", City: "Nabua", Province: "Camarines Sur",
		},
	})
	if err != ErrInvalidRole {
		t.Fatalf("got %v, want ErrInvalidRole", err)
	}
}

func TestRename(t *testing.T) {
	t.Parallel()
	u, err := New(NewInput{
		Role:      RoleUser,
		FullName:  "Juan Dela Cruz",
		BirthDate: time.Now().UTC().AddDate(-30, 0, 0),
		Address: Address{
			Line1: "1 Rizal St", Barangay: "Poblacion", City: "Nabua", Province: "Camarines Sur",
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := u.Rename("  Maria Santos  "); err != nil {
		t.Fatal(err)
	}
	if u.FullName() != "Maria Santos" {
		t.Fatalf("got %q", u.FullName())
	}
	if err := u.Rename("   "); err != ErrInvalidName {
		t.Fatalf("got %v, want ErrInvalidName", err)
	}
	_ = u.Revoke()
	if err := u.Rename("Ok"); err != ErrRevoked {
		t.Fatalf("got %v, want ErrRevoked", err)
	}
}
