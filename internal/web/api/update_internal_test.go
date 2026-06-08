package api

import "testing"

// Characterization tests for compareVersions, the pure comparator behind the
// update system. compareVersions(v1, v2) reports whether v1 is strictly newer
// than v2. These lock in current behavior — including the known lexical
// limitation for multi-digit pre-release numbers — before any refactor.

func TestCompareVersions(t *testing.T) {
	cases := []struct {
		name   string
		v1, v2 string
		want   bool
	}{
		{"patch newer", "v1.5.2", "v1.5.1", true},
		{"patch older", "v1.5.1", "v1.5.2", false},
		{"equal", "v1.5.1", "v1.5.1", false},
		{"major newer", "v2.0.0", "v1.9.9", true},
		{"minor newer", "v1.6.0", "v1.5.9", true},
		{"no v prefix", "1.5.2", "1.5.1", true},
		{"mixed prefix", "v1.5.2", "1.5.1", true},

		// Same core: a stable release is newer than any pre-release of it.
		{"stable beats prerelease", "v1.5.2", "v1.5.2-Beta.1", true},
		{"prerelease loses to stable", "v1.5.2-Beta.1", "v1.5.2", false},
		{"equal prerelease", "v1.5.2-Beta.1", "v1.5.2-Beta.1", false},

		// Same core, two pre-releases: compared lexically (lowercased).
		{"prerelease lexical higher", "v1.5.2-Beta.2", "v1.5.2-Beta.1", true},
		{"rc beats beta lexically", "v1.5.2-RC.1", "v1.5.2-Beta.1", true},

		// KNOWN LIMITATION (documented, not fixed here): pre-release numbers are
		// compared as strings, so "beta.10" sorts BEFORE "beta.9".
		{"lexical limitation double digit", "v1.5.2-Beta.10", "v1.5.2-Beta.9", false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := compareVersions(tc.v1, tc.v2); got != tc.want {
				t.Errorf("compareVersions(%q, %q) = %v, want %v", tc.v1, tc.v2, got, tc.want)
			}
		})
	}
}
