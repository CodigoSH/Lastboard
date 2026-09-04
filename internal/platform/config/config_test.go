package config

import (
	"strings"
	"testing"
)

func env(pairs map[string]string) func(string) (string, bool) {
	return func(key string) (string, bool) {
		value, ok := pairs[key]
		return value, ok
	}
}

func TestCheckReportsSettingsThatWillNotBeUsed(t *testing.T) {
	cases := []struct {
		name string
		set  map[string]string
		want []string // variables expected to be reported
	}{
		{
			name: "the capital letter that turns the proxy off",
			set:  map[string]string{"TRUST_PROXY": "True"},
			want: []string{"TRUST_PROXY"},
		},
		{
			name: "the other ways people write yes",
			set:  map[string]string{"TRUST_PROXY": "yes", "DEMO_ONLY": "1"},
			want: []string{"TRUST_PROXY", "DEMO_ONLY"},
		},
		{
			name: "a port that is not one",
			set:  map[string]string{"PORT": "8O80"},
			want: []string{"PORT"},
		},
		{
			name: "a port outside the range",
			set:  map[string]string{"PORT": "70000"},
			want: []string{"PORT"},
		},
		{
			name: "counts that are not numbers",
			set:  map[string]string{"MAX_ITEMS_PER_USER": "many", "TRUST_PROXY_HOPS": "-1"},
			want: []string{"MAX_ITEMS_PER_USER", "TRUST_PROXY_HOPS"},
		},
		{
			name: "a log format nobody implements",
			set:  map[string]string{"LOG_FORMAT": "yaml"},
			want: []string{"LOG_FORMAT"},
		},
		{
			name: "everything set correctly",
			set: map[string]string{
				"TRUST_PROXY": "true", "DEMO_ONLY": "false", "PORT": "8080",
				"TRUST_PROXY_HOPS": "2", "MAX_ITEMS_PER_USER": "500", "LOG_FORMAT": "json",
			},
		},
		{
			name: "nothing set at all, which is the normal case",
			set:  map[string]string{},
		},
		{
			name: "set but empty is the same as unset",
			set:  map[string]string{"TRUST_PROXY": "", "PORT": "", "LOG_FORMAT": ""},
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			problems := Check(env(c.set))

			if len(problems) != len(c.want) {
				t.Fatalf("reported %d problems, want %d: %v", len(problems), len(c.want), problems)
			}
			for _, variable := range c.want {
				found := false
				for _, p := range problems {
					if p.Variable == variable {
						found = true
						// The message has to name the value and say what
						// happens instead, or it is just noise in a log.
						if !strings.Contains(p.String(), c.set[variable]) || p.Effect == "" {
							t.Errorf("the report for %s does not say what was found and what will happen: %q",
								variable, p.String())
						}
					}
				}
				if !found {
					t.Errorf("%s=%q was not reported", variable, c.set[variable])
				}
			}
		})
	}
}
