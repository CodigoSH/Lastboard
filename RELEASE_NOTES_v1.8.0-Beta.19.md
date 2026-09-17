**The container image is back**

If you follow the beta channel by container, this is the release to take:
v1.8.0-Beta.18 published its binaries, its checksums and its signature, but no
image. Nothing was wrong with it — the job that builds the image died before it
started, on its own first step.

### Fixed

- The image build installed two packages it did not need. The runner image
  already ships them, and the Debian release it is built on has gone out of
  support, so its package index now promises files the mirror has stopped
  serving. The install runs only if they are genuinely missing, which on this
  runner means never. Beta.18 was the first release to hit it; any release after
  it would have hit it too.

### Unchanged

- Everything in Lastboard itself, since Beta.17. These two releases exist to
  repair the machinery that publishes them.
