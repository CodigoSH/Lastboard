# Release Signing

Lastboard verifies release integrity with SHA-256 checksums. Checksums alone,
however, are downloaded from the **same** server as the binary — so a
compromise of that server could serve a malicious binary together with a
matching `checksums.txt`. Release signing closes that gap: `checksums.txt` is
signed with an **Ed25519** private key that never lives on the release server,
and clients verify the signature against a public key **embedded in the
binary**. A tampered release cannot produce a valid signature.

Signing uses only the Go standard library (`crypto/ed25519`) — no GPG, cosign,
or external services — to stay self-contained and dependency-free.

## Status: opt-in

Signing ships **disabled**. Until you complete the key ceremony below,
`internal/web/util/signature.go` has an empty `releasePublicKey` and the
auto-updater keeps working exactly as before (checksum-only). Once a public key
is embedded, the updater additionally verifies `checksums.txt.sig`.

## Key ceremony (one-time)

Everything uses the project's own tool, `cmd/sign` (Ed25519, stdlib only).

1. **Generate a keypair** on a trusted machine:

   ```bash
   go run ./cmd/sign keygen
   ```

   It prints a base64 **private** key and a base64 **public** key.

2. **Store the private key** as a CI secret named `RELEASE_SIGNING_KEY` in the
   Forgejo repo settings. It must never be committed or leave your control.

3. **Embed the public key**: paste it into `releasePublicKey` in
   `internal/web/util/signature.go`, commit, and release. From this release on,
   `SigningConfigured()` returns true and clients verify signatures.

That's it. The release workflow (`.forgejo/workflows/release.yml`) already:

- signs `artifacts/checksums.txt` with `RELEASE_SIGNING_KEY` (skipped, with a
  log line, if the secret is absent), and
- uploads `checksums.txt.sig` next to `checksums.txt`.

## How verification works (auto-updater)

In `PerformUpdate` (`internal/web/api/update.go`), after downloading
`checksums.txt` and before trusting it:

- If signing is **not** configured (no embedded key) → checksum-only, unchanged.
- If configured and `checksums.txt.sig` is **present** → verify it against the
  embedded key; a bad signature **aborts** the update
  (`notifier.update_signature_failed`).
- If configured but the `.sig` is **missing** (e.g. a pre-signing release) →
  a warning is logged and it falls back to checksum-only, so enabling signing
  never breaks updates during rollout.

**Hardening once fully rolled out:** after every reachable release is signed,
change the missing-`.sig` branch in `PerformUpdate` from a warning to a hard
failure, so an attacker cannot strip the signature to force the fallback.

## Rotating the key

Generate a new keypair, update `RELEASE_SIGNING_KEY` and the embedded
`releasePublicKey`, and cut a release. Clients pick up the new key when they
update to that release.

## install.sh (follow-up)

The first-time installer (`install.sh`) currently verifies checksums only.
Because it is a manual, one-time step (unlike the auto-updater, which replaces a
running binary unattended), signature verification there is optional. To verify
manually after download, convert the public key to PEM and use OpenSSL ≥ 1.1.1:

```bash
# raw base64 pubkey -> PEM (Ed25519 SPKI prefix 302a300506032b6570032100)
printf '302a300506032b6570032100%s' "$(echo "<BASE64_PUBKEY>" | base64 -d | xxd -p -c256)" \
  | xxd -r -p | { printf -- '-----BEGIN PUBLIC KEY-----\n'; base64; printf -- '-----END PUBLIC KEY-----\n'; } > pub.pem
base64 -d checksums.txt.sig > checksums.sig.bin
openssl pkeyutl -verify -pubin -inkey pub.pem -rawin -in checksums.txt -sigfile checksums.sig.bin
```
