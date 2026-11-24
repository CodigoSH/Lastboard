package api

// SetBinaryReplaceable says, for a test outside the package, whether this
// process may replace its own binary. The returned function puts it back.
func SetBinaryReplaceable(can bool) (restore func()) {
	was := binaryReplaceable
	binaryReplaceable = func() bool { return can }
	return func() { binaryReplaceable = was }
}
