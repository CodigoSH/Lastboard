**One website rebuild, and a release that says when it did not happen**

Nothing in Lastboard itself changed in this release. It exists because the
machinery that publishes releases did, and the only way to prove that kind of
change is to cut one.

### Fixed

- The job that rebuilds the documentation site after a release had a second copy
  of itself in another workflow, and the two had already drifted apart — forty
  lines against thirty-four, sixteen of them different. A fix to one would not
  have reached the other. There is one implementation now, and the release
  dispatches it.
- A rebuild that did not happen no longer reports success. When a release asks
  for one and the deploy hook is not configured, it fails and says so; it still
  skips quietly on a documentation push, so a fork does not go red over a secret
  it was never given. Skipping quietly in both cases is what left the site
  advertising 1.6.2 for nine days after 1.7.0 went out.
