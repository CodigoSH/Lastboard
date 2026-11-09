### Added
- **Push notifications** as a way to receive monitoring alerts, off until you turn them on in Preferences. They reach a phone or a computer even when Lastboard is closed, and each account chooses which of its devices receive them. The notice travels through the browser's own push service (Google, Mozilla, Apple or Microsoft, depending on the browser), and the security page says what that means. It needs the panel to be served over HTTPS.
- **Alerts in the language of the account, with your own wording.** An outage or a recovery is written in the language of the account that owns the service, in all 20 languages, for ntfy, Gotify, webhooks and push alike. Each account can also write its own texts from Preferences, with the service name, the reason and the duration filled in.
- **One click between the pages.** Monitoring, Docker, Proxmox and Preferences open one at a time: pressing another one's icon goes straight to it, and pressing the open one's goes back to the board. The pencil now closes whatever is open and starts editing, and choosing another board brings the board back. A line in the bar separates the board's controls from the pages, and the board selector's tooltip names the board you are on.

### Changed
- **Webhook alerts carry a `title`, and their `message` is now the translated text** instead of a fixed English sentence. `service`, `status` and `timestamp` are unchanged. If something of yours reads `message`, check it.
- The Docker, Monitoring and Proxmox pages no longer say how old their data is, nor that the refresh is paused by the data saver. The refresh still stands down while it is on.

### Fixed
- Forward in the browser now brings back a page you left with Back or closed with its ×: before, the button was lit and did nothing. Preferences is part of the history too, so Back, and the swipe from the edge of a phone, closes it.
