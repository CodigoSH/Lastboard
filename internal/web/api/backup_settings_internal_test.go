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
