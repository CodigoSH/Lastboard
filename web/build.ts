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

if (result.success && resultSetup.success) {
    console.log("✅ Build Complete!");
    console.log("📂 Output: web/dist/bundle.js & web/dist/setup.js");
} else {
    // Combine logs
    const logs = [...result.logs, ...resultSetup.logs];

    console.error("❌ Build Failed:");
    for (const message of logs) {
        console.error(message);
    }
    process.exit(1);
}
