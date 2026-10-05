package arch

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// The release number is written in five places the release script rewrites
// together, and compiled into every published binary and image through a linker
// flag. The script checks each rewrite as it makes it; nothing watched the
// numbers between releases, or that the linker flag still points at a variable
// that exists. Both fail silently: a renamed variable makes -X do nothing and
// every image reports the version that happened to be in the source.

func readRepo(t *testing.T, rel string) string {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("..", "..", rel))
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}

func firstMatch(t *testing.T, file string, re *regexp.Regexp) string {
	t.Helper()
	m := re.FindStringSubmatch(readRepo(t, file))
	if m == nil {
		t.Fatalf("%s: no match for %s — the file changed shape, so this test is reading nothing", file, re)
	}
	return m[1]
}

func TestTheReleaseNumberAgreesEverywhereItIsStamped(t *testing.T) {
	stamps := map[string]string{
		"package.json":         firstMatch(t, "package.json", regexp.MustCompile(`"version":\s*"([^"]+)"`)),
		"version.go":           firstMatch(t, "internal/version/version.go", regexp.MustCompile(`Current\s*=\s*"([^"]+)"`)),
		"SettingsContent.ts":   firstMatch(t, "web/src/components/ui/SettingsContent/SettingsContent.ts", regexp.MustCompile(`private version = '([^']+)'`)),
		"UpdateService (cur)":  firstMatch(t, "web/src/services/UpdateService.ts", regexp.MustCompile(`current_version: '([^']+)'`)),
		"UpdateService (last)": firstMatch(t, "web/src/services/UpdateService.ts", regexp.MustCompile(`latest_version: '([^']+)'`)),
	}
	want := strings.TrimPrefix(stamps["package.json"], "v")
	for where, got := range stamps {
		if strings.TrimPrefix(got, "v") != want {
			t.Errorf("%s says %q and package.json says %q: the version was stamped in some places and not in others", where, got, want)
		}
	}
}

// TestTheLinkerFlagStillReachesTheVersion: -X names a package path and a
// variable. If either stops existing the build succeeds and the flag does
// nothing.
func TestTheLinkerFlagStillReachesTheVersion(t *testing.T) {
	module := firstMatch(t, "go.mod", regexp.MustCompile(`(?m)^module\s+(\S+)`))
	target := module + "/internal/version.Current"

	// It has to be a var: the linker cannot rewrite a const.
	src := readRepo(t, "internal/version/version.go")
	if !regexp.MustCompile(`(?m)^\s*Current\s*=`).MatchString(src) || strings.Contains(src, "const Current") {
		t.Fatalf("internal/version/version.go no longer declares `Current` as a variable: -X has nothing to set")
	}

	for _, file := range []string{"Dockerfile", ".forgejo/workflows/release.yml"} {
		flags := regexp.MustCompile(`-X\s+(\S+?)=`).FindAllStringSubmatch(readRepo(t, file), -1)
		if len(flags) == 0 {
			t.Errorf("%s no longer stamps a version with -X: what it publishes would report the source's number", file)
		}
		for _, f := range flags {
			if f[1] != target {
				t.Errorf("%s stamps %q but the variable is %q: the flag would do nothing", file, f[1], target)
			}
		}
	}

	// The image's default is a marker, never a release: a build with no
	// argument must not claim to be one.
	if got := firstMatch(t, "Dockerfile", regexp.MustCompile(`(?m)^ARG VERSION=(\S+)`)); got != "dev" {
		t.Errorf("Dockerfile defaults VERSION to %q; a build with no argument would claim to be that release", got)
	}
}
