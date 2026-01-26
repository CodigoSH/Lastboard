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
} else {
    // Combine logs
    const logs = [...result.logs, ...resultSetup.logs];

    console.error("❌ Build Failed:");
    for (const message of logs) {
        console.error(message);
    }
    process.exit(1);
}
