package middleware

import (
	"container/list"
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

// maxClients caps how many addresses are tracked at once. Behind a proxy the
// address comes from a header, and even resolved correctly a botnet supplies
// plenty of real ones — either way the map must not be allowed to grow until
// the process runs out of memory. Ten thousand entries is far more than a
// self-hosted dashboard ever has, and costs a few megabytes at worst.
const maxClients = 10000

type client struct {
	limiter  *rate.Limiter
	lastSeen time.Time
	// entry is this client's place in recent, so eviction does not have to
	// search for it.
	entry *list.Element
}

var (
	clients = make(map[string]*client)
	// recent holds the tracked addresses, most recently seen at the front, so
	// the one to drop when full is always at the back.
	recent = list.New()
	mu     sync.Mutex
)

// init starts the background cleanup routine
func init() {
	go cleanupClients()
}

func cleanupClients() {
	for {
		time.Sleep(5 * time.Minute)
		mu.Lock()
		for ip, c := range clients {
			if time.Since(c.lastSeen) > 10*time.Minute {
				recent.Remove(c.entry)
				delete(clients, ip)
			}
		}
		mu.Unlock()
	}
}

func getLimiter(ip string) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()

	if v, exists := clients[ip]; exists {
		v.lastSeen = time.Now()
		recent.MoveToFront(v.entry)
		return v.limiter
	}

	// Full: drop the address seen longest ago to make room. It only loses its
	// spent budget, so the worst an attacker gets by cycling addresses is a
	// fresh bucket for someone else — never more than the bucket allows.
	if len(clients) >= maxClients {
		if oldest := recent.Back(); oldest != nil {
			recent.Remove(oldest)
			delete(clients, oldest.Value.(string))
		}
	}

	// Allow 20 requests per second with a burst of 50
	// This is relaxed to support StatusService health checks + normal UI interactions
	limiter := rate.NewLimiter(20, 50)
	clients[ip] = &client{limiter: limiter, lastSeen: time.Now(), entry: recent.PushFront(ip)}
	return limiter
}

// RateLimit middleware limits requests based on IP
func RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		limiter := getLimiter(util.ClientIP(r))
		if !limiter.Allow() {
			http.Error(w, "error.rate_limited", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}
