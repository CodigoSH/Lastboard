**Widgets that read and open the page**

### Added
- The Docker, Proxmox and Monitoring tiles share one look: a line of totals under the name, a row per item with its icon, name and readings, and a foot with the count and a link to the page
- Click a row, or the link, and the page opens on the matching tab with that item in its side panel; Back closes the panel and then the page
- CPU, memory and disk (CPU and memory for Docker) can be turned on and off one by one, in the totals and in every row; the link to the page can be hidden
- An item has a name of its own in the tile, and a Monitoring service can have an icon of its own
- Each Proxmox machine says what its own disk holds and how big it is, where Proxmox says so
- The overview lists that name a service or a container wear its icon in place of the status dot
- Back walks through a page's tabs and panel before it leaves it; the outages tab summarises who suffered most and the longest outage; the Proxmox storage tab has cards or a list
- The outages and tasks tabs gather by service or machine, as cards or a list, and open the panel on what happened; what a card paints red is what Needs attention lists
- The Docker, Monitoring and Proxmox pages say how old their data is, pause their own refresh while the browser asks to save data and never start a round on top of one in progress

### Changed
- The tiles only read: starting, stopping and restarting is done on the page, and the Proxmox tile no longer writes the node's name. A container's name in the Docker tile is no longer a link; the page's panel opens its service from the bookmark or from the address the container advertises or publishes
- A page opens on what its tile last read, and a tile and a page asking for the same thing at the same moment make one request
- The status page answers in tens of milliseconds, not seconds, however long the history; a service's history is asked folded, so opening one costs a few kilobytes
- A host that does not answer is given six seconds and no more; the nodes of a cluster are asked together; the Proxmox fleet's curve comes in one request
- The CPU and memory of a Docker host are read at once, not at the daemon's pace; the JSON answers of the three pages are compressed

### Fixed
- On a phone the infrastructure pages no longer crowd their content: the header keeps its close button on the line, the side panel scrolls, and outages and checks are two-line rows
- A service's own table of outages has no service or state column and says Down where the length would be
- The page does not start another round of readings on top of one that is still on its way
