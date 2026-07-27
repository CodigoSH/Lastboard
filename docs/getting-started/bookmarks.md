# Bookmarks

Bookmarks are the core of Lastboard: quick-launch tiles that link to your apps, services, and sites. This guide covers creating and customizing them, organizing them into sections, and controlling how they behave on mobile.

## Adding a Bookmark

Enter **Edit Mode** (the pencil/edit toggle in the top bar) and use the **Add (+)** menu to create a new bookmark. A dialog opens with two tabs: **General** and **Customization**.

![Add menu](../assets/m-addnew.png)

## General Options

| Option | Description |
| :--- | :--- |
| **Icon** | Pick an icon from the built-in icon search, or provide a direct image URL. If left empty, the first letter of the label is used as a placeholder. |
| **Label** | The name shown on the tile. |
| **Label Position** | Where the label appears relative to the tile: **Bottom** (default), **Top**, **Off** (icon only), or **Section** (renders the label as a section-style header). |
| **URL** | The destination address. A **protocol** dropdown lets you choose `https://` or `http://`. |
| **Status Monitor** | When enabled, Lastboard periodically checks whether the URL is reachable and shows an up/down status indicator on the tile. You can place the indicator in the **top** or **bottom** corner, or turn it **off**. |
| **Show on Mobile** | Controls whether the bookmark appears on touch devices. See [Mobile Visibility and Ordering](#mobile-visibility-and-ordering) below. |

## Customization Options

The **Customization** tab controls the tile's appearance:

- **Color**: The accent/border color of the tile.
- **Border Width**: How thick the tile's border is (set to `0` for no border).

## Sections

A **Section** is a container that groups related bookmarks together under a title. Create one from the **Add** menu, then drag bookmarks into it to nest them. Sections keep large dashboards organized and can be resized like any other item.

> Bookmarks and sections can also be **moved to another dashboard** — individually or in bulk. See [Dashboards](../using/dashboards.md#moving-items-between-dashboards).

## Reordering & Search

- **Drag to reorder**: In Edit Mode, drag any bookmark (or section) to reposition it on the grid. The layout is saved automatically.
- **Search**: Use the search box in the top bar to filter bookmarks by label in real time.

## Mobile Visibility and Ordering

Lastboard renders a simplified, touch-friendly layout on phones. You have full control over which bookmarks appear there and in what order.

![Lastboard on mobile](../assets/mobile.png)

### Hiding a bookmark from mobile (desktop editor)

When editing a bookmark on desktop, the **Show on Mobile** control (the phone icon with an eye) toggles whether that bookmark appears on touch devices. Bookmarks hidden this way simply don't render on mobile.

### The mobile edit sheet

On a touch device, tapping the **edit** toggle in the top bar opens a bottom sheet that manages both visibility and order. It has two sections:

- **Visible on mobile** — the bookmarks currently shown on your phone. Drag the handle (the dots on the right of each row) to reorder them.
- **Hidden** — bookmarks currently hidden from mobile, shown dimmed.

Each row has an **eye** button (to the left of the drag handle):

- Tap the eye on a **visible** row to hide it — it slides down into the **Hidden** section.
- Tap the eye on a **hidden** row to show it again — it moves back to the end of the **Visible on mobile** list.

Changes are **deferred**: nothing is saved until you tap **Save changes**. Tapping **Cancel** (or closing the sheet) discards everything. This means you can freely rearrange and toggle visibility, then commit it all at once — or back out with no effect.

> **Note:** The mobile order and desktop grid order are independent. Reordering on mobile does not change your desktop layout, and vice versa.
