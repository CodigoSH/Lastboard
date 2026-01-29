import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const LOCALE_DIR = join(process.cwd(), 'web/public/locales');

const newKeys = {
    "header.view_changelog": {
        es: "Ver Registro de Cambios",
        fr: "Voir le journal des modifications",
        de: "Änderungsprotokoll anzeigen",
        it: "Visualizza registro modifiche",
        pt: "Ver Registro de Alterações",
        ru: "Просмотреть список изменений",
        zh: "查看更新日志",
        ja: "変更履歴を表示",
        ko: "변경 로그 보기",
        nl: "Bekijk wijzigingslog",
        pl: "Pokaż dziennik zmian",
        tr: "Değişiklik Günlüğünü Görüntüle",
        id: "Lihat Log Perubahan",
        ar: "عرض سجل التغييرات",
        fa: "مشاهده گزارش تغییرات",
        hi: "परिवर्तन लॉग देखें",
        bn: "পরিবর্তন লগ দেখুন",
        ur: "تبدیلی لاگ دیکھیں",
        el: "Προβολή αρχείου αλλαγών"
    },
    "header.view_profile": {
        es: "Ver Perfil", fr: "Voir le profil", de: "Profil anzeigen", it: "Visualizza profilo", pt: "Ver Perfil",
        ru: "Просмотреть профиль", zh: "查看个人资料", ja: "プロフィールを表示", ko: "프로필 보기", nl: "Bekijk profiel",
        pl: "Pokaż profil", tr: "Profili Görüntüle", id: "Lihat Profil", ar: "عرض الملف الشخصي", fa: "مشاهده پروفایل",
        hi: "प्रोफ़ाइल देखें", bn: "প্রোফাইল দেখুন", ur: "پروفائل دیکھئے", el: "Προβολή προφίλ"
    },
    "header.preferences": {
        es: "Preferencias", fr: "Préférences", de: "Einstellungen", it: "Preferenze", pt: "Preferências",
        ru: "Настройки", zh: "首选项", ja: "設定", ko: "환경 설정", nl: "Voorkeuren",
        pl: "Preferencje", tr: "Tercihler", id: "Preferensi", ar: "تفضيلات", fa: "ترجیحات",
        hi: "प्राथमिकताएं", bn: "পছন্দসমূহ", ur: "ترجیحات", el: "Προτιμήσεις"
    },
    "auth.sign_out": {
        es: "Cerrar Sesión", fr: "Déconnexion", de: "Abmelden", it: "Disconnetti", pt: "Sair",
        ru: "Выйти", zh: "退出", ja: "サインアウト", ko: "로그아웃", nl: "Afmelden",
        pl: "Wyloguj", tr: "Çıkış Yap", id: "Keluar", ar: "خروج", fa: "xروج",
        hi: "साइन आउट", bn: "সাইন আউট", ur: "سائن آؤٹ", el: "Αποσύνδεση"
    },
    "settings.github": {
        all: "GitHub" // Same for all
    },
    "notifier.downloading_secure": {
        es: "Iniciando descarga segura...", fr: "Démarrage du téléchargement sécurisé...",
        de: "Sicherer Download wird gestartet...", it: "Avvio download sicuro...",
        pt: "Iniciando download seguro...", ru: "Запуск безопасной загрузки...",
        zh: "正在开始安全下载...", ja: "安全なダウンロードを開始しています...",
        ko: "보안 다운로드 시작 중...", nl: "Veilige download starten...",
        pl: "Rozpoczynanie bezpiecznego pobierania...", tr: "Güvenli indirme başlatılıyor...",
        id: "Memulai unduhan aman...", ar: "بدء التنزيل الآمن...",
        fa: "شروع دانلود امن...", hi: "सुरक्षित डाउनलोड शुरू हो रहा है...",
        bn: "নিরাপদ ডাউনলোড শুরু হচ্ছে...", ur: "محفوظ ڈاؤن لوڈ شروع ہو رہا ہے...",
        el: "Έναρξη ασφαλούς λήψης..."
    },
    "widget.config.title": {
        es: "Configurar Widget", fr: "Configurer le Widget", de: "Widget Konfigurieren", it: "Configura Widget", pt: "Configurar Widget",
        ru: "Настроить виджет", zh: "配置小部件", ja: "ウィジェットの設定", ko: "위젯 구성", nl: "Widget configureren",
        pl: "Konfiguruj widżet", tr: "Widget'ı Yapılandır", id: "Konfigurasi Widget", ar: "تكوين الأداة", fa: "پیکربندی ویجت",
        hi: "विजेट कॉन्फ़िगर करें", bn: "উইজেট কনফিগার করুন", ur: "ویجیٹ کنفیگر کریں", el: "Ρύθμιση γραφικού στοιχείου"
    },
    "widget.clock.timezone": {
        es: "Zona Horaria", fr: "Fuseau horaire", de: "Zeitzone", it: "Fuso orario", pt: "Fuso Horário",
        ru: "Часовой пояс", zh: "时区", ja: "タイムゾーン", ko: "시간대", nl: "Tijdzone",
        pl: "Strefa czasowa", tr: "Saat Dilimi", id: "Zona Waktu", ar: "المنطقة الزمنية", fa: "منطقه زمانی",
        hi: "समय क्षेत्र", bn: "সময় অঞ্চল", ur: "ٹائم زون", el: "Ζώνη ώρας"
    },
    "widget.clock.auto_detect": {
        es: "Auto Detectar", fr: "Détection auto", de: "Automatisch erkennen", it: "Rilevamento auto", pt: "Auto Detectar",
        ru: "Автоопределение", zh: "自动检测", ja: "自動検出", ko: "자동 감지", nl: "Automatisch detecteren",
        pl: "Wykryj automatycznie", tr: "Otomatik Algıla", id: "Deteksi Otomatis", ar: "كشف تلقائي", fa: "تشخیص خودکار",
        hi: "स्वतः पता लगाएँ", bn: "স্বয়ংক্রিয় সনাক্তকরণ", ur: "خودکار شناخت", el: "Αυτόματος εντοπισμός"
    },
    "widget.clock.timezone_desc": {
        es: "ej. America/New_York, UTC, o 'local'", fr: "ex. America/Paris, UTC, ou 'local'",
        de: "z.B. Europe/Berlin, UTC oder 'local'", it: "es. Europe/Rome, UTC, o 'local'",
        pt: "ex. America/Sao_Paulo, UTC, ou 'local'", ru: "например, Europe/Moscow, UTC или 'local'",
        all: "e.g. UTC, 'local'"
    },
    "widget.clock.use_12h": {
        es: "Usar formato 12h", fr: "Format 12h", de: "12-Stunden-Format", it: "Usa formato 12h", pt: "Usar formato 12h",
        ru: "12-часовой формат", zh: "使用 12 小时制", ja: "12時間形式を使用", ko: "12시간 형식 사용", nl: "Gebruik 12-uurs formaat",
        pl: "Format 12-godzinny", tr: "12 Saat Formatı", id: "Gunakan Format 12 Jam", ar: "استخدم تنسيق 12 ساعة",
        fa: "فرمت 12 ساعته", hi: "12-घंटे का प्रारूप", bn: "১২-ঘণ্টার বিন্যাস", ur: "12 گھنٹے کی شکل", el: "Μορφή 12 ωρών"
    },
    "widget.clock.show_date": {
        es: "Mostrar Fecha", fr: "Afficher la date", de: "Datum anzeigen", it: "Mostra data", pt: "Mostrar Data",
        ru: "Показывать дату", zh: "显示日期", ja: "日付を表示", ko: "날짜 표시", nl: "Toon datum",
        pl: "Pokaż datę", tr: "Tarihi Göster", id: "Tampilkan Tanggal", ar: "اظهار التاريخ", fa: "نمایش تاریخ",
        hi: "तिथि दिखाएं", bn: "তারিখ দেখান", ur: "تاریخ دکھائیں", el: "Εμφάνιση ημερομηνίας"
    },
    "status.offline": {
        es: "Desconectado", fr: "Hors ligne", de: "Offline", it: "Offline", pt: "Offline",
        ru: "Оффлайн", zh: "离线", ja: "オフライン", ko: "오프라인", nl: "Offline",
        pl: "Offline", tr: "Çevrimdışı", id: "Offline", ar: "غير متصل", fa: "آفلاین",
        hi: "ऑफ़लाइन", bn: "অফলাইন", ur: "آف لائن", el: "Εκτός σύνδεσης"
    },
    "widget.telemetry.update_interval": {
        es: "Intervalo de actualización", fr: "Intervalle de mise à jour", de: "Aktualisierungsintervall",
        it: "Intervallo di aggiornamento", pt: "Intervalo de Atualização", ru: "Интервал обновления",
        zh: "更新间隔", ja: "更新間隔", ko: "업데이트 간격", nl: "Update-interval",
        pl: "Interwał aktualizacji", tr: "Güncelleme Aralığı", id: "Interval Pembaruan",
        ar: "فاصل التحديث", fa: "فاصله به‌روزرسانی", hi: "अद्यतन अंतराल", bn: "আপডেট বিরতি",
        ur: "اپ ڈیٹ کا وقفہ", el: "Διάστημα ενημέρωσης"
    },
    "widget.telemetry.cpu": {
        all: "CPU", ru: "ЦП", el: "CPU"
    },
    "widget.telemetry.ram": {
        all: "RAM", ru: "ОЗУ", el: "RAM"
    },
    "widget.telemetry.temp": {
        es: "TEMP", fr: "TEMP", de: "TEMP", it: "TEMP", pt: "TEMP",
        ru: "ТЕМП", zh: "温度", ja: "温度", ko: "온도", nl: "TEMP",
        pl: "TEMP", tr: "SICAKLIK", id: "SUHU", ar: "حرارة", fa: "دما",
        hi: "तापमान", bn: "তাপমাত্রা", ur: "درجہ حرارت", el: "ΘΕΡΜ"
    }
};

const files = readdirSync(LOCALE_DIR).filter(f => f.endsWith('.json') && f !== 'en.json');

files.forEach(file => {
    const lang = file.replace('.json', '');
    const path = join(LOCALE_DIR, file);
    const content = JSON.parse(readFileSync(path, 'utf-8'));
    let added = 0;

    Object.keys(newKeys).forEach(key => {
        if (!content[key]) {
            // @ts-ignore
            const translation = newKeys[key][lang] || newKeys[key]['all'] || newKeys[key]['es']; // Fallback to ES or ALL
            content[key] = translation;
            added++;
        }
    });

    if (added > 0) {
        writeFileSync(path, JSON.stringify(content, null, 2));
        console.log(`✅ ${lang}: Added ${added} keys.`);
    }
});
