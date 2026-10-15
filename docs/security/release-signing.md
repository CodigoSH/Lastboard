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

## Status: enabled

Signing is **on**. `internal/web/util/signature.go` carries a release public
key, so the auto-updater verifies `checksums.txt.sig` against it, and the
release workflow refuses to publish without a signature — a release nobody can
verify is worse than none, because the updater would silently fall back to
checksums alone.

**Forks start unsigned.** Empty `releasePublicKeys` and the updater behaves as
it did before signing existed: checksum-only, no warning, and the workflow
publishes without a signature. Complete the ceremony below to turn it on.

## Key ceremony (one-time)

Everything uses the project's own tool, `cmd/sign` (Ed25519, stdlib only).

1. **Generate a keypair** on a trusted machine:

   ```bash
   go run ./cmd/sign keygen
   ```

   It prints a base64 **private** key and a base64 **public** key.

2. **Store the private key** as a CI secret named `RELEASE_SIGNING_KEY` in the
   Forgejo repo settings. It must never be committed or leave your control.

3. **Embed the public key**: add it to `releasePublicKeys` in
   `internal/web/util/signature.go`, commit, and release. From this release on,
   `SigningConfigured()` returns true, clients verify signatures, and the
   workflow will not publish without the secret. `go run ./cmd/sign configured`
   reports which state a build is in.

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
- If configured but the `.sig` is **missing** → the update **aborts**
  (`notifier.update_signature_failed`). There is no fallback to checksum-only:
  an attacker who controls the download cannot strip the signature to weaken
  the check. Every release the updater can reach is signed.

Once the signature has made `checksums.txt` trustworthy, the downloaded archive
must match **the line of that file that names it** (`lastboard-linux-amd64.tar.gz`
and so on): every platform's hash is in the file, and one platform's archive
cannot stand in for another's.

## Rotating the key

A binary can only verify with the keys it was built with. Replacing the key
outright would leave every installation still on an older build unable to verify
the next release — the auto-updater would refuse it, and the people furthest
behind would be the ones stuck. So rotation overlaps:

1. Generate a new keypair. Add the **new public key** to `releasePublicKeys` in
   `internal/web/util/signature.go`, after the current one, and cut a release.
   Releases are still signed with the **old** private key, so nothing changes
   for anyone yet.
2. Give that release time to reach installations. Then switch the CI secret
   `RELEASE_SIGNING_KEY` to the new private key. Anyone on step 1's release or
   later verifies it with the new key; anyone still on an older one verifies
   nothing new, but was already going to update to step 1's release first.
3. In a later release, drop the retired key from the list.

Both keys verify while the list holds both, which is what makes the middle step
safe.

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

## Reproducing a release yourself

A signature proves a binary came from this project's CI. It does not prove the
binary matches the source code you can read. Reproducible builds close that gap:
anyone can rebuild a published release and check that the result is identical,
byte for byte.

Every released binary is built with `-trimpath` (no build-machine paths baked
in), with `CGO_ENABLED=0` and an explicit `GOOS`/`GOARCH`, on the Go toolchain
pinned in `go.mod`. The embedded frontend bundle carries a cache-busting stamp
derived from the **hash of the built assets themselves**, paths included — not
from the clock — so the same sources always produce the same bundle, and any
change to any asset produces a new one.

To reproduce, for example, `v1.7.0` for `linux/amd64`:

```bash
git clone https://git.codigosh.com/CodigoSH/Lastboard.git
cd Lastboard
git checkout v1.7.0

# The frontend, stamped with the hash of its own output
bun install
bun run web/build.ts

# The binary, with the same flags the release workflow uses
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath \
  -ldflags "-s -w -extldflags '-static' -X git.codigosh.com/CodigoSH/Lastboard/internal/version.Current=v1.7.0" \
  -o lastboard ./cmd/lastboard

sha256sum lastboard
```

The hash must match the entry for `lastboard-linux-amd64` in the release's
`checksums.txt`. Use the same Go and Bun versions as the release workflow
(`.forgejo/workflows/release.yml`); a different Go minor version produces a
different, equally valid binary, but it will not match the published hash.

## Inventory of dependencies

Every binary carries its own dependency list. No separate file to trust:

```bash
go version -m lastboard
```

It prints the Go version, the build flags used, the VCS revision the binary was
built from, and every module with its version and checksum — which you can
compare against `go.sum` in the tagged source.
