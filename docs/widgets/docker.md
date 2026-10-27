# Docker Widget

The Docker widget provides live monitoring and basic management of your Docker containers directly from Lastboard.

## Description

This widget lists containers, shows their running state, exposes port mappings, and provides real-time CPU/RAM stats. An account allowed to control Docker can also start, stop and restart them from the rows.

![Docker Widget](../assets/w-docker.png)

Connecting a host, the Lastboard Agent, who can use which kind of host and the Docker page for one container are in the [Docker guide](../docker/overview.md); this page is about the widget itself.

## Widget Configuration

Everything the widget shows is set from its configuration screen: enter the dashboard's edit mode and open the widget's settings.

![Docker widget configuration](../assets/w-p-docker.png)

### Hosts

The hosts of your account are listed with a **Show** box each. Leave them all ticked and the widget shows every host, including the ones you add later; untick one to leave it out of this widget. To add, change or remove a host, go to Preferences → Docker (see [Docker hosts](../docker/overview.md#docker-hosts)).

### Containers

Each host's containers are listed with a search box for long lists. For each one you can:

- **Show or hide it** with the checkbox. Unchecked containers stay out of the widget.
- **Rename it**, if the container name isn't what you want to read on your dashboard.
- **Set the address it opens**. See [Opening a container's service](#opening-a-containers-service).

Hosts that don't answer say so in their own section, and their containers keep whatever you had already set for them.

**The widget shows what you ticked, from every host at once** — it is one list of the containers you care about, not one host at a time. With more than one host configured, each row names the host it runs on, under the image.

Each row opens with a coloured dot for the container's state — the same dot the Monitoring widget uses for a service, so a board with both reads one way rather than two. Green is running, grey is stopped, amber is paused, and restarting uses your accent colour; hovering it spells the state out.

### When a host stops answering

Its containers don't disappear from the widget. They stay where they are, greyed out, and the line that normally names the host says it isn't responding instead — so you can see at a glance which services you've lost and which are fine. Their action buttons go away, since there is nothing there to receive the command.

A host that was already down when the dashboard loaded listed nothing, so there are no rows of its to grey out. That one gets a single line naming it and saying it doesn't answer.

### Opening a container's service

A container's name in the widget is a link: click it and its web interface opens in a new tab. No bookmark to create by hand for something the widget already lists.

Lastboard works the address out for you, in this order:

1. **What you typed** in the container's address field, if anything.
2. **A label on the container.** `lastboard.url` is read first, then `homepage.href` — so a container already labelled for another dashboard works here without changes, and you can override it with ours. Only `http://` and `https://` addresses are used.
3. **The first published port**, combined with the host's address. For a local host that's whatever address you're using to read the dashboard; for a remote one it's that host's own address.

A container that publishes no port and carries no label simply isn't a link — the field shows *No published port* and its name stays plain text.

The address field is left **empty** on purpose when the derived one is right: the placeholder shows what will be used, and leaving it alone means the widget keeps following the container. Type something only when you want to override it — a reverse-proxy hostname, for example, or a container reachable on a path.

Example of labelling a container so it advertises its own address:

```yaml
services:
  jellyfin:
    image: jellyfin/jellyfin
    labels:
      lastboard.url: https://jellyfin.example.home
```

### Arranging the list

Each container in the settings has a grip on its left. Drag a row by it to put the container where you want it, or focus the grip and use the up and down arrow keys. The widget shows the containers in that order. The order is kept for each host, so with several hosts you arrange each one's list on its own. A container the order doesn't know yet — a new one — goes after the others until you place it.

### New containers

By default a container that appears on a host is shown straight away, and you hide the ones you don't want. If you only want a few on the widget, turn **Show new containers automatically** off: from then on a new container stays hidden until you tick it in the settings. Turning it off keeps what is on the widget now; only containers that appear afterwards are held back. Do it while all your hosts are answering: a host that is down can't be listed, so its containers are not kept.

### Updating a container

What you set on a container — hidden, a name, an address — is kept under the container's **name** on its host, not its ID. Updating a container recreates it with a new ID, and the settings follow it. (Settings saved by an earlier version were kept by ID and are read as they were until you next save the widget's settings; a container recreated before that one save had already lost them, and has to be hidden once more.)

### Title and refresh

The title is the name on the tile's top border, the same as on every widget; leave it empty for none. A widget that had no title keeps the name it showed, "Docker". You can also choose how often the container list is refreshed (30 seconds to 10 minutes). Resource usage for running containers updates continuously regardless of this setting.
