**First beta of the 1.7 cycle: the status page comes to the dashboard.**

### Added

- **Monitoring widget.** The services you monitor, on the board itself: status, uptime over the last 24 hours, the latency of the last check and a heartbeat. Clicking a row opens the same history drawer as the status page. Pick which services it shows — leaving them all ticked means "everything", so services you start monitoring later appear on their own.

### Changed

- **The status endpoint stops reading a day of history per service.** It used to load every check of the last 24 hours for every monitored service and throw all of it away except an average and the last 30 checks. With 50 services at a 30-second interval that was 144.000 rows and about 440 ms per request; it is now ~55 ms, and the status page benefits from it too, not just the widget.
- **One header for every widget.** Docker's header and the new widget's are now the same style, defined in one place.
- **Clearing monitoring history says what it clears.** The menu options named the service ("This service"), which read as deleting the service itself; they now name the history. The two buttons in that drawer are smaller, and hidden on phones where they were only in the way.

### Fixed

- The refresh control in the widget's settings used the browser's own dropdown instead of the one every other setting uses.
- Two labels rendered as raw translation keys.

---

**What to try:** enable 24/7 monitoring, tick *Check status* on a few bookmarks, then add the Monitoring widget. It is worth resizing it — the rows fold to two lines when narrow and to one when there is room.

This is a beta. Back up your data before updating.
