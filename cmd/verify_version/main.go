package main

import (
	"fmt"
	"strconv"
	"strings"
)

func main() {
	tests := []struct {
		candidate string
		current   string
		expected  bool
	}{
		{"v1.1.8-Beta.01", "v1.1.7", true},
		{"v1.1.8-Beta.01", "v1.1.7-RC.1", true},
		{"v1.1.8-Beta.01", "v1.1.7-Beta.14", true},
		{"v1.1.7-RC.1", "v1.1.7-Beta.14", true},  // RC > Beta
		{"v1.1.7-Beta.14", "v1.1.7-RC.1", false}, // Beta < RC
		{"v1.1.7-RC.1", "v1.1.7-beta.14", true},  // RC > beta (case insensitive)
		{"v1.1.8-Beta.02", "v1.1.8-Beta.01", true},
		{"v1.1.8-Beta.01", "v1.1.8-Beta.01", false},
	}

	for _, t := range tests {
		result := isNewerVersion(t.candidate, t.current)
		status := "FAIL"
		if result == t.expected {
			status = "PASS"
		}
		fmt.Printf("[%s] %s vs %s -> %v (Expected: %v)\n", status, t.candidate, t.current, result, t.expected)
	}
}

// Copy-pasted function from update.go
func isNewerVersion(candidate, current string) bool {
	parse := func(v string) (int, int, int, string) {
		v = strings.TrimPrefix(v, "v")
		parts := strings.SplitN(v, "-", 2)
		main := parts[0]
		suffix := ""
		if len(parts) > 1 {
			suffix = parts[1]
		}

		nums := strings.Split(main, ".")
		get := func(i int) int {
			if i >= len(nums) {
				return 0
			}
			n, _ := strconv.Atoi(nums[i])
			return n
		}
		return get(0), get(1), get(2), suffix
	}

	cMaj, cMin, cPat, cSuf := parse(candidate)
	curMaj, curMin, curPat, curSuf := parse(current)

	if cMaj != curMaj {
		return cMaj > curMaj
	}
	if cMin != curMin {
		return cMin > curMin
	}
	if cPat != curPat {
		return cPat > curPat
	}

	if cSuf == "" && curSuf != "" {
		return true
	}
	if cSuf != "" && curSuf == "" {
		return false
	}
	if cSuf == "" && curSuf == "" {
		return false
	}

	parseSuffix := func(s string) (string, int) {
		parts := strings.Split(s, ".")
		name := parts[0]
		ver := 0
		if len(parts) > 1 {
			ver, _ = strconv.Atoi(parts[1])
		}
		return name, ver
	}

	cName, cVer := parseSuffix(cSuf)
	curName, curVer := parseSuffix(curSuf)

	cNameLower := strings.ToLower(cName)
	curNameLower := strings.ToLower(curName)

	if cNameLower != curNameLower {
		return cNameLower > curNameLower
	}

	return cVer > curVer
}
