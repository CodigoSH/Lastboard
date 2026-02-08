import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';

const SRC_DIR = join(process.cwd(), 'web/src');
const LOCALE_PATH = join(process.cwd(), 'web/public/locales/en.json');

// Load Master Keys
if (!require('fs').existsSync(LOCALE_PATH)) {
    console.error('❌ en.json not found at', LOCALE_PATH);
    process.exit(1);
}
const enContent = JSON.parse(readFileSync(LOCALE_PATH, 'utf-8'));
const validKeys = new Set(Object.keys(enContent));

console.log(`🔍 Scanning ${SRC_DIR} for translation issues...`);
console.log(`📚 Loaded ${validKeys.size} valid translation keys.\n`);

let missingKeysCount = 0;
let suspiciousStringsCount = 0;

function scanDir(dir: string) {
    const files = readdirSync(dir);

    files.forEach(file => {
        const path = join(dir, file);
        const stat = statSync(path);

        if (stat.isDirectory()) {
            scanDir(path);
        } else if (stat.isFile()) {
            const ext = extname(file);
            if (['.ts', '.html'].includes(ext)) {
                checkFile(path);
            }
        }
    });
}

function checkFile(filePath: string) {
    const content = readFileSync(filePath, 'utf-8');
    const relativePath = filePath.replace(process.cwd(), '');

    // 1. Check for i18n.t('MISSING_KEY')
    // Regex matches: i18n.t(' or " followed by key followed by ' or "
    const i18nRegex = /i18n\.t\(['"]([^'"]+)['"]\)/g;
    let match;
    while ((match = i18nRegex.exec(content)) !== null) {
        const key = match[1];
        if (!validKeys.has(key)) {
            console.log(`❌ [Missing Key] ${relativePath}: i18n.t('${key}')`);
            missingKeysCount++;
        }
    }

    // 2. Heuristic: Check for hardcoded UI strings
    // Ignored: imports, console logs, empty strings, short strings, etc.
    // This is VERY rough and intended to catch obvious cases.

    // Look for textContent = '...' or textContent = "..."
    const textContentRegex = /textContent\s*=\s*['"]([^'"]+)['"]/g;
    while ((match = textContentRegex.exec(content)) !== null) {
        const str = match[1];
        if (str.length > 2 && !str.startsWith('var(') && !str.includes('${')) {
            console.log(`⚠️  [Hardcoded?] ${relativePath}: textContent = "${str}"`);
            suspiciousStringsCount++;
        }
    }

    // Look for html templates >Text< (simplified)
    if (filePath.endsWith('.template.ts') || filePath.endsWith('.html')) {
        // Find text between tags >TEXT<
        const htmlTextRegex = />([^<{}]+)</g;
        while ((match = htmlTextRegex.exec(content)) !== null) {
            const str = match[1].trim();
            if (str.length > 3 && !/^\d+$/.test(str) && !str.startsWith('&')) {
                console.log(`⚠️  [Hardcoded HTML?] ${relativePath}: "> ${str} <"`);
                suspiciousStringsCount++;
            }
        }
    }
}

scanDir(SRC_DIR);

console.log('\n----------------------------------------');
console.log(`Scan Complete.`);
console.log(`❌ Missing Keys Found: ${missingKeysCount}`);
console.log(`⚠️  Suspicious Strings: ${suspiciousStringsCount}`);

if (missingKeysCount > 0) {
    process.exit(1);
}
