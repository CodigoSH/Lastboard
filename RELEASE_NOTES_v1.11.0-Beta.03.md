**Confirm before adding, and delete a section on its own**

This is a beta of 1.11.0, offered only to installations on the beta channel.

### Changed
- **Adding services to the board asks first.** **Add selected** opens a confirmation that says how many bookmarks go in, in which section and on which board. Once they are made the window closes and a message says how many were added; if some could not be added, the window stays open and says which. This replaces **Undo**, which is gone.
- **A section made for the services is as big as what goes in it.** Two bookmarks make a section 2 wide by 1 high, three make 3 by 1, four make 4 by 1, and past four they wrap onto more rows without leaving cells over (five make 3 by 2). A section that was already on the board keeps its width and gains rows when it needs them.
- **Deleting a section says what it takes with it.** The confirmation now warns that the section and everything inside it are removed.

### Added
- **Only the section.** When the section has something inside, the confirmation offers a switch: turned on, only the section is removed and what was inside stays on the board in the cells where it was drawn, no longer in a section. Bookmarks and widgets alike keep their own size.

### Fixed
- **Deleting a section left its bookmarks in the page's own list** until the page was reloaded. The server had already removed them, but the page kept counting them: a Proxmox machine tied to one of them still showed as having a bookmark, and the window that adds services said it was already on your board. They leave the list with the section now.
