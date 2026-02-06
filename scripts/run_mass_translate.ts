
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const LOCALE_DIR = join(process.cwd(), 'web/public/locales');

const translations = {
    // English (Source)
    "en": {
        "widget.clock.city": "City",
        "widget.clock.city_placeholder": "e.g. London, Tokyo, New York",
        "widget.clock.city_desc": "Enter your city name to automatically set the timezone",
        "widget.clock.use_12h": "Use 12-Hour Format",
        "widget.clock.show_date": "Show Date",
        "widget.config.no_config": "No configuration available for this item."
    },
    // Spanish
    "es": {
        "widget.clock.city": "Ciudad",
        "widget.clock.city_placeholder": "ej. Madrid, Buenos Aires, Ciudad de México",
        "widget.clock.city_desc": "Introduce tu ciudad para autodetectar la zona horaria",
        "widget.clock.use_12h": "Usar formato 12h",
        "widget.clock.show_date": "Mostrar Fecha",
        "widget.config.no_config": "No hay configuración disponible para este elemento."
    },
    // French
    "fr": {
        "widget.clock.city": "Ville",
        "widget.clock.city_placeholder": "ex. Paris, Montréal, Bruxelles",
        "widget.clock.city_desc": "Entrez votre ville pour définir le fuseau horaire automatiquement",
        "widget.clock.use_12h": "Format 12h",
        "widget.clock.show_date": "Afficher la date",
        "widget.config.no_config": "Aucune configuration disponible pour cet élément."
    },
    // German
    "de": {
        "widget.clock.city": "Stadt",
        "widget.clock.city_placeholder": "z.B. Berlin, Wien, Zürich",
        "widget.clock.city_desc": "Geben Sie Ihre Stadt ein, um die Zeitzone automatisch festzulegen",
        "widget.clock.use_12h": "12-Stunden-Format",
        "widget.clock.show_date": "Datum anzeigen",
        "widget.config.no_config": "Keine Konfiguration für dieses Element verfügbar."
    },
    // Italian
    "it": {
        "widget.clock.city": "Città",
        "widget.clock.city_placeholder": "es. Roma, Milano, Napoli",
        "widget.clock.city_desc": "Inserisci la tua città per impostare automaticamente il fuso orario",
        "widget.clock.use_12h": "Formato 12 ore",
        "widget.clock.show_date": "Mostra data",
        "widget.config.no_config": "Nessuna configurazione disponibile per questo elemento."
    },
    // Portuguese
    "pt": {
        "widget.clock.city": "Cidade",
        "widget.clock.city_placeholder": "ex. Lisboa, São Paulo, Rio",
        "widget.clock.city_desc": "Digite o nome da sua cidade para definir o fuso horário automaticamente",
        "widget.clock.use_12h": "Formato 12h",
        "widget.clock.show_date": "Mostrar Data",
        "widget.config.no_config": "Nenhuma configuração disponível para este item."
    },
    // Chinese (Simplified)
    "zh": {
        "widget.clock.city": "城市",
        "widget.clock.city_placeholder": "例如 北京, 上海, 台北",
        "widget.clock.city_desc": "输入您的城市名称以自动设置时区",
        "widget.clock.use_12h": "使用12小时制",
        "widget.clock.show_date": "显示日期",
        "widget.config.no_config": "此项目没有可用的配置。"
    },
    // Japanese
    "ja": {
        "widget.clock.city": "都市",
        "widget.clock.city_placeholder": "例：東京、大阪、京都",
        "widget.clock.city_desc": "都市名を入力してタイムゾーンを自動設定します",
        "widget.clock.use_12h": "12時間形式を使用",
        "widget.clock.show_date": "日付を表示",
        "widget.config.no_config": "このアイテムには設定がありません。"
    },
    // Russian
    "ru": {
        "widget.clock.city": "Город",
        "widget.clock.city_placeholder": "напр. Москва, Санкт-Петербург",
        "widget.clock.city_desc": "Введите название города для автоматической настройки часового пояса",
        "widget.clock.use_12h": "12-часовой формат",
        "widget.clock.show_date": "Показать дату",
        "widget.config.no_config": "Конфигурация для этого элемента недоступна."
    },
    // Arabic
    "ar": {
        "widget.clock.city": "المدينة",
        "widget.clock.city_placeholder": "مثال: دبي، القاهرة، الرياض",
        "widget.clock.city_desc": "أدخل اسم مدينتك لتعيين المنطقة الزمنية تلقائيًا",
        "widget.clock.use_12h": "استخدام تنسيق 12 ساعة",
        "widget.clock.show_date": "إظهار التاريخ",
        "widget.config.no_config": "لا يوجد تكوين متاح لهذا العنصر."
    },
    // Hindi
    "hi": {
        "widget.clock.city": "शहर",
        "widget.clock.city_placeholder": "जैसे दिल्ली, मुंबई, बैंगलोर",
        "widget.clock.city_desc": "समय क्षेत्र स्वचालित रूप से सेट करने के लिए अपना शहर दर्ज करें",
        "widget.clock.use_12h": "12-घंटे का प्रारूप",
        "widget.clock.show_date": "तारीख दिखाएं",
        "widget.config.no_config": "इस आइटम के लिए कोई कॉन्फ़िगरेशन उपलब्ध नहीं है।"
    },
    // Korean
    "ko": {
        "widget.clock.city": "도시",
        "widget.clock.city_placeholder": "예: 서울, 부산, 인천",
        "widget.clock.city_desc": "도시 이름을 입력하여 시간대를 자동으로 설정하세요",
        "widget.clock.use_12h": "12시간 형식 사용",
        "widget.clock.show_date": "날짜 표시",
        "widget.config.no_config": "이 항목에 대한 구성이 없습니다."
    },
    // Dutch
    "nl": {
        "widget.clock.city": "Stad",
        "widget.clock.city_placeholder": "bijv. Amsterdam, Rotterdam",
        "widget.clock.city_desc": "Voer uw stad in om de tijdzone automatisch in te stellen",
        "widget.clock.use_12h": "12-uurs formaat",
        "widget.clock.show_date": "Datum tonen",
        "widget.config.no_config": "Geen configuratie beschikbaar voor dit item."
    },
    // Polish
    "pl": {
        "widget.clock.city": "Miasto",
        "widget.clock.city_placeholder": "np. Warszawa, Kraków",
        "widget.clock.city_desc": "Wpisz nazwę miasta, aby automatycznie ustawić strefę czasową",
        "widget.clock.use_12h": "Format 12-godzinny",
        "widget.clock.show_date": "Pokaż datę",
        "widget.config.no_config": "Brak konfiguracji dla tego elementu."
    },
    // Turkish
    "tr": {
        "widget.clock.city": "Şehir",
        "widget.clock.city_placeholder": "örn. İstanbul, Ankara",
        "widget.clock.city_desc": "Saat dilimini otomatik ayarlamak için şehir girin",
        "widget.clock.use_12h": "12 Saat Biçimi",
        "widget.clock.show_date": "Tarihi Göster",
        "widget.config.no_config": "Bu öğe için yapılandırma yok."
    },
    // Indonesian
    "id": {
        "widget.clock.city": "Kota",
        "widget.clock.city_placeholder": "contoh: Jakarta, Surabaya",
        "widget.clock.city_desc": "Masukkan nama kota untuk mengatur zona waktu secara otomatis",
        "widget.clock.use_12h": "Gunakan format 12 jam",
        "widget.clock.show_date": "Tampilkan Tanggal",
        "widget.config.no_config": "Tidak ada konfigurasi untuk item ini."
    },
    // Greek
    "el": {
        "widget.clock.city": "Πόλη",
        "widget.clock.city_placeholder": "π.χ. Αθήνα, Θεσσαλονίκη",
        "widget.clock.city_desc": "Εισάγετε την πόλη σας για αυτόματη ρύθμιση ζώνης ώρας",
        "widget.clock.use_12h": "Μορφή 12 ωρών",
        "widget.clock.show_date": "Εμφάνιση ημερομηνίας",
        "widget.config.no_config": "Δεν υπάρχει διαθέσιμη διαμόρφωση για αυτό το στοιχείο."
    },
    // Bengali
    "bn": {
        "widget.clock.city": "শহর",
        "widget.clock.city_placeholder": "উদাঃ ঢাকা, চট্টগ্রাম",
        "widget.clock.city_desc": "স্বয়ংক্রিয়ভাবে সময় অঞ্চল সেট করতে আপনার শহরের নাম লিখুন",
        "widget.clock.use_12h": "১২-ঘন্টা বিন্যাস ব্যবহার করুন",
        "widget.clock.show_date": "তারিখ দেখান",
        "widget.config.no_config": "এই আইটেমের জন্য কোন কনফিগারেশন নেই।"
    },
    // Persian (Farsi)
    "fa": {
        "widget.clock.city": "شهر",
        "widget.clock.city_placeholder": "مثال: تهران، مشهد",
        "widget.clock.city_desc": "نام شهر خود را وارد کنید تا منطقه زمانی به صورت خودکار تنظیم شود",
        "widget.clock.use_12h": "استفاده از فرمت ۱۲ ساعته",
        "widget.clock.show_date": "نمایش تاریخ",
        "widget.config.no_config": "تنظیماتی برای این مورد وجود ندارد."
    },
    // Urdu
    "ur": {
        "widget.clock.city": "شہر",
        "widget.clock.city_placeholder": "مثال: کراچی، لاہور",
        "widget.clock.city_desc": "ٹائم زون خودکار طور پر سیٹ کرنے کے لیے اپنے شہر کا نام درج کریں",
        "widget.clock.use_12h": "12 گھنٹے کا فارمیٹ استعمال کریں",
        "widget.clock.show_date": "تاریخ دکھائیں",
        "widget.config.no_config": "اس آئٹم کے لیے کوئی ترتیب دستیاب نہیں ہے۔"
    }

};

readdirSync(LOCALE_DIR).forEach(file => {
    if (!file.endsWith('.json')) return;
    const langCode = file.replace('.json', '');
    const filePath = join(LOCALE_DIR, file);

    // Default to English if specific translation missing
    const newKeys = translations[langCode] || translations['en'];

    // If it's the English default, we skip overwriting unless it's genuinely missing
    // But actually, we want to force update these keys.

    try {
        const content = JSON.parse(readFileSync(filePath, 'utf-8'));

        // Merge updates
        const updated = { ...content, ...newKeys };

        // Write back
        writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
        console.log(`✅ Updated ${file}`);
    } catch (e) {
        console.error(`❌ Failed to update ${file}`, e);
    }
});
