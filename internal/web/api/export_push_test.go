package api

// AllowAnyPushEndpointForTest lets the Web Push sender and the subscribe route accept the address of
// a push service a test serves itself, which is not on any maker's domain. It returns what puts the
// real rule back.
func AllowAnyPushEndpointForTest() (restore func()) {
	old := pushEndpointOK
	pushEndpointOK = func(string) bool { return true }
	return func() { pushEndpointOK = old }
}
