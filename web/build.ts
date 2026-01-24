import { build } from "bun";

console.log("🚀 Starting Build...");

const result = await build({
    entrypoints: ["./web/src/index.ts"],
    outdir: "./web/dist",
    minify: true,
    sourcemap: "external",
    target: "browser",
    naming: "bundle.js", // Force output filename
});

if (result.success) {
    console.log("✅ Build Complete!");
    console.log("📂 Output: web/dist/bundle.js");
} else {
    console.error("❌ Build Failed:");
    for (const message of result.logs) {
        console.error(message);
    }
    process.exit(1);
}
