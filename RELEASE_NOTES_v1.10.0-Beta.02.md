**A rebuilt status page, Docker storage and host sizes, and the sessions in their own dialog**

### Added
- A container gets a face and a bookmark of its own; a stopped one a bookmark depends on is a warning; the card's state dot sits at its far edge and the panel's no longer shows a help cursor
- A green dot marks the sessions in use in the last five minutes
- A shared shell for the infrastructure pages — header, tabs, indicators, inventory, drawer and chart
- An uptime reads in days, then months, then years
- Closing a session asks first, naming the device and its address; the close-all action has room and a rule above it
- Hosts are buttons beside All, as in the design, with a selector only beyond two
- One "runs on" field with a None / Proxmox / Docker switch and the list for the chosen one, with plainer hints; the host selectors of both pages say "All"
- Outages and checks are tables with named columns and short words; the monitoring card says nothing of alerts until they are turned on
- Outages read in words and minutes — what it was, how long it was down and that it works again — with a window for the full list; the side panel shows the lines that matter and scrolls without cutting its cards
- Read the CPU and memory against the real size of the host, when the host says it
- Rebuild the Docker page on the shared shell — overview, inventory, side drawer and a log tab
- Rebuild the Proxmox page on the shared shell — overview, machines, storage, tasks, system log and a side panel
- Rules for the new overview — attention, totals, session history and inventory filters
- The active sessions open in their own dialog, one line each with a scroll, and the card in My profile only says how many there are
- The agent's version beside its host, with a note when it is too old; the host editor's switch row fits; state is a dot in the side panels and the bookmark sits by the name
- The container list carries health, exit code and Compose project
- The containers card shows how many are running, as the machines card does
- The CPU indicator says cores and threads and memory has its miniature; changing page puts the side panel away
- The CPU tile says the cores and the threads of the hosts when their agents report the cores, and the threads alone otherwise
- The fourth indicator is what Docker holds on disk and how much of it nothing uses; the host's disk summary is read through a new agent call
- The fourth indicator lists the containers that use the most, instead of repeating the attention list
- The overview says where a service lives, how it did over a week and a month and since when it is down; new reads for the fleet's trend and for every outage across services
- The page's selectors use the product's own select, sized to their content; the top-bar icon is the open cube
- The sessions dialog reads as a table — column heads, this device first and highlighted, rows of one height, a count in the title and the close-all action in red at the end
- The status page is rebuilt on the shell of the Docker and Proxmox pages — overview with four indicators, chart and attention list, a services inventory and an outages tab, with a side panel for each service
- The storage tile keeps one "see more" chip and the items open in a window of their own

### Fixed
- A box's count sits beside its name; an uptime counts in years, months and days and shortens only where it does not fit
- A click on bare page closes the side panel; project and host cards act on the page instead of opening an empty one
- An outage in progress reads Down, not In progress; the status-page button leaves the monitoring preferences and the failures-before-alert setting is always shown
- Beside the chart, the attention box is as tall as the chart's card and its list scrolls inside
- Cards keep their own width, so opening the side panel no longer swells them
- Counts on the Docker and Proxmox pages read "label: number", so they are right for one and for many in every language
- Every service card keeps its status in a block of fixed height and the heartbeat at the foot, so the heartbeats line up across a row
- Host cards show CPU and RAM as shares, tags sit by the name, nodes on one line, stores in columns, one grey clear cross in every search box
- Outages list what is down first and then the newest; the head of a long list stays in view while it scrolls; the indicator tiles of every status page share their rows
- The attention list shows up to nine rows and scrolls beyond them; the chart's card stretches to match
- The CPU indicator has its bar and the memory indicator its miniature
- The fourth indicator is Attention, sparklines take their level's colour, project cards keep their chips on one line
- The grey tag of a card sits at its right edge again
- The header of both pages and the host lines say the same word for running; Spanish and French use it for a single item too
- The overview follows the design — two-line history with a range chooser, node, project and host cards, spaced drawer head
- The page no longer animates the room the side panel takes, so the cards stop hopping between columns
- The sessions table's column heads sit outside the scrolling list on fixed columns, so they always line up, the accent of the last-active head shows, and the rule above the close-all button is gone

