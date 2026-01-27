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
    "status.offline": {
        es: "Desconectado", fr: "Hors ligne", de: "Offline", it: "Offline", pt: "Offline",
        ru: "Оффлайн", zh: "离线", ja: "オフライン", ko: "오프라인", nl: "Offline",
        pl: "Offline", tr: "Çevrimdışı", id: "Offline", ar: "غير متصل", fa: "آفلاین",
        hi: "ऑफ़लाइन", bn: "অফলাইন", ur: "آف لائن", el: "Εκτός σύνδεσης"
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
