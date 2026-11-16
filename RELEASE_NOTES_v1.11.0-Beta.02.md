**A clearer window for adding services**

This is a beta of 1.11.0, offered only to installations on the beta channel.

### Changed
- **The window that adds a host's services to the board is rebuilt.** It sorts what it finds into three groups: **To add**, **Already on your board** and **Ignored**, the last two folded away until you open them. Each row says in words what it is, whether its address answers, and what you can do: **Edit**, **Ignore**, **Stop ignoring**, **Add anyway**.
- **Ignoring is now your choice, made on the row.** Beta.01 guessed it for you: whatever you left unticked was remembered as set aside. That is gone. What Beta.01 had set aside now shows in the **Ignored** group, so you can bring any of it back with **Stop ignoring**.
- **Name the section.** A field next to the board says where the services go. It tells you at once whether a section with that name already exists on the board or the name is free, and leaving it empty keeps the automatic choice. Under it, a preview draws the section the way the board will, with one tile per bookmark, and follows what you tick and rename.
- **Docker no longer asks anything up front.** The address the ports are built on is a line in the list, with a button to change it, and the one section per Compose project switch only appears when the host has Compose projects.
- **With several Docker hosts or several hypervisors,** a dropdown between the search and the tick buttons switches between them. The search and the buttons stay in place, shaded, while a host loads or has nothing, so you can always move on to another host.
- **Easier to work through a long list:** the head of the list stays fixed with its count and progress, **Only those that respond** appears when some do and some don't, Ctrl+K goes to the window's search, and a row's actions appear on hover or with the keyboard rather than crowding every row.
- The window is laid out for a phone: the list keeps its room, and the tools wrap instead of scrolling sideways.

### Fixed
- **Closing Preferences could land you on the Proxmox page.** Opening Preferences from a page and then clicking outside it to return to the board sometimes jumped to a page you had visited before. What is on screen is now in the address (`?view=…`), and Back and Forward read it from there, so each returns to what you were looking at.
- When Lastboard opens a window by itself for a host you just added, it now does it once, for the first host that has something to add, and not at all when there is nothing.
