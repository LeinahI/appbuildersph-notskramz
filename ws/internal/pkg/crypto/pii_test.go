package crypto

import "testing"

func TestRoundTrip(t *testing.T) {
	t.Parallel()
	box, err := NewBox("dev-key-at-least-16-chars")
	if err != nil {
		t.Fatal(err)
	}
	ct, err := box.Encrypt("Juan Dela Cruz")
	if err != nil {
		t.Fatal(err)
	}
	pt, err := box.Decrypt(ct)
	if err != nil {
		t.Fatal(err)
	}
	if pt != "Juan Dela Cruz" {
		t.Fatalf("got %q", pt)
	}
}

func TestHashIDNumberStable(t *testing.T) {
	t.Parallel()
	a := HashIDNumber("12-3456-789")
	b := HashIDNumber("123456789")
	if a == "" || a != b {
		t.Fatalf("%q vs %q", a, b)
	}
}
