/**
 * The API the demo has in place of a server.
 *
 * The demo is the same page without a backend, so every request the page makes is answered here from
 * `demoService` and the generators beside it. A URL nobody wrote an answer for gets an empty object and a
 * warning, which is what the page tolerates from a server that has nothing to say.
 */
/** What the visitor chose to ignore when adding services to the board; it forgets on reload, like the rest of the demo's state. */
const demoDismissed = new Set<string>();

export async function demoRequest<T>(url: string, options: RequestInit): Promise<T> {
    const { demoService } = await import('./demoService');
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body as string) : {};

    try {
        // User & Auth
        if (url === '/api/me') return demoService.fetchUser() as any;
        if (url === '/api/user/update-profile') {
            await demoService.updateUser(body);
            return { message: 'Profile updated (Demo)' } as any;
        }
        if (url === '/api/user/preferences') {
            await demoService.updatePreferences(body);
            return { message: 'Preferences updated (Demo)' } as any;
        }
        if (url === '/api/user/change-password') return { message: 'Password changed (Demo)' } as any;

        // Dashboard Items
        if (url === '/api/dashboard') return demoService.fetchItems() as any;
        // The Proxmox page reads every board to find the bookmark a
        // machine backs, so the demo has to answer for a named one too.
        if (url.startsWith('/api/dashboard?dashboard_id=') && method === 'GET') {
            const id = parseInt(url.split('=')[1] || '0', 10);
            return demoService.fetchItems(id || undefined) as any;
        }
        if (url.startsWith('/api/dashboard/item') && method === 'POST') {
            return demoService.saveItem(body) as any;
        }
        if (url.startsWith('/api/dashboard/item/') && method === 'PATCH') {
            const id = parseInt(url.split('/').pop() || '0');
            return demoService.saveItem({ ...body, id }) as any;
        }
        if (url.startsWith('/api/dashboard/item/') && method === 'DELETE') {
            const id = parseInt(url.split('/').pop() || '0');
            await demoService.deleteItem(id);
            return { message: 'Item deleted (Demo)' } as any;
        }

        // Health Check (Demo: "up", except services in a synthetic outage)
        if (url === '/api/dashboard/health/batch' && method === 'POST') {
            return demoService.healthFor(body.urls || []) as any;
        }
        if (url.startsWith('/api/dashboard/health')) return { status: 'up' } as any;

        // Monitoring (Demo: synthetic history, see demoMonitor)
        if (url === '/api/monitor/settings' && method === 'GET') {
            return demoService.fetchMonitorSettings() as any;
        }
        if (url === '/api/monitor/settings' && method === 'POST') {
            return demoService.saveMonitorSettings(body) as any;
        }
        if (url === '/api/monitor/overview') return demoService.fetchMonitorOverview() as any;
        if (url.startsWith('/api/monitor/history') && method === 'GET') {
            const params = new URLSearchParams(url.split('?')[1] || '');
            return demoService.fetchMonitorHistory(
                parseInt(params.get('item_id') || '0', 10),
                params.get('range') || '24h') as any;
        }
        if (url.startsWith('/api/monitor/history') && method === 'DELETE') {
            return { ok: true, deleted: 0 } as any;
        }
        if (url === '/api/monitor/test') return { ok: true } as any;

        // Proxmox (Demo: synthetic, see demoProxmox)
        if (url === '/api/proxmox/settings' && method === 'GET') {
            return {
                enabled: true,
                // An address, though nothing answers at it: it is what a machine's console opens at, and without it the window that
                // adds machines to the board finds nothing to propose.
                hosts: [{ id: 'demo', name: 'Proxmox', url: 'https://pve.demo.lan:8006', token_id: '', insecure: true, enabled: true, has_secret: false }],
            } as any;
        }
        if (url === '/api/proxmox/settings' && method === 'POST') {
            // Nothing to save: the demo has no hypervisor to point at.
            return { status: 'ok' } as any;
        }
        if (url === '/api/proxmox/addresses' && method === 'POST') {
            // The addresses the machines asked for would have on a home network: the demo's machines live on 192.168.1.x,
            // each at its own number.
            const { addressKey } = await import('./discoverServices');
            const addresses: Record<string, string> = {};
            for (const g of Array.isArray(body.guests) ? body.guests : []) addresses[addressKey(String(g.node), Number(g.vmid))] = `192.168.1.${g.vmid}`;
            return { addresses, urls: {} } as any;
        }
        if (url.startsWith('/api/proxmox/overview')) {
            // The answer is a list of hypervisors now. The demo has one,
            // which is what almost every real instance has too.
            const { buildOverview } = await import('./demoProxmox');
            return { hosts: [{ id: 'demo', name: 'Proxmox', ...buildOverview() }] } as any;
        }
        if (url.startsWith('/api/proxmox/curve')) {
            // The nodes the fleet's curve names, each with the demo's own history.
            const { buildSeries } = await import('./demoProxmox');
            const params = new URLSearchParams(url.split('?')[1] || '');
            const nodes = (params.get('nodes') || '').split(',').filter(Boolean).map(part => {
                const [host, node] = part.split('/');
                const s = buildSeries(params.get('range') || '24h') as { cpu: number[]; mem: number[] };
                return { host, node, cpu: s.cpu, mem: s.mem };
            });
            return { range: params.get('range') || '24h', nodes } as any;
        }
        if (url.startsWith('/api/proxmox/series')) {
            const { buildSeries } = await import('./demoProxmox');
            const params = new URLSearchParams(url.split('?')[1] || '');
            const vmid = params.get('vmid');
            return buildSeries(params.get('range') || '24h', vmid ? parseInt(vmid, 10) : undefined) as any;
        }
        if (url === '/api/proxmox/icon' && method === 'POST') {
            // The demo really does remember, for as long as the visit
            // lasts: choosing a face for a machine is half the point of
            // the feature.
            const { setDemoIcon } = await import('./demoProxmox');
            setDemoIcon(String(body.node || ''), Number(body.vmid), String(body.icon || ''));
            return { status: 'ok' } as any;
        }
        if (url === '/api/proxmox/power' && method === 'POST') {
            // The demo really does start and stop its machines, so the
            // page can be tried end to end — it just forgets on reload.
            const { setRunning } = await import('./demoProxmox');
            setRunning(Number(body.vmid), body.action === 'start');
            return { status: 'ok' } as any;
        }

        // What was ignored in the window that adds services to the board: kept for as long as the visit lasts.
        if (url === '/api/detect/dismissed') {
            if (method === 'POST') {
                for (const k of Array.isArray(body.add) ? body.add : []) demoDismissed.add(String(k));
                for (const k of Array.isArray(body.remove) ? body.remove : []) demoDismissed.delete(String(k));
            }
            return { keys: [...demoDismissed] } as any;
        }

        // Multi-Dashboard (Demo: persisted in localStorage via demoService)
        if (url === '/api/dashboards' && method === 'GET') return demoService.fetchDashboards() as any;
        if (url === '/api/dashboards/reorder' && method === 'PUT') {
            await demoService.reorderDashboards(body.ids || []);
            return { status: 'reordered' } as any;
        }
        if (url.startsWith('/api/dashboards/') && url.endsWith('/default') && method === 'POST') {
            await demoService.setDefaultDashboard(parseInt(url.split('/')[3] || '0'));
            return { status: 'updated' } as any;
        }
        if (url === '/api/dashboards' && method === 'POST') return demoService.createDashboard(body.name) as any;
        if (url.startsWith('/api/dashboards/') && method === 'PATCH') {
            await demoService.renameDashboard(parseInt(url.split('/').pop() || '0'), body.name);
            return { status: 'updated' } as any;
        }
        if (url.startsWith('/api/dashboards/') && method === 'DELETE') {
            await demoService.deleteDashboard(parseInt(url.split('/').pop() || '0'));
            return { status: 'deleted' } as any;
        }

        // API widget (Demo: synthetic counters, see demoApi)
        if (/^\/api\/widget\/(\d+\/)?api-fetch$/.test(url) && method === 'POST') {
            const { demoApiValues } = await import('./demoApi');
            return { ok: true, values: demoApiValues(body.paths || []) } as any;
        }

        // Server Health reading another server (Demo: plausible numbers that drift)
        if (/^\/api\/widget\/(\d+\/remote-stats|remote-stats\/test)$/.test(url)) {
            const wobble = (base: number, spread: number) => Math.round((base + (Math.random() - 0.5) * spread) * 10) / 10;
            return { ok: true, stats: { cpu: wobble(24, 16), ram: wobble(52, 6), temp: wobble(51, 6), version: '4' } } as any;
        }

        // Active sessions (Demo: only the visitor's own; closing is a no-op)
        if (url === '/api/sessions' && method === 'GET') {
            const { demoSessions } = await import('./demoApi');
            return demoSessions() as any;
        }
        if (url.startsWith('/api/sessions/')) return {} as T;

        // Two-step sign-in (Demo: always off; the POSTs change nothing)
        if (url === '/api/2fa' && method === 'GET') return { enabled: false, recovery_left: 0 } as any;
        if (url === '/api/2fa/setup') return { secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/Lastboard:demo?secret=JBSWY3DPEHPK3PXP&issuer=Lastboard' } as any;
        if (url === '/api/2fa/enable' || url === '/api/2fa/recovery-codes') return { recovery_codes: ['demo-aaaa-bbbb-cccc', 'demo-dddd-eeee-ffff'] } as any;
        if (url.startsWith('/api/2fa/') || url === '/api/login/2fa' || url === '/api/users/2fa/remove') return {} as T;

        // Passkeys (Demo: cannot hold any; the POSTs change nothing)
        if (url === '/api/passkeys' && method === 'GET') return { available: false, passkeys: [] } as any;
        if (url.startsWith('/api/passkeys/') || url.startsWith('/api/login/passkey/')) return {} as T;

        // Admin (Mock success)
        if (url === '/api/users' && method === 'GET') return [await demoService.fetchUser()] as any;
        if (url === '/api/users') return { message: 'Admin action simulated (Demo)' } as any;

        console.warn('[DemoMode] Unhandled URL, returning empty object:', url);
        return {} as T;
    } catch (e) {
        console.error('[DemoMode] Error:', e);
        throw e;
    }
}
