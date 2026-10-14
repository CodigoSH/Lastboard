package api

import (
	"context"
	"testing"
	"time"
)

// The announcement goes to the hub's queue. When the queue is full and nobody is
// reading it — the server is shutting down — the send must give up with the
// context instead of holding the goroutine for good.
func TestAnnouncingAnUpdateGivesUpWhenTheServerStops(t *testing.T) {
	hub := NewHub()
	for i := 0; i < cap(hub.broadcast); i++ {
		hub.broadcast <- WSMessage{Type: "filler"}
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	done := make(chan struct{})
	go func() {
		announceUpdate(ctx, hub, "v9.9.9")
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("announceUpdate is blocked on a full queue that nobody reads")
	}
}

func TestAnnouncingAnUpdateQueuesTheVersion(t *testing.T) {
	hub := NewHub()
	announceUpdate(context.Background(), hub, "v9.9.9")
	select {
	case msg := <-hub.broadcast:
		payload, _ := msg.Payload.(map[string]string)
		if msg.Type != "update_available" || payload["latest_version"] != "v9.9.9" {
			t.Errorf("queued %+v", msg)
		}
	default:
		t.Fatal("nothing was queued")
	}
}
