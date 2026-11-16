package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"os/signal"
	"syscall"

	"golang.org/x/term"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
)

// secretReader asks the person at the keyboard for something that must not be
// shown or kept: a terminal in the real command, a script in the tests.
type secretReader interface {
	Terminal() bool
	Ask(prompt string) ([]byte, error)
}

// console is the terminal the command was started from.
type console struct{ fd int }

func (c console) Terminal() bool { return term.IsTerminal(c.fd) }

// Ask writes the prompt and reads what is typed without echoing it.
//
// term.ReadPassword puts the echo back when it returns, but an interrupt ends
// the process before it can — and a shell left not showing what is typed looks
// broken. So a Ctrl+C puts the terminal back first.
func (c console) Ask(prompt string) ([]byte, error) {
	fmt.Fprint(os.Stderr, prompt)
	state, err := term.GetState(c.fd)
	if err != nil {
		return nil, err
	}
	interrupted := make(chan os.Signal, 1)
	signal.Notify(interrupted, os.Interrupt, syscall.SIGTERM)
	done := make(chan struct{})
	defer func() { signal.Stop(interrupted); close(done) }()
	go func() {
		select {
		case <-interrupted:
			term.Restore(c.fd, state)
			fmt.Fprintln(os.Stderr)
			os.Exit(130)
		case <-done:
		}
	}()
	secret, err := term.ReadPassword(c.fd)
	fmt.Fprintln(os.Stderr)
	return secret, err
}

// resetPassword is `lastboard password reset <username>`: the way back for an
// account whose password is forgotten — above all the administrator's, which
// nobody else can reset. The password is asked for on the terminal, twice, so it
// never reaches the shell's history or the process list.
func resetPassword(ctx context.Context, db *database.DB, username string, in secretReader, out, errOut io.Writer) int {
	if !in.Terminal() {
		fmt.Fprintln(errOut, "lastboard: this asks for the new password and needs a terminal; in Docker, run it with docker exec -it")
		return 1
	}
	// Before asking for a password nobody will use.
	if err := api.AccountExists(ctx, db.DB, username); err != nil {
		fmt.Fprintf(errOut, "lastboard: %v\n", err)
		return 1
	}
	first, err := in.Ask(fmt.Sprintf("New password for %s: ", username))
	if err != nil {
		fmt.Fprintf(errOut, "lastboard: reading the password: %v\n", err)
		return 1
	}
	defer clear(first)
	second, err := in.Ask("Type it again: ")
	if err != nil {
		fmt.Fprintf(errOut, "lastboard: reading the password: %v\n", err)
		return 1
	}
	defer clear(second)
	if !bytes.Equal(first, second) {
		fmt.Fprintln(errOut, "lastboard: the two passwords are not the same; nothing was changed")
		return 1
	}
	if err := api.ResetPassword(ctx, db.DB, username, string(first)); err != nil {
		fmt.Fprintf(errOut, "lastboard: %v\n", err)
		return 1
	}
	fmt.Fprintf(out, "The password of %s is changed, and every session that account had is closed.\n", username)
	return 0
}
