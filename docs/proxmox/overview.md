# Proxmox

Lastboard can read your Proxmox VE host and show it beside the services it runs: the nodes and their load, how full each storage is, and every virtual machine and container — with the bookmark each one serves.

![The Proxmox page](../assets/proxmox.png)

That last part is the point. Your Proxmox console at `:8006` already administers the cluster, and it does it better. What it cannot tell you is that *Plex* stopped answering because container 106 is down, because it has never heard of your bookmarks. This page can.

## What Lastboard needs

One API token, read-only if you want it to be. Lastboard never asks for a Proxmox password, keeps nothing about your machines, and stores no history: every figure on the page is read from the host when you open it.

### 1. Create the token on your Proxmox host

Run this over SSH on any node, as `root`. It creates a user, a role with the permissions Lastboard actually uses, and a token bound to that user:

```bash
# A role with exactly what Lastboard uses, and nothing else
pveum role add Lastboard --privs "Sys.Audit Datastore.Audit VM.Audit VM.PowerMgmt"

# A user for Lastboard, in Proxmox's own realm (no shell account is created)
pveum user add lastboard@pve
pveum acl modify / --users lastboard@pve --roles Lastboard

# The token. Privilege separation off, so it inherits the user's role.
pveum user token add lastboard@pve lastboard --privsep 0
```

> **Why `--privsep 0`.** With privilege separation on, a token needs its *own*
> ACL entry as well, and what applies is the intersection of the two. That is
> the usual reason a freshly made token "cannot do anything". This user exists
> only for Lastboard, so the token may as well carry the user's role.

The last command prints the **secret once and never again**. Copy it now; if you lose it, delete the token and create it again.

You end up with two values:

| Value | Looks like |
| :--- | :--- |
| **Token id** | `lastboard@pve!lastboard` |
| **Token secret** | `61b6dfca-9f17-4e5a-8a9f-3d1c0b7e5a2f` |

### Read-only, if you prefer

Drop `VM.PowerMgmt` from the role and Lastboard reads everything and **hides the start and stop buttons** — it asks the host what the token may do rather than assuming, so there is nothing to configure twice:

```bash
pveum role add Lastboard --privs "Sys.Audit Datastore.Audit VM.Audit"
```

| Privilege | What it is for |
| :--- | :--- |
| `VM.Audit` | Read virtual machines and containers: state, CPU, memory, uptime |
| `Datastore.Audit` | Read how full each storage is |
| `Sys.Audit` | Read node status: load average, cores, uptime |
| `VM.PowerMgmt` | **Optional.** Start and shut down machines from Lastboard |

Nothing here grants console access, configuration changes, backups, or deletion. There is no privilege in the list that can destroy anything.

### 2. Connect it in Lastboard

Open **Settings → Proxmox**. This is a server-wide setting, so only the **administrator** can see or change it.

![Proxmox settings](../assets/p-proxmox.png)

| Field | Notes |
| :--- | :--- |
| **Proxmox integration** | Puts the Proxmox icon in the top bar and lets the widget read the host |
| **Address** | The web interface address, port included — `https://192.168.1.10:8006` |
| **Token id** | `user@realm!name`, exactly as Proxmox printed it |
| **Token secret** | Shown once by Proxmox. Stored here and never sent back to your browser |
| **Accept a self-signed certificate** | On by default, because almost every home hypervisor has one |

**Save and connect** does what it says: it stores the connection and then reads the host with it, so the line underneath tells you what the token can actually see and whether it may start and stop machines. A mistyped token saves perfectly well — this is how you find out before you need it.

Coming back later, the secret box is empty and says *Stored*. Leaving it that way keeps the secret you saved; you only type it again to replace it.

> **Private addresses just work.** The connection is made by the Lastboard server, so `10.x`, `192.168.x` and `.local` addresses need no extra configuration, and a self-signed certificate is accepted when the switch above is on.

## The page

The Proxmox icon in the top bar opens it, and the **×** in its header closes it — while it is open the rest of the top bar is locked, the same way the status page behaves. Top to bottom:

**The status line** — node name, how many machines are running out of how many, and **Services down**: how many of your bookmarked services are on a machine that is stopped. On the right, the range every chart on the page is drawn over: **1h, 24h, 7d**.

**Nodes** — one card per node with CPU, memory and disk, plus uptime, load average and how many machines it carries. On a cluster the header says so; a single node is never called a cluster.

**Storage** — one card per store: how full it is, used and total, the kind (`ZFSPOOL`, `LVMTHIN`, `PBS`, `DIR`) and which node it belongs to. Bars turn amber past 60% and red past 90%.

