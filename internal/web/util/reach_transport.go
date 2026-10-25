package util

import "net/http"

// ByReach is a transport that keeps the connections made for accounts that may
// only reach the internet apart from everybody else's.
//
// The local network is refused in the dialer (see InternetOnly), and a dialer only
// runs when a connection is opened. A transport keeps connections open and hands
// them to the next request for the same host, so a request for an internet-only
// account would ride, unchecked, on a connection another account opened to a
// machine on the local network. Two pools close that: a connection in the
// internet-only one was only ever opened under the check.
//
// build is called twice, once per pool, so the two never share anything.
func ByReach(build func() *http.Transport) http.RoundTripper {
	return &byReach{everyone: build(), internetOnly: build()}
}

type byReach struct {
	everyone, internetOnly *http.Transport
}

func (b *byReach) RoundTrip(req *http.Request) (*http.Response, error) {
	if IsInternetOnly(req.Context()) {
		return b.internetOnly.RoundTrip(req)
	}
	return b.everyone.RoundTrip(req)
}

// CloseIdleConnections lets http.Client.CloseIdleConnections reach both pools.
func (b *byReach) CloseIdleConnections() {
	b.everyone.CloseIdleConnections()
	b.internetOnly.CloseIdleConnections()
}
