package api

import (
	"os"
	"regexp"
	"testing"
)

// TestEveryMonitoringSettingTravelsInTheBackup.
//
// A monitoring setting added later and left out of backupSettingKeys would be
// lost on every restore without a word, which is how the notification token
// used to go. This reads the keys the monitor writes and asks for each.
func TestEveryMonitoringSettingTravelsInTheBackup(t *testing.T) {
	src, err := os.ReadFile("user_settings.go")
	if err != nil {
		t.Fatal(err)
	}
	// The constants that name the monitoring keys, whatever they are called.
	values := regexp.MustCompile(`(?m)^\s*key[A-Za-z]+\s*=\s*"(monitoring_[a-z_]+)"`).FindAllStringSubmatch(string(src), -1)
	if len(values) == 0 {
		t.Fatal("found no monitoring settings in user_settings.go: this test is reading the wrong file")
	}
	for _, k := range values {
		if _, ok := userSettingKeys[k[1]]; !ok {
			t.Errorf("an account can save %s, which the backup does not carry", k[1])
		}
	}
}

// Only a later release is newer. The version this binary carries can be a
// release tag, a pre-release, or what git describe stamps on a development
// build, and none of those makes the backups of its own version "newer".
func TestBackupIsNewer(t *testing.T) {
	cases := []struct {
		backup, current string
		want            bool
	}{
		{"v1.10.0", "v1.9.4", true},
		{"v1.9.5", "v1.9.4", true},
		{"v2.0.0", "v1.10.0", true},
		{"v1.9.4", "v1.9.4", false},
		{"v1.9.3", "v1.9.4", false},
		{"v1.10.0-Beta.02", "v1.10.0-Beta.01", false},
		{"v1.9.4", "v1.9.4-50-g0eaa05f", false},
		{"v1.10.0-Beta.01", "v1.9.4-50-g0eaa05f", true},
		{"", "v1.9.4", false},
		{"dev", "v1.9.4", false},
		{"v1.9.4", "dev", false},
	}
	for _, c := range cases {
		if got := backupIsNewer(c.backup, c.current); got != c.want {
			t.Errorf("backupIsNewer(%q, %q) = %v, want %v", c.backup, c.current, got, c.want)
		}
	}
}
