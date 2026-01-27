import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const LOCALES_DIR = join(process.cwd(), 'web/public/locales');
const EN_PATH = join(LOCALES_DIR, 'en.json');

if (!require('fs').existsSync(EN_PATH)) {
    console.error('❌ en.json not found!');
    process.exit(1);
}

const enContent = JSON.parse(readFileSync(EN_PATH, 'utf-8'));
const enKeys = Object.keys(enContent);
const files = readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json') && f !== 'en.json');

console.log(`📊 Audit Report (Master: English - ${enKeys.length} keys)\n`);
console.log(`${'Language'.padEnd(10)} | ${'Status'.padEnd(10)} | ${'Missing'.padEnd(8)} | ${'Untranslated'.padEnd(12)} | ${'Score'.padEnd(6)}`);
console.log('-'.repeat(60));

let hasIssues = false;

files.forEach(file => {
    const langCode = file.replace('.json', '');
    const content = JSON.parse(readFileSync(join(LOCALES_DIR, file), 'utf-8'));
    const keys = Object.keys(content);

    // Check for missing keys
    const missing = enKeys.filter(k => !keys.includes(k));

    // Check for untranslated values (value is identical to English)
    const untranslated = keys.filter(k => content[k] === enContent[k] && enContent[k].trim() !== '');

    const totalIssues = missing.length + untranslated.length;
    const completeness = Math.max(0, ((enKeys.length - totalIssues) / enKeys.length) * 100).toFixed(1);

    let status = '✅ OK';
    if (totalIssues > 0) {
        status = '⚠️  Check';
        hasIssues = true;
    }

    console.log(`${langCode.padEnd(10)} | ${status.padEnd(10)} | ${String(missing.length).padEnd(8)} | ${String(untranslated.length).padEnd(12)} | ${completeness}%`);

    if (missing.length > 0) {
        console.log(`  - Missing: ${missing.join(', ')}`);
    }
    if (untranslated.length > 0) {
        console.log(`  - Untranslated: ${untranslated.join(', ')}`);
    }
});
