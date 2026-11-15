### Added
- In Monitoring, an incident's "When" column still says how long ago it began, and now shows the exact date and time when the pointer rests on it.

### Fixed
- A device whose push notifications stopped arriving because the browser's push service dropped its subscription is put back on your list the next time Lastboard opens on it, as long as the browser still holds the subscription and the permission. Before, it stayed silent until you pressed **Enable** again. A device you remove from another device's list comes back the same way the next time it opens Lastboard; to switch one off for good, turn push off on that device itself.

### Changed
- A push alert goes to all of an account's devices at once instead of one after another, so a slow push service no longer delays the alert on the others.
