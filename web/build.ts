import { build } from "bun";

console.log("🚀 Starting Build...");

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
    console.log("✅ Build Complete!");
    console.log("📂 Output: web/dist/bundle.js, web/dist/setup.js & web/dist/login.js");

    // Copy Locales
    const { cp, mkdir } = await import('fs/promises');
    const { existsSync } = await import('fs');
    const path = await import('path');

    try {
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
        console.log("✅ Locales copied to web/dist/locales");

        // Copy HTML & Public Assets
        await cp('./web/index.html', './web/dist/index.html');
        await cp('./web/login.html', './web/dist/login.html');
        await cp('./web/setup.html', './web/dist/setup.html');

        // Copy Public folder (CSS, Icons, etc)
        // Check availability to avoid errors
        if (existsSync('./web/public')) {
            await cp('./web/public', './web/dist/public', { recursive: true });
        }

        // Copy Styles folder
        if (existsSync('./web/styles')) {
            await cp('./web/styles', './web/dist/styles', { recursive: true });
        }

        console.log("✅ HTML, Styles & Public assets copied to web/dist");
    } catch (e) {
        console.error("❌ Failed to copy locales:", e);
    }
} else {
    // Combine logs
    const logs = [...result.logs, ...resultSetup.logs];

    console.error("❌ Build Failed:");
    for (const message of logs) {
        console.error(message);
    }
    process.exit(1);
}
