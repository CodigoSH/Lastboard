package api

import (
	"context"
	"errors"
	"net"
	"os"
	"syscall"
)

// Why a host could not be reached, as the key the screen translates.
//
// One message for every failure sent people to the wrong place: a socket that is
// not there, one the server may not open and a daemon that is not running are
// three different fixes, and "could not connect" says none of them. These are
// the causes the operating system names; anything else stays the general one.
const (
	keyConnection = "docker.connection_error"
	keyMissing    = "docker.socket_missing"
	keyDenied     = "docker.socket_denied"
	keyRefused    = "docker.connection_refused"
	keyTimeout    = "docker.connection_timeout"
)

// connectionKey names why the dial or the request failed.
func connectionKey(err error) string {
	switch {
	case err == nil:
		return keyConnection
	case errors.Is(err, syscall.ENOENT), errors.Is(err, os.ErrNotExist):
		return keyMissing
	case errors.Is(err, syscall.EACCES), errors.Is(err, syscall.EPERM), errors.Is(err, os.ErrPermission):
		return keyDenied
	case errors.Is(err, syscall.ECONNREFUSED):
		return keyRefused
	case errors.Is(err, context.DeadlineExceeded), isTimeout(err):
		return keyTimeout
	}
	return keyConnection
}

func isTimeout(err error) bool {
	var ne net.Error
	return errors.As(err, &ne) && ne.Timeout()
}
