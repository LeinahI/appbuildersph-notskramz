package invite

import (
	"testing"
	"time"
)

func TestConsumeSingleUse(t *testing.T) {
	t.Parallel()
	inv, err := New("user-1", time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UTC()
	if err := inv.Consume(now); err != nil {
		t.Fatal(err)
	}
	if err := inv.Consume(now); err != ErrInviteConsumed {
		t.Fatalf("got %v", err)
	}
}

func TestExpired(t *testing.T) {
	t.Parallel()
	inv, err := New("user-1", time.Millisecond)
	if err != nil {
		t.Fatal(err)
	}
	time.Sleep(5 * time.Millisecond)
	if err := inv.Consume(time.Now().UTC()); err != ErrInviteExpired {
		t.Fatalf("got %v", err)
	}
}
