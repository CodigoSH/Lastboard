**Podman as well as Docker, and the twenty languages read again**

### Added
- A host says whether it runs Docker or Podman, a local host takes the path of its socket, and a failed connection says why
- Say that a host is connected when it has nothing new to add
- The add-widget gallery uses compact rows and fits a phone
- The engine a host reports is shown and corrects the one chosen on the form
- The engine of a host is two centered buttons, Docker and Podman, not a dropdown
- The names people see say Docker / Podman
- The remaining Docker-only sentences name Podman too

### Fixed
- A one-app Compose stack is named by the stack, not by a role in it
- A Podman container's failing health check shows in the list, where Podman reports it
- A Podman pod's infra container is not listed or counted
- Arabic translates the host-type labels and fixes a grammar slip and a garbled placeholder
- Ask a direct host for the disk records, which newer engines leave out by default
- Ask search engines not to list any page of an instance, not only the demo
- Bengali reads more naturally and uses its own digits in length messages
- Chinese addresses the reader as 你 throughout and uses one word for sections
- Clearer wording for the load-failure message, the API widget's CORS hint and the unit options in all languages; docs say why the Docker chart is live
- Container icons chosen at the same time are all kept
- Dutch speaks to the reader as je throughout and fixes typos and stiff wording
- Engine corrections checked together no longer overwrite each other
- French addresses the reader as vous throughout, says signet for bookmark, and fixes typos
- German speaks to the reader as du throughout and replaces stiff or unclear wording
- Greek addresses the reader as σας throughout, translates the remaining English labels and fixes typos
- Hindi separates adding from linking, fixes the accent-colour label and stray Latin letters
- Indonesian uses Anda throughout, one word for bookmark, and plainer wording
- Italian loses leftover Spanish phrases and gets plainer wording
- Japanese loses stilted phrasing, a doubled bracket and a company-network wording
- Korean uses one polite register, drops stray full-width stops, and plainer wording
- Machine icons chosen at the same time are all kept
- Persian uses the real word for host, translates the host-type labels and reads more naturally
- Polish uses hiperwizor, fixes a typo and the minimum-length wording, and softens stiff phrasing
- Portuguese is Brazilian throughout, addresses the reader as você, and loses Spanish leftovers
- Remove stray characters from other scripts in Arabic, Bengali, Hindi and Korean
- Russian uses one word for icons, fixes minimum-length plurals, and plainer wording
- Services ignored with quick clicks are all kept
- The avatar of the wizard says its text in the language, not the key
- The disk card reads the shape of /system/df that newer engines and Podman answer, and still the older one
- The minimum password in 19 languages, the first account, and the Spanish wording
- The window that adds services to the board has something to offer for Proxmox
- Turkish addresses the reader as siz throughout and uses parola consistently
- Urdu loses a Bengali-script slip, a typo and stiff phrasing

### Changed
- Check the copy of the database with quick_check, which takes a quarter of the time
- Each widget's settings form is a template of its own
- Judging and building a saved host are functions of their own, with tests
- Drop an unused list of error keys
