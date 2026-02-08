import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// 1. Get version from args
const newVersion = process.argv[2];
if (!newVersion) {
    console.error("❌ Usage: bun run scripts/set_version.ts <version>");
    process.exit(1);
}

// Validation (Basic SemVer)
if (!/^\d+\.\d+\.\d+(-[\w\.]+)?$/.test(newVersion)) {
    console.error("❌ Invalid version format. Use x.y.z or x.y.z-beta.xx or x.y.z-rc.xx");
    process.exit(1);
}

console.log(`🚀 Updating version to: ${newVersion}`);

// 2. Update package.json
const pkgPath = join(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log("✅ Updated package.json");

// 3. Update internal/version/version.go
const goVersionPath = join(process.cwd(), 'internal/version/version.go');
let goContent = readFileSync(goVersionPath, 'utf-8');
goContent = goContent.replace(/Current = "v.*"/, `Current = "v${newVersion}"`);
writeFileSync(goVersionPath, goContent);
console.log("✅ Updated internal/version/version.go");

// 4. Update SettingsContent.ts
const settingsPath = join(process.cwd(), 'web/src/components/ui/SettingsContent/SettingsContent.ts');
let settingsContent = readFileSync(settingsPath, 'utf-8');
settingsContent = settingsContent.replace(/private version = 'v.*';/, `private version = 'v${newVersion}';`);
writeFileSync(settingsPath, settingsContent);
console.log("✅ Updated SettingsContent.ts");

console.log("✨ All files updated!");
