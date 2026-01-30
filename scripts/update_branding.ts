import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const LOCALE_DIR = './web/public/locales';

const translations: Record<string, string> = {
    en: "Administrator",
    es: "Administrador",
    fr: "Administrateur",
    de: "Administrator",
    it: "Amministratore",
    pt: "Administrador",
    nl: "Beheerder",
    pl: "Administrator",
    ru: "Администратор",
    tr: "Yönetici",
    ar: "مسؤول",
    zh: "管理员",
    ja: "管理者",
    ko: "관리자",
    hi: "प्रशासक",
    bn: "প্রশাসক",
    id: "Administrator",
    ur: "منتظم",
    fa: "مدیر",
    el: "Διαχειριστής"
};

const BRAND_NAME = "Kashboard";

async function updateBranding() {
    try {
        const files = await readdir(LOCALE_DIR);

        for (const file of files) {
            if (!file.endsWith('.json')) continue;

            const langCode = file.replace('.json', '');
            const filePath = join(LOCALE_DIR, file);

            const content = await readFile(filePath, 'utf-8');
            let json = JSON.parse(content);

            // 1. Force Brand Name
            json["app.title"] = BRAND_NAME;

            // 2. Update Root User Terminology
            if (translations[langCode]) {
                json["setup.root_user"] = translations[langCode];
            } else {
                console.warn(`⚠️ No translation for 'Administrator' in ${langCode}, using English.`);
                json["setup.root_user"] = "Administrator";
            }

            await writeFile(filePath, JSON.stringify(json, null, 2), 'utf-8');
            console.log(`✅ Updated ${file}: Title="${BRAND_NAME}", User="${json["setup.root_user"]}"`);
        }

        console.log("🎉 All locales updated successfully!");

    } catch (error) {
        console.error("❌ Error updating locales:", error);
        process.exit(1);
    }
}

updateBranding();
