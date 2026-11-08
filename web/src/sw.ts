/**
 * The service worker: the one piece of Lastboard that runs while no page is open.
 *
 * It does exactly two things, both for Web Push, and deliberately nothing else. It does not cache,
 * intercept requests or work offline: a worker that did would be a second place for a stale copy of
 * the app to live, and the app already has its own answer to that.
 *
 *  - `push`: the server sent an alert. It is shown as a notification.
 *  - `notificationclick`: a tap on that notification opens the page it names.
 *
 * It exports nothing: a classic worker script cannot carry an `export`, and the bundler would put one
 * at the end of the file. What can be tested lives in `swMessage.ts`.
 */
import { describe, target } from './swMessage';

declare const self: any;

self.addEventListener('push', (event: any) => {
    const { title, options } = describe(event.data ? event.data.text() : null);
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: any) => {
    event.notification.close();
    const url = target(event.notification.data?.url);
    event.waitUntil((async () => {
        const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of open) {
            if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
                // An already open page is reused: a second copy of the app is a second socket and a second timer.
                await client.focus();
                if ('navigate' in client) {
                    try { await client.navigate(url); } catch { /* a page that cannot be navigated keeps what it shows */ }
                }
                return;
            }
        }
        await self.clients.openWindow(url);
    })());
});
