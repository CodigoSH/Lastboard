/**
 * The content of a bookmark, written one way.
 *
 * The editor and the service detector both create bookmarks; if each wrote the
 * JSON by hand, a bookmark made by one would differ from one made by the other
 * the day somebody added a field to only one of them. The defaults here are the
 * editor's, so what the detector creates is what a person would have made by
 * opening the editor and pressing save.
 */

export interface BookmarkContentInput {
    label: string;
    url: string;
    /** The address of the stored image, or ''. */
    icon?: string;
    /** The library name the icon was picked by, if any. */
    iconName?: string | null;
    statusCheck?: boolean;
    /** The machine that serves it, if its owner said so. */
    proxmox?: { host: string; node: string; kind: string; vmid: number } | null;
    /** The container it serves: its host and its name, never its id. */
    docker?: { host: string; name: string } | null;
    statusPos?: string;
    visibleTouch?: boolean;
    labelPos?: string;
    color?: string;
    borderWidth?: number;
}

export function bookmarkContent(i: BookmarkContentInput): string {
    const checks = i.statusCheck ?? false;
    return JSON.stringify({
        label: i.label,
        url: i.url,
        description: '',
        icon: i.icon ?? '',
        iconName: i.iconName ?? null,
        statusCheck: checks,
        // Only written when there is one, so a board without Proxmox or Docker
        // keeps exactly the content it had before they existed.
        ...(i.proxmox ? { proxmox: i.proxmox } : {}),
        ...(i.docker ? { docker: i.docker } : {}),
        statusPos: checks ? (i.statusPos ?? 'top-right') : 'off',
        visibleTouch: i.visibleTouch ?? true,
        openInNewTab: true,
        labelPos: i.labelPos ?? 'bottom',
        borderColor: i.color ?? '',
        borderWidth: i.borderWidth ?? 1,
    });
}
