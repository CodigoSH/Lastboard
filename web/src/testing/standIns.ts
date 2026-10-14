/**
 * A browser, as much of one as the stores need, for tests that run in Bun.
 *
 * install() puts window, document, localStorage, location, navigator, fetch and
 * WebSocket on globalThis and returns what to call to put every one of them back
 * exactly as it was — property descriptors and all, because navigator is a
 * read-only accessor in Bun and assigning to it back does nothing.
 *
 * The stores are singletons that start work when first imported (translations,
 * a socket). A test that imports one must `await settle()` before it ends, so
 * that work finishes while these stand-ins are still in place instead of failing
 * later inside whichever test happens to be running.
 */

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const NAMES = ['window', 'document', 'localStorage', 'location', 'navigator', 'fetch', 'WebSocket', 'LASTBOARD_CONFIG'] as const;

export interface StandIns {
    memory: Map<string, string>;
    /** Replaces what fetch answers for everything that is not a translation file. */
    setFetch(fn: Fetch): void;
    /** Waits for the translations the stores started loading. */
    settle(): Promise<void>;
    restore(): void;
}

export function install(): StandIns {
    const g = globalThis as any;
    const before = new Map<string, PropertyDescriptor | undefined>();
    for (const name of NAMES) before.set(name, Object.getOwnPropertyDescriptor(g, name));

    const define = (name: string, value: unknown) =>
        Object.defineProperty(g, name, { value, configurable: true, writable: true, enumerable: true });

    const memory = new Map<string, string>();
    const style = { setProperty() {}, removeProperty() {} };
    let answer: Fetch = async () => { throw new TypeError('network down'); };

    define('window', g);
    define('LASTBOARD_CONFIG', { demo_mode: false });
    define('location', { protocol: 'http:', host: 'localhost' });
    define('navigator', { language: 'en-US', languages: ['en-US'] });
    define('document', {
        cookie: '',
        querySelector: () => null,
        addEventListener() {},
        removeEventListener() {},
        documentElement: { style, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, removeAttribute() {} },
        body: { style },
    });
    define('localStorage', {
        getItem: (k: string) => memory.get(k) ?? null,
        setItem: (k: string, v: string) => { memory.set(k, v); },
        removeItem: (k: string) => { memory.delete(k); },
        clear: () => memory.clear(),
        key: (i: number) => [...memory.keys()][i] ?? null,
        get length() { return memory.size; },
    });
    define('WebSocket', class { addEventListener() {} close() {} send() {} });
    define('fetch', async (url: string, init?: RequestInit) => {
        if (String(url).startsWith('/locales/')) return new Response('{}', { status: 200 });
        return answer(url, init);
    });

    return {
        memory,
        setFetch(fn) { answer = fn; },
        async settle() {
            const { i18n } = await import('../services/i18n');
            await i18n.ensureInitialized();
            await new Promise(r => setTimeout(r, 50)); // the socket the stores open on import
        },
        restore() {
            for (const name of NAMES) {
                const d = before.get(name);
                if (d) Object.defineProperty(g, name, d); else delete g[name];
            }
        },
    };
}
