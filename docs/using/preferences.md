# Preferences

All personalization and system options live in the **Settings** panel, opened from the icon in the top navigation bar.

**Preferences save the moment you change them** — there is no "Save" button. Only actions with a real consequence (changing your password or username, managing users, backup/restore, updates) keep an explicit button.

## My Profile

Manage your personal profile and security.

![My Profile](../assets/p-profile.png)

- **Avatar** — upload a custom profile picture (use **Change Image**).
- **Username** — change your display name, then **Save Name**. This signs you out, since the session is tied to it.
- **System Password** — update your login credentials. Enter your current password, then the new one twice, and **Change Password**.

## Look & Feel

Everything that changes how the dashboard looks.

![Look & Feel](../assets/p-look-feel.png)

- **Accent Color** — pick a preset or set a custom color with the picker.
- **Dashboard Background** — upload any image; it's optimized for performance and fills the screen without distortion. Each dashboard keeps its own background.
- **Theme** — switch between **Dark** and **Light**.

## Personalization

![Personalization](../assets/p-personalization.png)

- **Logo & Panel Name** — customize the title and logo shown in the browser tab and top bar.
- **Language** — choose from **20 supported languages**.
- **Measurement Units** — **Metric** (°C, km/h) or **Imperial** (°F, mph). Applies to all compatible widgets (Weather, Telemetry, …).
- **Grid Layout** — the **Columns** slider sets how many columns the grid uses, for tighter or more spacious layouts.

## Users (Admin Only)

Administrators manage who can access the instance.

![Users](../assets/p-users.png)

- **Add User** — create a new account.
- **Edit / Delete** — modify or remove an existing account from its row.
- **Roles** — **Admin** (the instance owner, full control) and **Member** (standard access).

## Monitoring

Turn service monitoring on, choose how often the server checks your services, and configure down/up alerts via ntfy, Gotify or a webhook. See **[Monitoring & Uptime](../monitoring/overview.md)** for the full guide.

## Data

Full backup & restore, and importing/exporting dashboards. See **[Import, Export & Backup](import-export.md)**.

It also says where your icons come from — how many this server hands out, and how many are still fetched from outside, with a button to bring those in. See **[Where icons are stored](../getting-started/bookmarks.md#boards-made-before-this-existed)**.

## Advanced

![Advanced](../assets/p-advanced.png)

- **Reset System** — a safe-guarded "wipe everything" that erases all data and returns the instance to a fresh start (the Setup Wizard). This cannot be undone.

## About

![About](../assets/p-about.png)

- **Version** — the running version, with an at-a-glance up-to-date indicator.
- **Check for Updates** — manually check for a newer release. See **[Updating](../getting-started/updating.md)** for how updates are applied.
- **Beta Tester** — opt in to the beta program for early access to new features.
- **Source Code / Report Issue** — links to the Forgejo repository and its issue tracker.
