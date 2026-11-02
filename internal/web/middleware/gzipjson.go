package middleware

import (
	"compress/gzip"
	"io"
	"net/http"
	"strings"
)

// GzipJSON compresses the JSON answers of the routes it wraps for a client that
// accepts it. The static files already are; the API's were not, and the status
// page's three heaviest answers (the services, the outages, the history) are
// text that shrinks to a fifth, which is what a phone on mobile data waits for.
//
// It decides when the handler writes its first byte, from what the handler said:
// only a 200 that declared application/json is compressed, so an error, a file
// or a stream goes through as it was.
func GzipJSON(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("Vary", "Accept-Encoding")
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}
		g := &jsonGzip{ResponseWriter: w}
		defer g.finish()
		next.ServeHTTP(g, r)
	})
}

type jsonGzip struct {
	http.ResponseWriter
	gz      *gzip.Writer
	decided bool
}

func (g *jsonGzip) WriteHeader(code int) {
	if g.decided {
		return
	}
	g.decided = true
	h := g.ResponseWriter.Header()
	if code == http.StatusOK && strings.HasPrefix(h.Get("Content-Type"), "application/json") && h.Get("Content-Encoding") == "" {
		h.Set("Content-Encoding", "gzip")
		h.Del("Content-Length")
		g.gz = gzPool.Get().(*gzip.Writer)
		g.gz.Reset(g.ResponseWriter)
	}
	g.ResponseWriter.WriteHeader(code)
}

func (g *jsonGzip) Write(b []byte) (int, error) {
	if !g.decided {
		g.WriteHeader(http.StatusOK)
	}
	if g.gz != nil {
		return g.gz.Write(b)
	}
	return g.ResponseWriter.Write(b)
}

func (g *jsonGzip) finish() {
	if g.gz == nil {
		return
	}
	g.gz.Close()
	g.gz.Reset(io.Discard)
	gzPool.Put(g.gz)
}

// Unwrap lets http.ResponseController reach the writer underneath.
func (g *jsonGzip) Unwrap() http.ResponseWriter { return g.ResponseWriter }
