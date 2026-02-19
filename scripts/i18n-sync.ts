import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const LOCALE_DIR = join(process.cwd(), 'web/public/locales');
const MASTER_FILE = join(LOCALE_DIR, 'en.json');

const masterContent = JSON.parse(readFileSync(MASTER_FILE, 'utf-8'));
const masterKeys = Object.keys(masterContent);

console.log(`📚 Master (EN) has ${masterKeys.length} keys.`);

// All locale files except en.json
const files = readdirSync(LOCALE_DIR).filter(f => f.endsWith('.json') && f !== 'en.json');

files.forEach(file => {
    const lang = file.replace('.json', '');
    const path = join(LOCALE_DIR, file);
    let content: Record<string, string> = {};

    try { content = JSON.parse(readFileSync(path, 'utf-8')); } catch (e) { }

    let added = 0;
    let updated = 0;

    // Remove legacy/deprecated keys
    const legacyKeys = ['type.group', 'bookmark.visible_mobile', 'bookmark.visible_tablet'];
    legacyKeys.forEach(key => { if (content[key]) { delete content[key]; updated++; } });

    // Add missing keys using English as fallback
    masterKeys.forEach(key => {
        if (!content.hasOwnProperty(key)) {
            content[key] = masterContent[key];
            added++;
        }
    });

    // Remove keys that no longer exist in master
    Object.keys(content).forEach(key => {
        if (!masterContent.hasOwnProperty(key) && !legacyKeys.includes(key)) {
            delete content[key];
            updated++;
        }
    });

    if (added > 0 || updated > 0) {
        // Sort keys to match master order
        const sorted: Record<string, string> = {};
        masterKeys.forEach(k => { if (content[k]) sorted[k] = content[k]; });

        writeFileSync(path, JSON.stringify(sorted, null, 2));
        console.log(`✅ ${lang}: Added ${added} keys, Removed/Updated ${updated} keys`);
    } else {
        console.log(`✨ ${lang}: Up to date`);
    }
});
