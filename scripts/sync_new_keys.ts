import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const LOCALE_DIR = join(process.cwd(), 'web/public/locales');
const MASTER_FILE = join(LOCALE_DIR, 'en.json');

const masterContent = JSON.parse(readFileSync(MASTER_FILE, 'utf-8'));
const masterKeys = Object.keys(masterContent);

console.log(`📚 Master (EN) has ${masterKeys.length} keys.`);

// FULL DICTIONARY FOR ALL 20 LANGUAGES
// Keys: es, fr, de, it, pt, ru, zh, ja, ko, nl, pl, tr, id, ar, fa, el, hi, bn, ur
const COMMON_TRANSLATIONS: Record<string, Record<string, string>> = {
    // --- Existing Keys (Preserved) ---
    "widget.notepad.placeholder": {
        "es": "Empieza a escribir tus notas...", "fr": "Commencez à écrire vos notes...", "it": "Inizia a scrivere le tue note...", "pt": "Comece a escrever...", "de": "Notizen schreiben...",
        "ru": "Начать писать...", "zh": "开始写作...", "ja": "書き始める...", "ko": "쓰기 시작...", "nl": "Begin met schrijven...", "pl": "Zacznij pisać...", "tr": "Yazmaya başla...",
        "id": "Mulai menulis...", "ar": "ابدأ الكتابة...", "fa": "شروع به نوشتن...", "el": "Ξεκινήστε να γράφετε...", "hi": "लिखना शुरू करें...", "bn": "লেখা শুরু করুন...", "ur": "لکھنا شروع کریں..."
    },
    "widget.notepad.tool.undo": { "es": "Deshacer", "fr": "Annuler", "it": "Annulla", "pt": "Desfazer", "de": "Rückgängig", "ru": "Отменить", "zh": "撤销", "ja": "元に戻す", "ar": "تراجع" },
    "widget.notepad.tool.redo": { "es": "Rehacer", "fr": "Rétablir", "it": "Ripeti", "pt": "Refazer", "de": "Wiederholen", "ru": "Повторить", "zh": "重做", "ja": "やり直し", "ar": "إعادة" },
    "widget.notepad.tool.save": { "es": "Guardar", "fr": "Enregistrer", "it": "Salva", "pt": "Salvar", "de": "Speichern", "ru": "Сохранить", "zh": "保存", "ja": "保存", "ar": "حفظ" },
    "widget.notepad.tool.bold": { "es": "Negrita", "fr": "Gras", "it": "Grassetto", "pt": "Negrito", "de": "Fett", "ru": "Жирный", "zh": "粗体", "ja": "太字", "ar": "غامق" },
    "widget.notepad.tool.italic": { "es": "Cursiva", "fr": "Italique", "it": "Corsivo", "pt": "Itálico", "de": "Kursiv", "ru": "Курсив", "zh": "斜体", "ja": "斜体", "ar": "مائل" },

    // --- NEW KEYS (Addressing User Complaint) ---
    "widget.notepad.tool.h1": {
        "es": "Encabezado 1", "fr": "Titre 1", "it": "Intestazione 1", "pt": "Título 1", "de": "Überschrift 1", "nl": "Kop 1",
        "ru": "Заголовок 1", "zh": "标题 1", "ja": "見出し 1", "ko": "제목 1", "tr": "Başlık 1", "pl": "Nagłówek 1",
        "id": "Judul 1", "ar": "عنوان 1", "fa": "عنوان 1", "el": "Επικεφαλίδα 1", "hi": "शीर्षक 1", "bn": "শিরোনাম ১", "ur": "سرخی 1"
    },
    "widget.notepad.tool.h2": {
        "es": "Encabezado 2", "fr": "Titre 2", "it": "Intestazione 2", "pt": "Título 2", "de": "Überschrift 2", "nl": "Kop 2",
        "ru": "Заголовок 2", "zh": "标题 2", "ja": "見出し 2", "ko": "제목 2", "tr": "Başlık 2", "pl": "Nagłówek 2",
        "id": "Judul 2", "ar": "عنوان 2", "fa": "عنوان 2", "el": "Επικεφαλίδα 2", "hi": "शीर्षक 2", "bn": "শিরোনাম ২", "ur": "سرخی 2"
    },
    "widget.notepad.tool.color": {
        "es": "Color de Texto", "fr": "Couleur du texte", "it": "Colore testo", "pt": "Cor do texto", "de": "Textfarbe", "nl": "Tekstkleur",
        "ru": "Цвет текста", "zh": "文本颜色", "ja": "文字色", "ko": "텍스트 색상", "tr": "Metin Rengi", "pl": "Kolor tekstu",
        "id": "Warna Teks", "ar": "لون النص", "fa": "رنگ متن", "el": "Χρώμα κειμένου", "hi": "पाठ का रंग", "bn": "পাঠ্যের রঙ", "ur": "متن کا رنگ"
    },
    "widget.notepad.tool.align_left": {
        "es": "Alinear Izquierda", "fr": "Aligner à gauche", "it": "Allinea a sinistra", "pt": "Alinhar à esquerda", "de": "Linksbündig", "nl": "Links uitlijnen",
        "ru": "По левому краю", "zh": "左对齐", "ja": "左揃え", "ko": "왼쪽 정렬", "tr": "Sola Hizala", "pl": "Wyrównaj do lewej",
        "id": "Rata Kiri", "ar": "محاذاة لليسار", "fa": "چپ‌چین", "el": "Στοίχιση αριστερά", "hi": "بائیں ओर संरेखित करें", "bn": "বাম দিকে সারিবদ্ধ করুন", "ur": "بائیں طرف سیدھ کریں"
    },
    "widget.notepad.tool.align_center": {
        "es": "Centrar", "fr": "Centrer", "it": "Centra", "pt": "Centralizar", "de": "Zentriert", "nl": "Centreren",
        "ru": "По центру", "zh": "居中", "ja": "中央揃え", "ko": "가운데 정렬", "tr": "Ortala", "pl": "Wyśrodkuj",
        "id": "Rata Tengah", "ar": "توسيط", "fa": "وسط‌چین", "el": "Στοίχιση στο κέντρο", "hi": "केंद्रित करें", "bn": "কেন্দ্র করুন", "ur": "درمیان میں کریں"
    },
    "widget.notepad.tool.align_right": {
        "es": "Alinear Derecha", "fr": "Aligner à droite", "it": "Allinea a destra", "pt": "Alinhar à direita", "de": "Rechtsbündig", "nl": "Rechts uitlijnen",
        "ru": "По правому краю", "zh": "右对齐", "ja": "右揃え", "ko": "오른쪽 정렬", "tr": "Sağa Hizala", "pl": "Wyrównaj do prawej",
        "id": "Rata Kanan", "ar": "محاذاة لليمين", "fa": "راست‌چین", "el": "Στοίχιση δεξιά", "hi": "दाएं ओर संरेखित करें", "bn": "ডান দিকে সারিবদ্ধ করুন", "ur": "دائیں طرف سیدھ کریں"
    },
    "widget.notepad.tool.checklist": {
        "es": "Lista de Tareas", "fr": "Liste de tâches", "it": "Lista di controllo", "pt": "Lista de verificação", "de": "Checkliste", "nl": "Checklist",
        "ru": "Чек-лист", "zh": "清单", "ja": "チェックリスト", "ko": "체크리스트", "tr": "Kontrol Listesi", "pl": "Lista kontrolna",
        "id": "Daftar Periksa", "ar": "قائمة التحقق", "fa": "لیست بررسی", "el": "Λίστα ελέγχου", "hi": "चेकलिस्ट", "bn": "চেকলিস্ট", "ur": "چیک لسٹ"
    },
    "widget.notepad.tool.list_bullet": {
        "es": "Viñetas", "fr": "Puces", "it": "Elenco puntato", "pt": "Marcadores", "de": "Aufzählung", "nl": "Opsommingstekens",
        "ru": "Маркированный список", "zh": "项目符号", "ja": "箇条書き", "ko": "글머리 기호", "tr": "Madde İşaretleri", "pl": "Punktory",
        "id": "Poin", "ar": "قائمة نقطية", "fa": "لیست نقطه‌ای", "el": "Κουκκίδες", "hi": "बुलेट सूची", "bn": "বুলেট তালিকা", "ur": "بلٹ لسٹ"
    },
    "widget.notepad.tool.list_ordered": {
        "es": "Lista Numerada", "fr": "Liste numérotée", "it": "Elenco numerato", "pt": "Lista numerada", "de": "Nummerierte Liste", "nl": "Genummerde lijst",
        "ru": "Нумерованный список", "zh": "编号列表", "ja": "番号付きリスト", "ko": "번호 매기기 목록", "tr": "Numaralandırılmış Liste", "pl": "Lista numerowana",
        "id": "Daftar Bernomor", "ar": "قائمة مرقمة", "fa": "لیست عددی", "el": "Αριθμημένη λίστα", "hi": "क्रमांकित सूची", "bn": "সংখ্যাযুক্ত তালিকা", "ur": "نمبر وار فہرست"
    },
    "widget.notepad.tool.code": {
        "es": "Código", "fr": "Code", "it": "Codice", "pt": "Código", "de": "Code", "nl": "Code",
        "ru": "Код", "zh": "代码", "ja": "コード", "ko": "코드", "tr": "Kod", "pl": "Kod",
        "id": "Kode", "ar": "كود", "fa": "کد", "el": "Κώδικας", "hi": "कोड", "bn": "কোড", "ur": "کوڈ"
    },
    "widget.notepad.tool.link": {
        "es": "Enlace", "fr": "Lien", "it": "Link", "pt": "Link", "de": "Link", "nl": "Link",
        "ru": "Ссылка", "zh": "链接", "ja": "リンク", "ko": "링크", "tr": "Bağlantı", "pl": "Link",
        "id": "Tautan", "ar": "رابط", "fa": "لینک", "el": "Σύνδεσμος", "hi": "लिंक", "bn": "লিঙ্ক", "ur": "لنک"
    },
    "widget.notepad.tool.image": {
        "es": "Imagen", "fr": "Image", "it": "Immagine", "pt": "Imagem", "de": "Bild", "nl": "Afbeelding",
        "ru": "Изображение", "zh": "图片", "ja": "画像", "ko": "이미지", "tr": "Resim", "pl": "Obraz",
        "id": "Gambar", "ar": "صورة", "fa": "تصویر", "el": "Εικόνα", "hi": "छवि", "bn": "ছবি", "ur": "تصویر"
    },
    "widget.notepad.tool.clear_format": {
        "es": "Borrar Formato", "fr": "Effacer le format", "it": "Cancella formato", "pt": "Limpar formatação", "de": "Formatierung löschen", "nl": "Opmaak wissen",
        "ru": "Очистить формат", "zh": "清除格式", "ja": "書式をクリア", "ko": "서식 지우기", "tr": "Biçimlendirmeyi Temizle", "pl": "Wyczyść formatowanie",
        "id": "Hapus Format", "ar": "مسح التنسيق", "fa": "پاک کردن فرمت", "el": "Εκκαθάριση μορφοποίησης", "hi": "प्रारूप साफ़ करें", "bn": "ফরম্যাট মুছুন", "ur": "فارمیٹ صاف کریں"
    },
    "widget.clock.name": { "es": "Reloj", "fr": "Horloge", "it": "Orologio", "pt": "Relógio", "de": "Uhr", "ar": "ساعة" },
    "widget.notepad.name": { "es": "Bloc de Notas", "fr": "Bloc-notes", "it": "Blocco note", "pt": "Bloco de notas", "de": "Notizblock", "ar": "المفكرة" },
    "widget.telemetry.name": { "es": "Estado del Sistema", "fr": "État du Système", "it": "Stato del Sistema", "pt": "Status do Sistema", "de": "Systemstatus", "ar": "حالة النظام" }
};