**Machines** — one tile per virtual machine or container, grouped by node. A tile carries the icon of the bookmark it serves (matched by name, or told to it — see below), its CPU with a **trend line over the chosen range**, its memory, its type (LXC or VM) and its VMID. Templates are left out: they cannot run, so they have no state to show.

The dot in the corner says which of three things a machine is:

| | |
| :--- | :--- |
| **Green** | running |
| **Amber**, brighter edge | stopped, with no bookmark pointing at it — turning things off is a normal thing to do |
| **Red**, accent edge and a wash of accent | stopped **and** serving a bookmark: that is an outage |

Tiles keep their place whatever happens to them — by kind, then by VMID. A machine you know where to find stays there, and a stopped one is picked out by how it looks rather than by the grid rearranging itself under your pointer. (The widget is the other way round: it has room for a handful of rows, so what needs attention is lifted into them.)

The search box in the **Machines** header filters by name or VMID. When something is down, the **Services down** count becomes a button: click it to show only the stopped machines, and click it again to bring the rest back.

## A machine in detail

Click a tile.

![A stopped machine](../assets/proxmox-machine.png)

The sheet shows the machine's own CPU trend over the range you chose, its state, memory and uptime, the bookmark it serves — and the sentence this page exists for when it is stopped: **This stops responding: Plex**.

From here you can **Start** or **Shut down** the machine (when the token allows it), and open the bookmark it serves.

## Starting and stopping

Lastboard offers exactly two actions, on machines only: **start** and **shut down** (the graceful one — the same thing the Proxmox console's *Shutdown* does). Both ask for confirmation first.

**Nodes cannot be powered off or rebooted from Lastboard, deliberately.** A stopped container is one service; a stopped node is all of them, and that decision belongs at the console, not on a dashboard.

Actions are **administrator-only**, and the server checks the token's permissions before relaying anything: with no `VM.PowerMgmt` the buttons are not drawn, and a request made anyway is refused here rather than at the host.

## How a machine is tied to a bookmark

This is what turns a list of containers into something Lastboard can say anything about, and **it happens on its own**: your container `15-myspeed` is matched to your *MySpeed* bookmark without you configuring anything.

The rule is deliberately strict, because naming the wrong service as the one that went down is worse than naming none:

- The leading ordinal machines get filed under is dropped (`15-myspeed` → `myspeed`, `90--haos` → `haos`), then case, spaces and punctuation are ignored.
- The bookmark is matched on its **name** or on the **icon it wears** — so a bookmark labelled *Donetic* still finds the container `08-donetick`.
- A machine is matched only when **exactly one** bookmark fits. Two Jellyfins and one `jellyfin` container: no match, rather than a coin toss.

Measured on a host with twenty-nine containers and a board of fifty-five bookmarks, none of them configured: **sixteen machines matched, none wrongly.**

### When the names don't agree

Some pairs no rule should guess — a container called `23-jellyfin-musica` serving a bookmark called *Jellyfin Music*, or `90--haos` serving *Home Assistant*. For those, edit the bookmark and pick the machine under **Served by**:

![Adding a bookmark](../assets/m-bookmark.png)

Leave it on **Automatic (by name)** and the rule above applies. Pick a machine and **that wins**, always — the guess never overrides something you said.

Once a machine is tied to a bookmark, however it got there:

- its tile on the Proxmox page wears that bookmark's icon and name
- a stopped machine says which service it takes with it
- the widget lifts it above everything else that is merely stopped

A hand-made link lives inside the bookmark itself — no extra table, nothing to keep in step — and it works from **any** board: a bookmark on your *Media* board is found while you are looking at *Servers*.

> A hand-made link is **not** part of the YAML export, which carries the portable shape of a bookmark (name, address, icon, group). A full [backup](../using/import-export.md) of the database keeps it. Matching by name needs nothing kept at all.

## The widget

To keep this on the dashboard itself, add the [Proxmox widget](../widgets/proxmox.md). It shows the busiest node's health and the machines that need attention, and links through to this page.

## What Lastboard reads, and how often

| When | Request |
| :--- | :--- |
| Page open or widget tick | `GET /cluster/resources` — one call for nodes, machines and storage |
| Page open | `GET /nodes/{node}/status` — one per node, for load and cores |
| Page open, and on a range change | `GET .../rrddata` — one per machine, for the trend line on its tile. Proxmox has no endpoint that returns history for more than one machine, so these are spread out, three at a time, and cached until the range changes |
| Opening a machine | the history it already has, or a request for it |
| Pressing a button | `POST .../status/start` or `.../status/shutdown` |

The page refreshes every 15 seconds while it is open and the widget on its own interval; neither polls when it is closed. Nothing is written to your database: no machine names, no figures, no history. The only thing Lastboard stores is the connection itself.
