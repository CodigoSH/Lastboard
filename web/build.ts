import { build } from "bun";
import { cp, mkdir, readFile, rm, writeFile } from "fs/promises";
import { existsSync } from "fs";

console.log("🚀 Starting Build...");

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
    define: {
        "process.env.NODE_ENV": JSON.stringify("production"),
    },
});

const resultSetup = await build({
    entrypoints: ["./web/src/setup.ts"],
    outdir: "./web/dist",
    minify: true,
    sourcemap: "none",
    target: "browser",
    naming: "setup.js",
    define: {
        "process.env.NODE_ENV": JSON.stringify("production"),
    },
});

const resultLogin = await build({
    entrypoints: ["./web/src/login.ts"],
    outdir: "./web/dist",
    minify: true,
    sourcemap: "none",
    target: "browser",
    naming: "login.js",
    define: {
        "process.env.NODE_ENV": JSON.stringify("production"),
    },
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
                await cp(src, dest);
            }
        }
        console.log("✅ Locales copied to web/dist/locales");

        // Copy HTML & Public Assets with Cache Busting
        const copyWithVersion = async (src: string, dest: string) => {
            let content = await readFile(src, 'utf-8');
            const version = Math.floor(Date.now() / 1000);
            content = content.replace(/(\?v=)[0-9]+/g, `$1${version}`);
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

        // Copy Favicon explicitly to root
        if (existsSync('./web/public/favicon.png')) {
            await cp('./web/public/favicon.png', './web/dist/favicon.png');
            console.log("✅ Favicon copied to web/dist/favicon.png");
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
