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
	src, err := os.ReadFile("monitor.go")
	if err != nil {
		t.Fatal(err)
	}
	keys := regexp.MustCompile(`setSetting\("(monitoring_[a-z_]+)"`).FindAllStringSubmatch(string(src), -1)
	if len(keys) == 0 {
		t.Fatal("found no monitoring settings in monitor.go: this test is reading the wrong file")
	}
	for _, k := range keys {
		if _, ok := backupSettingKeys[k[1]]; !ok {
			t.Errorf("monitor.go writes %s, which the backup does not carry", k[1])
		}
	}
}