const files = readdirSync(LOCALE_DIR).filter(f => f.endsWith('.json') && f !== 'en.json');

files.forEach(file => {
    const lang = file.replace('.json', '');
    const path = join(LOCALE_DIR, file);
    let content: Record<string, string> = {};

    try { content = JSON.parse(readFileSync(path, 'utf-8')); } catch (e) { }

    let added = 0;
    let updated = 0;

    masterKeys.forEach(key => {
        let newValue = content[key];
        const hasTranslation = COMMON_TRANSLATIONS[key] && COMMON_TRANSLATIONS[key][lang];

        // Always force update if we have a better translation in dictionary and current value matches English (or is missing)
        // OR simply force update for these specific keys to ensure correctness
        if (hasTranslation) {
            const dictValue = COMMON_TRANSLATIONS[key][lang];
            if (content[key] !== dictValue) {
                content[key] = dictValue;
                updated++;
            }
        } else if (!content.hasOwnProperty(key)) {
            content[key] = masterContent[key]; // Fallback
            added++;
        }
    });

    if (added > 0 || updated > 0) {
        // Sort
        const sorted: Record<string, string> = {};
        masterKeys.forEach(k => { if (content[k]) sorted[k] = content[k]; });
        Object.keys(content).forEach(k => { if (!sorted[k]) sorted[k] = content[k]; });

        writeFileSync(path, JSON.stringify(sorted, null, 2));
        console.log(`✅ ${lang}: Updated ${updated} keys`);
    } else {
        console.log(`✨ ${lang}: Up to date`);
    }
});
