
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const LOCALES_DIR = join(process.cwd(), 'web/public/locales');
const EN_PATH = join(LOCALES_DIR, 'en.json');

if (!require('fs').existsSync(EN_PATH)) {
    console.error('❌ en.json not found!');
    process.exit(1);
}

const enKeys = Object.keys(JSON.parse(readFileSync(EN_PATH, 'utf-8')));
const files = readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json') && f !== 'en.json');

let hasError = false;

console.log(`🔍 Auditing ${files.length} locales against en.json (${enKeys.length} keys)...\n`);

files.forEach(file => {
    const content = JSON.parse(readFileSync(join(LOCALES_DIR, file), 'utf-8'));
    const keys = Object.keys(content);
    const missing = enKeys.filter(k => !keys.includes(k));
    const extra = keys.filter(k => !enKeys.includes(k));

    if (missing.length > 0 || extra.length > 0) {
        hasError = true;
        console.log(`⚠️  ${file}:`);
        if (missing.length > 0) console.log(`   - Missing ${missing.length} keys (e.g. ${missing.slice(0, 3).join(', ')}...)`);
        if (extra.length > 0) console.log(`   - Extra ${extra.length} keys (e.g. ${extra.slice(0, 3).join(', ')}...)`);
    } else {
        console.log(`✅ ${file}: OK`);
    }
});

if (hasError) {
    console.log('\n❌ Audit failed: discrepancies found.');
    process.exit(1);
} else {
    console.log('\n✅ Audit Passed: All locales match English structure.');
}
