# Import, Export & Backup

Lastboard has **two separate features** that are easy to confuse. This page explains when to use each. Both live under **Settings → Data**.

| | **Full backup** | **Import / Export dashboards** |
| :--- | :--- | :--- |
| Scope | Everything: users, all dashboards, settings | Just dashboards and their items |
| Format | Backup file (complete snapshot) | Open, documented **YAML** |
| Restoring | **Overwrites** your current data | **Adds** new dashboards; deletes nothing |
| Use it for | Disaster recovery, moving to another instance | Sharing a layout, migrating from another app, keeping a portable copy |

> Rule of thumb: **Full backup** is for *recovering or relocating your whole instance*. **Import/Export** is for *moving dashboards around* without touching anything else.

Both live in the same **Settings → Data** panel:

![Data settings](../assets/p-data.png)

## Full Backup

Saves or restores **everything** — every user, every dashboard, all settings, and your stored icons — as a single snapshot.

- **Backup** — download a complete copy of your instance.
- **Restore** — upload a backup to bring an instance back to that exact state.

### What is inside, and protecting it

A backup holds the **API keys** you typed into your widgets, the **Proxmox tokens**, and every account's **password hash**. Downloaded as it is, it carries all of that unencrypted, so treat the file like the database itself.

When you press **Download Backup**, you can type a **password** (and confirm it). The whole file is then sealed under it: nothing inside can be read without it. Leave the fields empty to download the plain file.

- The password is **not stored anywhere**. **There is no recovery**: a protected backup whose password is lost cannot be opened.
- To restore a protected backup, choose the file as usual and type its password when asked. A wrong password asks again, and nothing is changed until it is right.
- Sealing uses Argon2id to derive the key and AES-256-GCM to encrypt, both from the Go standard library and its extended crypto module.

Backups taken on earlier versions restore as they always did. They do not include the Proxmox configuration, so restoring one leaves whatever Proxmox setup the instance already has untouched.

Because the icons travel inside the file, restoring on a machine with no internet still gives you the board exactly as you left it. Backups taken before icons were stored locally restore fine too: their bookmarks come back with the URLs they were saved with, and the next restart stores those pictures for you.

> **Warning:** Restoring **overwrites all current data** and cannot be undone. Use it for recovery, or to move a full setup to another Lastboard instance — not to merge dashboards.

## Export (YAML)

Downloads your configuration as **open, documented YAML** — no lock-in, easy to read, edit, and version-control. The file lists each dashboard and its items:

```yaml
version: 1
dashboards:
  - name: Home
    items:
      - type: bookmark
        title: Jellyfin
        url: http://10.0.0.7:8096
        icon: jellyfin
        group: Media
```

Each item has a `type`, `title`, and `url`, plus optional `icon`, `group` (the section it belongs to), `description` and `status_check`.

## Import Dashboards

Bring dashboards in from another tool or a native export. **Import always creates new dashboards — it never deletes or overwrites what you already have.**

1. Choose the **format** of your file.
2. Pick the **file**.
3. Confirm — Lastboard tells you how many items it will import before creating anything.

### Supported formats

| Format | Source file |
| :--- | :--- |
| **Native (Lastboard YAML)** | A file produced by *Export (YAML)* above |
| **Homepage — services.yaml** | Homepage's services configuration |
| **Homepage — bookmarks.yaml** | Homepage's bookmarks configuration |
| **Dashy — conf.yml** | A Dashy configuration file |

Items that don't belong to a named group are placed under an **Ungrouped** section. After importing, you're switched to the first new dashboard so you can review and rearrange it.
