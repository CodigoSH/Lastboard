import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const LOCALE_DIR = './web/public/locales';

const completedTranslations: Record<string, string> = {
    en: "Completed",
    es: "Completado",
    fr: "Terminé",
    de: "Abgeschlossen",
    it: "Completato",
    pt: "Concluído",
    nl: "Voltooid",
    pl: "Zakończono",
    ru: "Завершено",
    tr: "Tamamlandı",
    ar: "مكتمل",
    zh: "完成",
    ja: "完了",
    ko: "완료",
    hi: "पूर्ण",
    bn: "সম্পন্ন",
    id: "Selesai",
    ur: "مکمل",
    fa: "کامل شد",
    el: "Ολοκληρώθηκε"
};

async function updateMessages() {
    try {
        const files = await readdir(LOCALE_DIR);

        for (const file of files) {
            if (!file.endsWith('.json')) continue;

            const langCode = file.replace('.json', '');
            const filePath = join(LOCALE_DIR, file);

            const content = await readFile(filePath, 'utf-8');
            let json = JSON.parse(content);

            // Update Welcome Message to "Completed"
            if (completedTranslations[langCode]) {
                json["setup.welcome_admin"] = completedTranslations[langCode];
            } else {
                console.warn(`⚠️ No translation for 'Completed' in ${langCode}, using English.`);
                json["setup.welcome_admin"] = "Completed";
            }

            await writeFile(filePath, JSON.stringify(json, null, 2), 'utf-8');
            console.log(`✅ Updated ${file}: setup.welcome_admin="${json["setup.welcome_admin"]}"`);
        }

        console.log("🎉 All messages updated successfully!");

    } catch (error) {
        console.error("❌ Error updating locales:", error);
        process.exit(1);
    }
}

updateMessages();
