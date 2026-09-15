import { build } from "bun";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { createHash } from "crypto";

console.log("🚀 Starting Build...");

// One stamp per build, shared by the HTML cache-busting query and the bundle.
// Anything fetched with ?v=<stamp> is served immutable, so the stamp must stay
// identical across every asset of a single build, and must change whenever any
// of them changes.
//
// The clock satisfies neither half. It changes when nothing has changed, which
// makes two builds of the same source produce different binaries — so "rebuild
// the release and compare the hashes" becomes a promise nobody can keep. And it
// does not change when only the content does, if the second passes within the
// same second.
//
// So the assets are assembled carrying a placeholder, the whole output is
// hashed — paths included, so moving a file counts — and the placeholder is
// replaced by that hash. Same sources, same bytes; one character different
// anywhere, new stamp.
const PLACEHOLDER = "0BUILDSTAMP0";

const define = {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "__BUILD_STAMP__": JSON.stringify(PLACEHOLDER),
};

// Start from a clean output directory: cp() never removes files, so leftovers
// from earlier builds would linger here and get embedded into the binary.
await rm('./web/dist', { recursive: true, force: true });

const result = await build({
    entrypoints: ["./web/src/index.ts"],
    outdir: "./web/dist",
    minify: true,
    sourcemap: "none",
    target: "browser",
    naming: "bundle.js",
    define,
});

const resultSetup = await build({
    entrypoints: ["./web/src/setup.ts"],
    outdir: "./web/dist",
    minify: true,
    sourcemap: "none",
    target: "browser",
    naming: "setup.js",
    define,
});

const resultLogin = await build({
    entrypoints: ["./web/src/login.ts"],
    outdir: "./web/dist",
    minify: true,
    sourcemap: "none",
    target: "browser",
    naming: "login.js",
    define,
});

