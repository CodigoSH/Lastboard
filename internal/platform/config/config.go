// Package config checks the environment Lastboard was started with.
//
// The variables themselves are read where they are used. What is missing
// without this is any sign that a value was wrong: every setting here falls
// back to a default when it cannot be understood, so TRUST_PROXY=True — a
// capital letter — silently means false, and everyone behind the proxy shares
// one address, one rate-limit bucket and one lockout. The setting looks set.
// Nothing says otherwise.
//
// So the values are checked once at startup and anything unusable is reported,
// naming the variable, what was found and what will be used instead.
package config

import (
	"fmt"
	"os"
	"strconv"
)

// Problem is one setting that will not be used as written.
type Problem struct {
	Variable string
	Value    string
	Reason   string
	Effect   string
}

func (p Problem) String() string {
	return fmt.Sprintf("%s=%q %s; %s", p.Variable, p.Value, p.Reason, p.Effect)
}

// Check reports the settings that are present but unusable. A variable that is
// not set at all is not a problem: that is what defaults are for.
func Check(lookup func(string) (string, bool)) []Problem {
	var problems []Problem

	report := func(variable, value, reason, effect string) {
		problems = append(problems, Problem{variable, value, reason, effect})
	}

	// Booleans are compared against the exact string "true" at their call
	// sites, so anything else means off — including "True", "yes" and "1",
	// which is what someone writing them expected to mean on.
	for _, variable := range []string{"TRUST_PROXY", "DEMO_ONLY"} {
		if value, ok := lookup(variable); ok && value != "true" && value != "false" && value != "" {
			report(variable, value, "is not \"true\" or \"false\"", "it will be treated as false")
		}
	}

	if value, ok := lookup("PORT"); ok && value != "" {
		if port, err := strconv.Atoi(value); err != nil || port < 1 || port > 65535 {
			report("PORT", value, "is not a port number", "the server will fail to listen")
		}
	}

	for _, variable := range []string{"TRUST_PROXY_HOPS", "MAX_ITEMS_PER_USER", "PUID", "PGID"} {
		if value, ok := lookup(variable); ok && value != "" {
			if n, err := strconv.Atoi(value); err != nil || n < 0 {
				report(variable, value, "is not a whole number", "the built-in default will be used")
			}
		}
	}

	if value, ok := lookup("LOG_FORMAT"); ok && value != "" && value != "json" && value != "text" {
		report("LOG_FORMAT", value, "is neither \"json\" nor \"text\"", "logs will be plain text")
	}

	// Signing in through a proxy reads three settings together.
	_, proxyProblems := ReadAuthProxy(lookup)
	problems = append(problems, proxyProblems...)

	return problems
}

// CheckEnvironment checks the process's own environment.
func CheckEnvironment() []Problem {
	return Check(os.LookupEnv)
}
