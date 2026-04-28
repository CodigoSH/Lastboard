package middleware

import (
	"compress/gzip"
	"io"
	"net/http"
	"strings"
	"sync"
)

var gzPool = sync.Pool{
	New: func() interface{} {
		w, _ := gzip.NewWriterLevel(io.Discard, gzip.BestSpeed)
		return w
	},
}

// extensions that are already compressed — gzip would make them larger
var skipGzipExt = map[string]bool{
	".png": true, ".jpg": true, ".jpeg": true,
	".gif": true, ".ico": true, ".webp": true,
	".woff2": true, ".woff": true, ".ttf": true,
	".eot": true, ".mp4": true, ".mp3": true, ".gz": true,
}

// StaticAssets wraps a static file handler with gzip compression and cache headers.
func StaticAssets(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Versioned assets (?v=...) never change content → cache forever
		if strings.Contains(r.URL.RawQuery, "v=") {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			ext := fileExt(path)
			switch ext {
			case ".png", ".ico", ".woff2", ".woff", ".json":
				w.Header().Set("Cache-Control", "public, max-age=86400")
			}
		}

		// Proxies must cache per Accept-Encoding variant
		w.Header().Set("Vary", "Accept-Encoding")

		// Skip gzip: range requests, unsupported clients, already-compressed formats
		if r.Header.Get("Range") != "" ||
			!strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") ||
			skipGzipExt[fileExt(path)] {
			next.ServeHTTP(w, r)
			return
		}

		gz := gzPool.Get().(*gzip.Writer)
		defer func() {
			gz.Reset(io.Discard)
			gzPool.Put(gz)
		}()
		gz.Reset(w)

		grw := &gzipRW{ResponseWriter: w, gz: gz}
		next.ServeHTTP(grw, r)

		if grw.status == http.StatusOK || grw.status == 0 {
			gz.Close()
		}
	})
}

type gzipRW struct {
	http.ResponseWriter
	gz     *gzip.Writer
	status int
}

func (g *gzipRW) WriteHeader(code int) {
	g.status = code
	h := g.ResponseWriter.Header()
	h.Del("Content-Length")
	if code == http.StatusOK {
		h.Set("Content-Encoding", "gzip")
	}
	g.ResponseWriter.WriteHeader(code)
}

func (g *gzipRW) Write(b []byte) (int, error) {
	if g.status == 0 {
		g.WriteHeader(http.StatusOK)
	}
	if g.status == http.StatusOK {
		return g.gz.Write(b)
	}
	return g.ResponseWriter.Write(b)
}

func fileExt(path string) string {
	if dot := strings.LastIndex(path, "."); dot >= 0 {
		return path[dot:]
	}
	return ""
}
