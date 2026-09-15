package arch

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// A version that is written down twice can drift, and nothing notices until the
// day it matters.
//
// This does NOT ask the internet whether something newer exists, and that is
// deliberate. A test that goes red because somebody else published a release
// turns a green build red on a day nobody touched the code, needs the network
// to decide, and pushes people to upgrade in a hurry — which is how a
// compromised release gets adopted fastest. Reachable vulnerabilities are
// govulncheck's job and it already blocks on them in CI.
//
// What this checks is the thing that is ours, deterministic and offline: the
// same tool pinned in two files has to be pinned to the same version. The
// release preflight runs staticcheck so a tag that would turn CI red is not
// taggable — and that argument only holds while both numbers agree. The same
// goes for Bun, which the Dockerfile builds the release with and the workflow
// runs the tests with.
type pin struct {
	what  string
	file  string
	find  *regexp.Regexp
	human string
}

func TestPinnedVersionsAgree(t *testing.T) {
	root := filepath.Join("..", "..")

	groups := map[string][]pin{
		"staticcheck": {
			{
				what:  "staticcheck",
				file:  "scripts/release.sh",
				find:  regexp.MustCompile(`STATICCHECK_VERSION="(v[0-9.]+)"`),
				human: `STATICCHECK_VERSION="vX.Y.Z"`,
			},
			{
				what:  "staticcheck",
				file:  ".forgejo/workflows/tests.yml",
				find:  regexp.MustCompile(`honnef\.co/go/tools/cmd/staticcheck@(v[0-9.]+)`),
				human: "go install honnef.co/go/tools/cmd/staticcheck@vX.Y.Z",
			},
		},
		"bun": {
			{
				what:  "Bun",
				file:  "Dockerfile",
				find:  regexp.MustCompile(`oven/bun:([0-9.]+)-alpine`),
				human: "FROM oven/bun:X.Y.Z-alpine",
			},
			{
				what:  "Bun",
				file:  ".forgejo/workflows/tests.yml",
				find:  regexp.MustCompile(`bun-version:\s*"([0-9.]+)"`),
				human: `bun-version: "X.Y.Z"`,
			},
			{
				what:  "Bun",
				file:  "package.json",
				find:  regexp.MustCompile(`"bun-types":\s*"([0-9.]+)"`),
				human: `"bun-types": "X.Y.Z"`,
			},
		},
		"go": {
			{
				what:  "Go",
				file:  "go.mod",
				find:  regexp.MustCompile(`(?m)^go ([0-9.]+)$`),
				human: "go X.Y.Z",
			},
			{
				what:  "Go",
				file:  "Dockerfile",
				find:  regexp.MustCompile(`golang:([0-9.]+)-alpine`),
				human: "FROM golang:X.Y.Z-alpine",
			},
			{
				what:  "Go",
				file:  ".forgejo/workflows/tests.yml",
				find:  regexp.MustCompile(`go-version:\s*'([0-9.]+)'`),
				human: "go-version: 'X.Y.Z'",
			},
		},
	}

	for name, pins := range groups {
		t.Run(name, func(t *testing.T) {
			found := map[string]string{}
			for _, p := range pins {
				body, err := os.ReadFile(filepath.Join(root, p.file))
				if err != nil {
					t.Fatalf("%s pins %s but the file could not be read: %v", p.file, p.what, err)
				}
				m := p.find.FindSubmatch(body)
				if m == nil {
					// Not "no pin, nothing to compare": a pin that moved or was
					// removed is exactly the drift this exists to catch, and a
					// silent pass here would be a test that checks nothing.
					t.Fatalf("no %s version found in %s.\nExpected something like: %s\n"+
						"If the pin moved, move this test with it.", p.what, p.file, p.human)
				}
				found[p.file] = string(m[1])
			}

			var first, firstFile string
			for file, version := range found {
				if first == "" {
					first, firstFile = version, file
					continue
				}
				if version != first {
					t.Errorf("%s is pinned to two different versions:\n  %s: %s\n  %s: %s\n"+
						"They have to agree — a checker that is not the one CI runs proves "+
						"nothing about CI, and an image that is not the one the tests ran "+
						"against is not the image that was tested.",
						pins[0].what, firstFile, first, file, version)
				}
			}
		})
	}
}

// Nothing here may float. A moving tag means the artefact that was tested and
// the artefact that was published are not the same thing, and no test can tell.
func TestNothingIsPinnedToLatest(t *testing.T) {
	root := filepath.Join("..", "..")

	files := []string{
		"Dockerfile",
		"package.json",
		".forgejo/workflows/tests.yml",
		".forgejo/workflows/release.yml",
		"scripts/release.sh",
	}

	// `actions/*@v3` and friends are versions, not floating tags; what is
	// checked here is a literal "latest" as a version or an image tag.
	floats := []*regexp.Regexp{
		regexp.MustCompile(`@latest\b`),
		regexp.MustCompile(`"latest"`),
		regexp.MustCompile(`(?m)^FROM\s+\S+:latest`),
	}

	checked := 0
	for _, name := range files {
		body, err := os.ReadFile(filepath.Join(root, name))
		if err != nil {
			continue // a workflow this project does not have is not a failure
		}
		checked++
		for _, line := range strings.Split(string(body), "\n") {
			trimmed := strings.TrimSpace(line)
			if trimmed == "" || trimmed[0] == '#' {
				continue
			}
			for _, re := range floats {
				if re.MatchString(line) {
					t.Errorf("%s floats on \"latest\":\n  %s\n"+
						"Pin it. The version that built the release has to be the "+
						"version the tests ran against.", name, trimmed)
				}
			}
		}
	}

	// A walk that finds nothing passes, and reports it as success.
	if checked < 3 {
		t.Fatalf("only %d of the files were read — this test is looking in the wrong place", checked)
	}
}
