import { build } from "bun";

console.log("🚀 Starting Build...");

const result = await build({
    entrypoints: ["./web/src/index.ts"],
    outdir: "./web/dist",
    minify: true,
    sourcemap: "external",
    target: "browser",
    naming: "bundle.js",
});

const resultSetup = await build({
    entrypoints: ["./web/src/setup.ts"],
    outdir: "./web/dist",
    minify: true,
    sourcemap: "external",
    target: "browser",
    naming: "setup.js",
});

const resultLogin = await build({
    entrypoints: ["./web/src/login.ts"],
    outdir: "./web/dist",
    minify: true,
    sourcemap: "external",
    target: "browser",
    naming: "login.js",
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
