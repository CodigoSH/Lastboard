package web

import (
	"context"
	"os"
	"sync"
	"testing"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	_ "modernc.org/sqlite"
)

// These loops used to be launched with a bare `go` and never waited for, so a
// restart could land in the middle of one — the icon migration and the monitor
// scheduler both write to the database. Shutdown now waits for them, which is
// only worth anything if every one of them actually stops when asked.
//
// A loop that ignores the cancellation makes this test time out rather than
// fail quietly at three in the morning on somebody's docker restart.
func TestBackgroundTasksStopWhenTheContextIsCancelled(t *testing.T) {
	file, err := os.CreateTemp(t.TempDir(), "shutdown_*.db")
	if err != nil {
		t.Fatal(err)
	}
	file.Close()

	db, err := database.InitDB(file.Name())
	if err != nil {
		t.Fatalf("init db: %v", err)
	}
	defer db.Close()

	ctx, cancel := context.WithCancel(context.Background())
	server := NewServer(db.DB)

	var background sync.WaitGroup
	server.StartBackground(ctx, &background)

	// Let them reach their waiting points before pulling the rug.
	time.Sleep(50 * time.Millisecond)
	cancel()

	stopped := make(chan struct{})
	go func() {
		background.Wait()
		close(stopped)
	}()

	select {
	case <-stopped:
	case <-time.After(5 * time.Second):
		t.Fatal("a background task did not return within 5s of cancellation; " +
			"shutdown would hang on it, or give up and cut it off mid-write")
	}
}
