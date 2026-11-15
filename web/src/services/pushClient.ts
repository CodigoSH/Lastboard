import { apiService } from './apiService';
import { decodeKey, deviceRef, isIOS, pushSupport, type PushEnv, type PushSupport } from './pushSupport';

/**
 * Web Push from the browser's side: asking this device for permission, subscribing it, and keeping
 * the account's list of devices. The rules that can be tested without a browser are in `pushSupport`.
 *
 * Nothing here runs until somebody presses the button in Preferences: no worker is registered and no
 * permission is asked for on load, so an instance that does not use push never sees any of it.
 */

/** A device in the account's list. The address of its subscription is not part of it: the server keeps that. */
export interface PushDevice {
    id: number;
    ref: string;
    label: string;
    created_at: number;
    last_ok_at: number | null;
}

/** What Preferences draws: whether this device can take part, and who does. */
export interface PushView {
    support: PushSupport;
    devices: PushDevice[];
    /** The row that is this browser, if it is subscribed here and the server knows it. */
    thisDevice: number | null;
    /** Waiting for the browser or the server; the buttons stand still meanwhile. */
    busy: boolean;
}

export const pushIdle: PushView = { support: 'unsupported', devices: [], thisDevice: null, busy: false };

export function currentEnv(): PushEnv {
    const nav = navigator as Navigator & { standalone?: boolean };
    return {
        serviceWorker: 'serviceWorker' in navigator,
        pushManager: 'PushManager' in window,
        notification: 'Notification' in window,
        permission: 'Notification' in window ? Notification.permission : 'default',
        ios: isIOS(nav.userAgent, nav.maxTouchPoints ?? 0),
        standalone: window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true,
    };
}

/** This browser's own subscription, if it has one. Does not register the worker: asking is not enabling. */
async function ownSubscription(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator)) return null;
    const registration = await navigator.serviceWorker.getRegistration('/');
    return registration ? registration.pushManager.getSubscription() : null;
}

/** The current picture: support, the account's devices and which one is this browser. */
export async function loadPush(): Promise<PushView> {
    const support = pushSupport(currentEnv());
    const devices = await apiService.get<PushDevice[]>('/api/push/subscriptions');
    let thisDevice: number | null = null;
    if (support === 'ready' || support === 'denied') {
        const own = await ownSubscription();
        if (own) {
            const ref = await deviceRef(own.endpoint);
            thisDevice = devices.find(d => d.ref === ref)?.id ?? null;
        }
    }
    return { support, devices, thisDevice, busy: false };
}

/**
 * Turns notifications on for this browser. Must be called from a click: the permission prompt is
 * refused otherwise, and on an iPhone it is refused for anything but a tap.
 */
export async function enablePush(label: string): Promise<void> {
    // First, before any await that could outlast the click: the prompt needs the gesture.
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('push.permission_denied');

    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    const registration = await navigator.serviceWorker.ready;
    const { public_key } = await apiService.get<{ public_key: string }>('/api/push/key');
    const key = decodeKey(public_key);

    let subscription = await registration.pushManager.getSubscription();
    // A subscription made for another key (the instance was restored onto a new one) cannot be used.
    if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
        await subscription.unsubscribe();
        subscription = null;
    }
    subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });

    const json = subscription.toJSON();
    await apiService.post('/api/push/subscriptions', {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        label,
    });
}

/**
 * Puts this browser back on the server's list when it has dropped off it, and does nothing otherwise.
 *
 * A subscription can be lost on the server's side (the push service answered 410 once and the row was
 * forgotten) while the browser still holds it and the permission is still given. Nothing would tell the
 * person: alerts would simply stop arriving here. Called when the app opens, only for a browser that
 * already took part: no worker is registered and no permission is asked for. The normal case is one
 * request, the list.
 */
export async function resyncPush(label: string): Promise<void> {
    if (pushSupport(currentEnv()) !== 'ready' || Notification.permission !== 'granted') return;
    const own = await ownSubscription();
    if (!own) return;
    const devices = await apiService.get<PushDevice[]>('/api/push/subscriptions');
    const ref = await deviceRef(own.endpoint);
    if (devices.some(d => d.ref === ref)) return;

    // A subscription made for another key cannot be used; pressing Enable again replaces it.
    const { public_key } = await apiService.get<{ public_key: string }>('/api/push/key');
    if (!sameKey(own.options.applicationServerKey, decodeKey(public_key))) return;

    const json = own.toJSON();
    await apiService.post('/api/push/subscriptions', {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        label,
    });
}

/** Turns notifications off for this browser: the server forgets it and the browser lets go of the subscription. */
export async function disablePush(deviceId: number | null): Promise<void> {
    if (deviceId !== null) await apiService.delete(`/api/push/subscriptions/${deviceId}`);
    const own = await ownSubscription();
    if (own) await own.unsubscribe();
}

/** Removes a device of the account, which may be another one. This browser's own subscription stays if it is a different row. */
export async function removePushDevice(id: number): Promise<void> {
    await apiService.delete(`/api/push/subscriptions/${id}`);
}

function sameKey(have: ArrayBuffer | null, want: Uint8Array): boolean {
    if (!have) return false;
    const a = new Uint8Array(have);
    return a.length === want.length && a.every((b, i) => b === want[i]);
}