if (result.success && resultSetup.success && resultLogin.success) {
    console.log("📂 Output: web/dist/bundle.js, web/dist/setup.js & web/dist/login.js");

    try {
        // Copy Locales
        const allowedLocales = ['en', 'zh', 'hi', 'es', 'ar', 'fr', 'bn', 'pt', 'ru', 'de', 'ja', 'it', 'tr', 'ko', 'id', 'pl', 'ur', 'nl', 'fa', 'el'];
        await mkdir('./web/dist/locales', { recursive: true });

        for (const lang of allowedLocales) {
            const src = `./web/public/locales/${lang}.json`;
            const dest = `./web/dist/locales/${lang}.json`;
            if (existsSync(src)) {
                // Carry the stamp inside the file, not just in its URL. The URL
                // is content-addressed and therefore correct, but any cache in
                // between - a browser, a proxy keyed on the path alone - can
                // still answer with last year's copy, and the app had no way to
                // tell. With the stamp inside, it can: see loadLocale.
                //
                // The placeholder is substituted by the same pass that stamps
                // the bundles, further down, so this needs no extra machinery.
                // The source files under web/public stay untouched, which keeps
                // i18n:sync and i18n:audit seeing exactly what a translator sees.
                const table = JSON.parse(await readFile(src, 'utf-8'));
                table.__stamp = PLACEHOLDER;
                await writeFile(dest, JSON.stringify(table, null, 2));
            }
        }
        console.log("✅ Locales copied to web/dist/locales");

        // Copy HTML & Public Assets with Cache Busting
        const copyWithVersion = async (src: string, dest: string) => {
            let content = await readFile(src, 'utf-8');
            content = content.replace(/(\?v=)[0-9a-zA-Z]+/g, `$1${PLACEHOLDER}`);
            await writeFile(dest, content);
        };

        await copyWithVersion('./web/index.html', './web/dist/index.html');
        await copyWithVersion('./web/login.html', './web/dist/login.html');
        await copyWithVersion('./web/setup.html', './web/dist/setup.html');

        // Copy Images explicitly to root for cleaner URLs (/images/...)
        if (existsSync('./web/public/images')) {
            await cp('./web/public/images', './web/dist/images', { recursive: true });
            console.log("✅ Images copied to web/dist/images");
        }

        // Copy the loose files at the top of web/public (favicon and the PWA
        // icons) to the dist root, which is where the app and the manifest ask
        // for them. Reading the directory rather than naming each one is
        // deliberate: the manifest gained three icons that an explicit list
        // silently left behind, and the page only broke on a real phone.
        {
            const copied: string[] = [];
            for (const entry of await readdir('./web/public', { withFileTypes: true })) {
                if (!entry.isFile()) continue;
                await cp(`./web/public/${entry.name}`, `./web/dist/${entry.name}`);
                copied.push(entry.name);
            }
            console.log(`✅ Root assets copied to web/dist: ${copied.sort().join(', ')}`);
        }

        // Copy Web Manifest explicitly to root
        if (existsSync('./web/manifest.json')) {
            await cp('./web/manifest.json', './web/dist/manifest.json');
            console.log("✅ Manifest copied to web/dist/manifest.json");
        }

        // NOTE: web/public is deliberately NOT copied wholesale. Everything it
        // holds (images, locales, favicon) is already copied to the dist root
        // above, which is where the app requests it from (/images/…, /locales/…,
        // /favicon.png). A second copy under /public would only inflate the
        // embedded binary.

        // Copy Styles folder
        if (existsSync('./web/styles')) {
            await cp('./web/styles', './web/dist/styles', { recursive: true });
        }

        console.log("✅ HTML, Styles & Public assets copied to web/dist");

        // Everything is in place carrying the placeholder. Hash the lot and
        // swap it in, before the copy that Go embeds, so both directories hold
        // exactly the same bytes.
        const filesUnder = async (dir: string): Promise<string[]> => {
            const entries = await readdir(dir, { withFileTypes: true });
            const found: string[] = [];
            // Sorted, so the digest does not depend on the order the filesystem
            // happens to hand them back.
            for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
                const full = `${dir}/${entry.name}`;
                if (entry.isDirectory()) found.push(...(await filesUnder(full)));
                else found.push(full);
            }
            return found;
        };

        const digest = createHash("sha256");
        const built = await filesUnder('./web/dist');
        for (const file of built) {
            digest.update(file.slice('./web/dist'.length));
            digest.update(await readFile(file));
        }
        const buildStamp = digest.digest("hex").slice(0, 16);

        let stamped = 0;
        for (const file of built) {
            const content = await readFile(file);
            if (!content.includes(PLACEHOLDER)) continue;
            await writeFile(file, content.toString('utf-8').replaceAll(PLACEHOLDER, buildStamp));
            stamped++;
        }
        if (stamped === 0) {
            // The three HTML files and the three bundles all carry it. None
            // carrying it means the substitution has silently stopped working,
            // and every asset is about to be served immutable under one name
            // for ever.
            throw new Error("nothing carried the build stamp: the substitution is broken");
        }
        console.log(`✅ Build stamp ${buildStamp} written into ${stamped} files`);

        // SYNC TO INTERNAL GO EMBED DIRECTORY
        console.log("🔄 Syncing to internal/web/dist...");
        const internalDist = './internal/web/dist';
        await rm(internalDist, { recursive: true, force: true });
        await mkdir(internalDist, { recursive: true });
        await cp('./web/dist', internalDist, { recursive: true });
        console.log("✅ Synced to internal/web/dist");

        console.log("✅ Build Complete!");
    } catch (e) {
        // The Go binary embeds internal/web/dist, so a half-finished copy would
        // silently ship stale assets. Fail loudly instead.
        console.error("❌ Failed to copy assets:", e);
        process.exit(1);
    }
} else {
    // Combine logs
    const logs = [...result.logs, ...resultSetup.logs, ...resultLogin.logs];

    console.error("❌ Build Failed:");
    for (const message of logs) {
        console.error(message);
    }
    process.exit(1);
}
