package conversation

import "testing"

func TestNewAndRename(t *testing.T) {
	t.Parallel()
	c, err := New("user-1", "")
	if err != nil {
		t.Fatal(err)
	}
	if c.Title() != "Bagong usapan" {
		t.Fatalf("title %q", c.Title())
	}
	if err := c.Rename("  Tungkol sa palay  "); err != nil {
		t.Fatal(err)
	}
	if c.Title() != "Tungkol sa palay" {
		t.Fatalf("title %q", c.Title())
	}
	c.SetPinned(true)
	if !c.Pinned() || c.PinnedAt() == nil {
		t.Fatal("expected pinned")
	}
	c.SetPinned(false)
	if c.Pinned() || c.PinnedAt() != nil {
		t.Fatal("expected unpinned")
	}
}

func TestNewMessageRejectsBadRole(t *testing.T) {
	t.Parallel()
	_, err := NewMessage("c1", Role("bot"), "hello", "", nil)
	if err != ErrInvalidRole {
		t.Fatalf("got %v", err)
	}
}
