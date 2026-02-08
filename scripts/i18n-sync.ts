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
    // --- Touch Visibility Toggle ---
    "bookmark.visible_touch": {
        "es": "Visible en Dispositivos Táctiles", "fr": "Visible sur les appareils tactiles", "it": "Visibile sui dispositivi touch", "pt": "Visível em Dispositivos Touch", "de": "Sichtbar auf Touch-Geräten", "nl": "Zichtbaar op aanraakapparaten",
        "ru": "Видно на сенсорных устройствах", "zh": "触摸设备可见", "ja": "タッチデバイスで表示", "ko": "터치 기기에서 표시", "tr": "Dokunmatik Cihazlarda Görünür", "pl": "Widoczne na urządzeniach dotykowych",
        "id": "Terlihat di Perangkat Sentuh", "ar": "مرئي على الأجهزة اللمسية", "fa": "قابل مشاهده در دستگاه‌های لمسی", "el": "Ορατό σε συσκευές αφής", "hi": "टच डिवाइस पर दृश्य", "bn": "টাচ ডিভাইসে দৃশ্যমান", "ur": "ٹچ ڈیوائسز پر نظر آنے والا"
    },
    "bookmark.label": {
        "es": "Título", "fr": "Titre", "it": "Titolo", "pt": "Título", "de": "Titel", "nl": "Titel",
        "ru": "Название", "zh": "标题", "ja": "タイトル", "ko": "제목", "tr": "Başlık", "pl": "Tytył",
        "id": "Judul", "ar": "العنوان", "fa": "عنوان", "el": "Τίτλος", "hi": "शीर्षक", "bn": "শিরোনাম", "ur": "عنوان"
    },
    "section.edit_title": {
        "es": "Editar Sección", "fr": "Modifier la section", "it": "Modifica sezione", "pt": "Editar seção", "de": "Abschnitt bearbeiten", "nl": "Sectie bewerken",
        "ru": "Редактировать раздел", "zh": "编辑部分", "ja": "セクションを編集", "ko": "섹션 편집", "tr": "Bölümü Düzenle", "pl": "Edytuj sekcję",
        "id": "Edit Bagian", "ar": "تحرير القسم", "fa": "ویرایش بخش", "el": "Επεξεργασία ενότητας", "hi": "अनुभाग संपादित करें", "bn": "বিভাগ সম্পাদনা করুন", "ur": "سیکشن میں ترمیم کریں"
    },
    "section.leave_empty": {
        "es": "Dejar vacío para ocultar el título.", "fr": "Laisser vide pour masquer le titre.", "it": "Lasciare vuoto per nascondere il titolo.", "pt": "Deixe vazio para ocultar o título.", "de": "Leer lassen, um den Titel auszublenden.", "nl": "Laat leeg om de titel te verbergen.",
        "ru": "Оставьте пустым, чтобы скрыть заголовок.", "zh": "留空以隐藏标题。", "ja": "タイトルを非表示にするには空のままにします。", "ko": "제목을 숨기려면 비워 두세요.", "tr": "Başlığı gizlemek için boş bırakın.", "pl": "Pozostaw puste, aby ukryć tytuł.",
        "id": "Biarkan kosong untuk menyembunyikan judul.", "ar": "اتركه فارغًا لإخفاء العنوان.", "fa": "برای مخفی کردن عنوان خالی بگذارید.", "el": "Αφήστε κενό για απόκρυψη τίτλου.", "hi": "शीर्षक छिपाने के लिए खाली छोड़ें।", "bn": "শিরোনাম লুকাতে খালি রাখুন।", "ur": "عنوان چھپانے کے لیے خالی چھوڑ دیں۔"
    },
    "auth.welcome": {
        "es": "Bienvenido", "fr": "Bienvenue", "it": "Benvenuto", "pt": "Bem-vindo", "de": "Willkommen", "nl": "Welkom",
        "ru": "Добро пожаловать", "zh": "欢迎", "ja": "ようこそ", "ko": "환영합니다", "tr": "Hoşgeldiniz", "pl": "Witaj",
        "id": "Selamat Datang", "ar": "مرحبًا", "fa": "خوش آمدید", "el": "Καλώς ήρθατε", "hi": "स्वागत है", "bn": "স্বাগতম", "ur": "خوش آمدید"
    },
    "auth.subtitle": {
        "es": "Ingresa tus credenciales", "fr": "Entrez vos identifiants", "it": "Inserisci le tue credenziali", "pt": "Insira suas credenciais", "de": "Geben Sie Ihre Zugangsdaten ein", "nl": "Voer uw inloggegevens in",
        "ru": "Введите учетные данные", "zh": "输入您的凭据", "ja": "資格情報を入力", "ko": "자격 증명 입력", "tr": "Kimlik bilgilerinizi girin", "pl": "Wprowadź dane logowania",
        "id": "Masukkan kredensial Anda", "ar": "أدخل بيانات الاعتماد", "fa": "اطلاعات ورود را وارد کنید", "el": "Εισάγετε τα διαπιστευτήριά σας", "hi": "अपनी साख दर्ज करें", "bn": "আপনার শংসাপত্র লিখুন", "ur": "اپنی سندیں درج کریں"
    },
    "setup.ready_msg": {
        "es": "¿Listo para inicializar el sistema?", "fr": "Prêt à initialiser le système ?", "it": "Pronto per inizializzare il sistema?", "pt": "Pronto para inicializar o sistema?", "de": "Bereit zum Initialisieren?",
        "ru": "Готовы к инициализации?", "zh": "准备好初始化了吗？", "ja": "システムを初期化しますか？", "ko": "시스템을 초기화하시겠습니까?", "nl": "Klaar om te initialiseren?",
        "tr": "Sistemi başlatmaya hazır mısınız?", "pl": "Gotowy do inicjalizacji?", "id": "Siap menginisialisasi sistem?", "ar": "جاهز لتهيئة النظام؟"
    },
    "setup.interface_theme": {
        "es": "Tema de la interfaz", "fr": "Thème de l'interface", "it": "Tema dell'interfaccia", "pt": "Tema da interface", "de": "Oberflächendesign", "nl": "Interfacethema",
        "ru": "Тема интерфейса", "zh": "界面主题", "ja": "インターフェースのテーマ", "ko": "인터페이스 테마", "tr": "Arayüz Teması", "pl": "Motyw interfejsu",
        "id": "Tema Antarmuka", "ar": "موضوع الواجهة", "fa": "تم رابط کاربری", "el": "Θέμα διεπαφής", "hi": "इंटरफ़ेस थीम", "bn": "ইন্টারফেস থিম", "ur": "انٹرفیس تھیم"
    },
    "setup.summary_admin": {
        "es": "Usuario", "fr": "Utilisateur", "it": "Utente", "pt": "Usuário", "de": "Benutzer", "nl": "Gebruiker",
        "ru": "Пользователь", "zh": "用户", "ja": "ユーザー", "ko": "사용자", "tr": "Kullanıcı", "pl": "Użytkownik",
        "id": "Pengguna", "ar": "مستخدم", "fa": "کاربر", "el": "Χρήστης", "hi": "उपयोगकर्ता", "bn": "ব্যবহারকারী", "ur": "صارف"
    },
    "general.back": {
        "es": "Atrás", "fr": "Retour", "it": "Indietro", "pt": "Voltar", "de": "Zurück", "nl": "Terug",
        "ru": "Назад", "zh": "返回", "ja": "戻る", "ko": "뒤로", "tr": "Geri", "pl": "Wstecz",
        "id": "Kembali", "ar": "رجوع", "fa": "برگشت", "el": "Πίσω", "hi": "पीछे", "bn": "ফিরে", "ur": "واپس"
    },
    "general.next": {
        "es": "Siguiente", "fr": "Suivant", "it": "Avanti", "pt": "Próximo", "de": "Weiter", "nl": "Volgende",
        "ru": "Далее", "zh": "下一步", "ja": "次へ", "ko": "다음", "tr": "İleri", "pl": "Dalej",
        "id": "Lanjut", "ar": "التالي", "fa": "بعدی", "el": "Επόμενο", "hi": "अगला", "bn": "পরবর্তী", "ur": "اگلا"
    },
    "settings.system": {
        "es": "Sistema", "fr": "Système", "it": "Sistema", "pt": "Sistema", "de": "System", "nl": "Systeem",
        "ru": "Система", "zh": "系统", "ja": "システム", "ko": "시스템", "tr": "Sistem", "pl": "System",
        "id": "Sistem", "ar": "النظام", "fa": "سیستم", "el": "Σύστημα", "hi": "सिस्टम", "bn": "সিস্টেম", "ur": "سسٹم"
    },
    "general.pinging": {
        "es": "Cargando...", "fr": "Chargement...", "it": "Caricamento...", "pt": "Carregando...", "de": "Laden...", "nl": "Laden...",
        "ru": "Загрузка...", "zh": "加载中...", "ja": "読み込み中...", "ko": "로딩 중...", "tr": "Yükleniyor...", "pl": "Ładowanie...",
        "id": "Memuat...", "ar": "جار التحميل...", "fa": "در حال بارگذاری...", "el": "Φόρτωση...", "hi": "लोड हो रहा है...", "bn": "লোড হচ্ছে...", "ur": "لوڈ ہو رہا ہے..."
    },
    "settings.about": {
        "es": "Info", // Spanish
        "fr": "Info", // French
        "it": "Info", // Italian
        "pt": "Info", // Portuguese
        "de": "Info", // German
        "nl": "Info", // Dutch
        "pl": "Info", // Polish
        "ru": "Инфо", // Russian
        "zh": "信息", // Chinese
        "ja": "情報", // Japanese
        "ko": "정보", // Korean
        "tr": "Bilgi", // Turkish
        "id": "Info", // Indonesian
        "ar": "معلومات", // Arabic
        "fa": "اطلاعات", // Persian
        "el": "Πληροφορίες", // Greek
        "hi": "जानकारी", // Hindi
        "bn": "তথ্য", // Bengali
        "ur": "معلومات" // Urdu
    },
    "settings.fluid_grid_architecture": {
        "es": "Arquitectura de Rejilla Fluida",
        "fr": "Architecture de Grille Fluide",
        "de": "Flüssige Rasterarchitektur",
        "it": "Architettura a Griglia Fluida",
        "pt": "Arquitetura de Grade Fluida",
        "nl": "Vloeibare Rasterarchitectuur",
        "ru": "Архитектура Изменяемой Сетки",
        "zh": "流式网格架构",
        "ja": "流動グリッドアーキテクチャ",
        "ko": "유동 그리드 아키텍처",
        "tr": "Akışkan Izgara Mimarisi",
        "pl": "Architektura Płynnej Siatki",
        "id": "Arsitektur Grid Cair",
        "ar": "بنية الشبكة السائلة",
        "fa": "معماری شبکه سیال",
        "el": "Αρχιτεκτονική Ρευστού Πλέγματος",
        "hi": "तरल ग्रिड वास्तुकला",
        "bn": "তরল গ্রিড স্থাপত্য",
        "ur": "سیال گرڈ فن تعمیر"
    },
    "settings.grid_columns": {
        "es": "Número de Columnas", "fr": "Nombre de colonnes", "de": "Spaltenanzahl", "it": "Numero di colonne", "pt": "Número de Colunas", "nl": "Aantal kolommen",
        "ru": "Количество столбцов", "zh": "列数", "ja": "列数", "ko": "열 수", "tr": "Sütun Sayısı", "pl": "Liczba kolumn",
        "id": "Jumlah Kolom", "ar": "عدد الأعمدة", "fa": "تعداد ستون‌ها", "el": "Αριθμός Στηλών", "hi": "Column Count", "bn": "Column Count", "ur": "Column Count"
    },
    "settings.density_desc": {
        "es": "Ajusta el número de columnas para controlar la densidad.",
        "fr": "Adjust the number of columns to control the density of your dashboard.",
        "de": "Adjust the number of columns to control the density of your dashboard.",
        "it": "Adjust the number of columns to control the density of your dashboard.",
        "pt": "Adjust the number of columns to control the density of your dashboard.",
        "nl": "Adjust the number of columns to control the density of your dashboard.",
        "ru": "Adjust the number of columns to control the density of your dashboard.",
        "zh": "Adjust the number of columns to control the density of your dashboard.",
        "ja": "Adjust the number of columns to control the density of your dashboard.",
        "ko": "Adjust the number of columns to control the density of your dashboard.",
        "tr": "Adjust the number of columns to control the density of your dashboard.",
        "pl": "Adjust the number of columns to control the density of your dashboard.",
        "id": "Adjust the number of columns to control the density of your dashboard.",
        "ar": "Adjust the number of columns to control the density of your dashboard.",
        "fa": "Adjust the number of columns to control the density of your dashboard.",
        "el": "Adjust the number of columns to control the density of your dashboard.",
        "hi": "Adjust the number of columns to control the density of your dashboard.",
        "bn": "Adjust the number of columns to control the density of your dashboard.",
        "ur": "Adjust the number of columns to control the density of your dashboard."
    },

    // --- Existing & Notepad Tools ---
    "widget.notepad.placeholder": {
        "es": "Empieza a escribir...", "fr": "Commencez à écrire...", "it": "Inizia a scrivere...", "pt": "Comece a escrever...", "de": "Schreiben Sie hier...",
        "ru": "Начните писать...", "zh": "开始输入...", "ja": "入力を開始...", "ko": "쓰기 시작...", "nl": "Begin met schrijven...", "pl": "Zacznij pisać...",
        "tr": "Yazmaya başla...", "id": "Mulai menulis...", "ar": "ابدأ الكتابة...", "fa": "شروع به نوشتن...", "el": "Ξεκινήστε να γράφετε...", "hi": "लिखना शुरू करें...",
        "bn": "লেখা শুরু করুন...", "ur": "لکھنا شروع کریں..."
    },
    "widget.notepad.tool.undo": {
        "es": "Deshacer", "fr": "Annuler", "it": "Annulla", "pt": "Desfazer", "de": "Rückgängig", "ru": "Отменить", "zh": "撤销", "ja": "元に戻す",
        "ko": "실행 취소", "nl": "Ongedaan maken", "pl": "Cofnij", "tr": "Geri Al", "id": "Urungkan", "ar": "تراجع", "fa": "بازگردانی",
        "el": "Αναίρεση", "hi": "पूर्ववत करें", "bn": "পূর্বাবস্থায় ফেরান", "ur": "واپس کریں"
    },
    "widget.notepad.tool.redo": {
        "es": "Rehacer", "fr": "Rétablir", "it": "Ripeti", "pt": "Refazer", "de": "Wiederholen", "ru": "Повторить", "zh": "重做", "ja": "やり直し",
        "ko": "다시 실행", "nl": "Opnieuw", "pl": "Ponów", "tr": "Yinele", "id": "Ulangi", "ar": "إعادة", "fa": "بازخوانی",
        "el": "Επανάληψη", "hi": "फिर से करें", "bn": "পুনরায় করুন", "ur": "دوبارہ کریں"
    },
    "widget.notepad.tool.save": {
        "es": "Guardar", "fr": "Enregistrer", "it": "Salva", "pt": "Salvar", "de": "Speichern", "ru": "Сохранить", "zh": "保存", "ja": "保存",
        "ko": "저장", "nl": "Opslaan", "pl": "Zapisz", "tr": "Kaydet", "id": "Simpan", "ar": "حفظ", "fa": "ذخیره",
        "el": "Αποθήκευση", "hi": "सहेजें", "bn": "সংরক্ষণ করুন", "ur": "محفوظ کریں"
    },
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
    "widget.notepad.tool.bold": {
        "es": "Negrita", "fr": "Gras", "it": "Grassetto", "pt": "Negrito", "de": "Fett", "nl": "Vet",
        "ru": "Жирный", "zh": "粗体", "ja": "太字", "ko": "굵게", "tr": "Kalın", "pl": "Pogrubienie",
        "id": "Tebal", "ar": "غامق", "fa": "پررنگ", "el": "Έντονα", "hi": "मोटा", "bn": "বোল্ড", "ur": "موٹا"
    },
    "widget.notepad.tool.italic": {
        "es": "Cursiva", "fr": "Italique", "it": "Corsivo", "pt": "Itálico", "de": "Kursiv", "nl": "Cursief",
        "ru": "Курсив", "zh": "斜体", "ja": "斜体", "ko": "기울임꼴", "tr": "İtalik", "pl": "Kursywa",
        "id": "Miring", "ar": "مائل", "fa": "ایرانیک", "el": "Πλάγια", "hi": "इटैलिक", "bn": "ইটালিক", "ur": "ترچھا"
    },
    "widget.notepad.tool.color": {
        "es": "Color", "fr": "Couleur", "it": "Colore", "pt": "Cor", "de": "Farbe", "nl": "Kleur",
        "ru": "Цвет", "zh": "颜色", "ja": "色", "ko": "색상", "tr": "Renk", "pl": "Kolor",
        "id": "Warna", "ar": "لون", "fa": "رنگ", "el": "Χρώμα", "hi": "रंग", "bn": "রঙ", "ur": "رنگ"
    },
    "widget.notepad.tool.align_left": {
        "es": "Izquierda", "fr": "Gauche", "it": "Sinistra", "pt": "Esquerda", "de": "Links", "nl": "Links",
        "ru": "Влево", "zh": "左对齐", "ja": "左", "ko": "왼쪽", "tr": "Sol", "pl": "Lewo",
        "id": "Kiri", "ar": "يسار", "fa": "چپ", "el": "Αριστερά", "hi": "बायां", "bn": "বাম", "ur": "بائیں"
    },
    "widget.notepad.tool.align_center": {
        "es": "Centro", "fr": "Centre", "it": "Centro", "pt": "Centro", "de": "Mitte", "nl": "Midden",
        "ru": "Центр", "zh": "居中", "ja": "中央", "ko": "가운데", "tr": "Orta", "pl": "Środek",
        "id": "Tengah", "ar": "وسط", "fa": "وسط", "el": "Κέντρο", "hi": "केंद्र", "bn": "কেন্দ্র", "ur": "درمیان"
    },
    "widget.notepad.tool.align_right": {
        "es": "Derecha", "fr": "Droite", "it": "Destra", "pt": "Direita", "de": "Rechts", "nl": "Rechts",
        "ru": "Вправо", "zh": "右对齐", "ja": "右", "ko": "오른쪽", "tr": "Sağ", "pl": "Prawo",
        "id": "Kanan", "ar": "يمين", "fa": "راست", "el": "Δεξιά", "hi": "दायां", "bn": "ডান", "ur": "دائیں"
    },
    "widget.notepad.tool.checklist": {
        "es": "Lista Tareas", "fr": "Check-list", "it": "Checklist", "pt": "Checklist", "de": "Checkliste", "nl": "Checklist",
        "ru": "Чек-лист", "zh": "清单", "ja": "チェックリスト", "ko": "체크리스트", "tr": "Kontrol Listesi", "pl": "Lista kontrolna",
        "id": "Daftar Periksa", "ar": "قائمة مهام", "fa": "لیست کارها", "el": "Λίστα ελέγχου", "hi": "चेकलिस्ट", "bn": "চেকলিস্ট", "ur": "چیک لسٹ"
    },
    "widget.notepad.tool.list_bullet": {
        "es": "Viñetas", "fr": "Puces", "it": "Elenco puntato", "pt": "Marcadores", "de": "Aufzählung", "nl": "Opsomming",
        "ru": "Маркеры", "zh": "项目符号", "ja": "箇条書き", "ko": "글머리 기호", "tr": "Madde İşaretleri", "pl": "Punktory",
        "id": "Poin", "ar": "نقاط", "fa": "نشانه‌ها", "el": "Κουκκίδες", "hi": "बुलेट्स", "bn": "বুলেট", "ur": "نقات"
    },
    "widget.notepad.tool.list_ordered": {
        "es": "Numeración", "fr": "Numérotation", "it": "Numerazione", "pt": "Numeração", "de": "Nummerierung", "nl": "Nummering",
        "ru": "Нумерация", "zh": "编号", "ja": "番号付け", "ko": "번호 매기기", "tr": "Numaralandırma", "pl": "Numeracja",
        "id": "Penomoran", "ar": "ترقيم", "fa": "شماره‌گذاری", "el": "Αρίθμηση", "hi": "क्रमांकन", "bn": "নম্বারিং", "ur": "نمبرنگ"
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
        "es": "Limpiar", "fr": "Effacer", "it": "Pulisci", "pt": "Limpar", "de": "Löschen", "nl": "Wissen",
        "ru": "Очистить", "zh": "清除", "ja": "クリア", "ko": "지우기", "tr": "Temizle", "pl": "Wyczyść",
        "id": "Hapus", "ar": "مسح", "fa": "پاک کردن", "el": "Καθαρισμός", "hi": "साफ़ करें", "bn": "পরিষ্কার", "ur": "صاف کریں"
    },

    // --- Prompts & Errors ---
    "widget.notepad.prompt.url": {
        "es": "URL:", "fr": "URL:", "it": "URL:", "pt": "URL:", "de": "URL:", "nl": "URL:",
        "ru": "URL:", "zh": "URL:", "ja": "URL:", "ko": "URL:", "tr": "URL:", "pl": "URL:",
        "id": "URL:", "ar": "الرابط:", "fa": "آدرس:", "el": "URL:", "hi": "URL:", "bn": "URL:", "ur": "URL:"
    },
    "widget.notepad.prompt.image_url": {
        "es": "URL de imagen:", "fr": "URL de l'image:", "it": "URL immagine:", "pt": "URL da imagem:", "de": "Bild-URL:", "nl": "Afbeeldings-URL:",
        "ru": "URL изображения:", "zh": "图片 URL:", "ja": "画像 URL:", "ko": "이미지 URL:", "tr": "Resim URL'si:", "pl": "Adres URL obrazu:",
        "id": "URL Gambar:", "ar": "رابط الصورة:", "fa": "آدرس تصویر:", "el": "URL Εικόνας:", "hi": "छवि URL:", "bn": "ছবির URL:", "ur": "تصویر کا یو آر ایل:"
    },
    "widget.notepad.prompt.new_item": {
        "es": "Nuevo ítem", "fr": "Nouvel élément", "it": "Nuovo elemento", "pt": "Novo item", "de": "Neues Element", "nl": "Nieuw item",
        "ru": "Новый элемент", "zh": "新项目", "ja": "新しいアイテム", "ko": "새 항목", "tr": "Yeni Öğe", "pl": "Nowy element",
        "id": "Item baru", "ar": "عنصر جديد", "fa": "مورد جدید", "el": "Νέο αντικείμενο", "hi": "नई वस्तु", "bn": "নতুন আইটেম", "ur": "نیا آئٹم"
    },
    "widget.notepad.prompt.code_block": {
        "es": "Bloque de código", "fr": "Bloc de code", "it": "Blocco di codice", "pt": "Bloco de código", "de": "Codeblock", "nl": "Codeblok",
        "ru": "Блок кода", "zh": "代码块", "ja": "コードブロック", "ko": "코드 블록", "tr": "Kod Bloğu", "pl": "Blok kodu",
        "id": "Blok kode", "ar": "كتلة كود", "fa": "بلوک کد", "el": "Μπλοκ κώδικα", "hi": "कोड ब्लॉक", "bn": "কোড ব্লক", "ur": "کوڈ بلاک"
    },
    "widget.notepad.error.save": {
        "es": "Error al guardar: ", "fr": "Échec de l'enregistrement: ", "it": "Errore salvataggio: ", "pt": "Erro ao salvar: ", "de": "Fehler beim Speichern: ", "nl": "Opslaan mislukt: ",
        "ru": "Ошибка сохранения: ", "zh": "保存失败: ", "ja": "保存失敗: ", "ko": "저장 실패: ", "tr": "Kaydetme Başarısız: ", "pl": "Błąd zapisu: ",
        "id": "Gagal menyimpan: ", "ar": "فشل الحفظ: ", "fa": "خطا در ذخیره: ", "el": "Αποτυχία αποθήκευσης: ", "hi": "सहेजने में विफल: ", "bn": "সংরক্ষণ ব্যর্থ: ", "ur": "محفوظ ناکام: "
    },
    "widget.notepad.tool.scroll_hint": {
        "es": "Desplaza horizontalmente con la rueda del ratón para ver más herramientas",
        "fr": "Faites défiler horizontalement avec la molette de la souris pour voir plus d'outils",
        "it": "Scorri orizzontalmente con la rotellina del mouse per vedere altri strumenti",
        "pt": "Role horizontalmente com a roda do mouse para ver mais ferramentas",
        "de": "Horizontal mit dem Mausrad scrollen, um mehr Werkzeuge zu sehen",
        "ru": "Прокрутите горизонтально колесом мыши, чтобы увидеть больше инструментов",
        "zh": "使用鼠标滚轮水平滚动以查看更多工具",
        "ja": "マウスホイールで水平にスクロールして、その他のツールを表示します",
        "ko": "더 많은 도구를 보려면 마우스 휠로 가로로 스크롤하세요",
        "nl": "Scroll horizontaal met het muiswiel om meer gereedschappen te zien",
        "ar": "قم بالتمرير أفقيًا باستخدام عجلة الماوس لرؤية المزيد من الأدوات",
        "tr": "Daha fazla araç görmek için fare tekerleği ile yatay olarak kaydırın",
        "id": "Gulir secara horizontal dengan roda mouse untuk melihat alat lainnya",
        "pl": "Przewiń poziomo kółkiem myszy, aby zobaczyć więcej narzędzi",
        "hi": "अधिक उपकरण देखने के लिए माउस व्हील के साथ क्षैतिज रूप से स्क्रॉल करें",
        "bn": "আরও সরঞ্জাম দেখতে মাউস হুইল দিয়ে অনুভূমিকভাবে স্ক্রোল করুন",
        "ur": "مزید ٹولز دیکھنے کے لیے ماؤس وہیل کے ساتھ افقی طور پر اسکرول کریں",
        "fa": "برای دیدن ابزارهای بیشتر با چرخ ماوس به صورت افقی اسکرول کنید",
        "el": "Κυλήστε οριζόντια με τον τροχό του ποντικιού για να δείτε περισσότερα εργαλεία"
    },

    // --- Widgets ---
    "widget.clock.name": {
        "es": "Reloj", "fr": "Horloge", "it": "Orologio", "pt": "Relógio", "de": "Uhr", "nl": "Klok",
        "ru": "Часы", "zh": "时钟", "ja": "時計", "ko": "시계", "tr": "Saat", "pl": "Zegar",
        "id": "Jam", "ar": "ساعة", "fa": "ساعت", "el": "Ρολόι", "hi": "घड़ी", "bn": "ঘড়ি", "ur": "گھڑی"
    },
    "widget.clock.description": {
        "es": "Reloj digital con fecha", "fr": "Horloge numérique avec date", "it": "Orologio digitale con data", "pt": "Relógio digital com data", "de": "Digitaluhr mit Datum", "nl": "Digitale klok met datum",
        "ru": "Цифровые часы с датой", "zh": "带日期的数字时钟", "ja": "日付付きデジタル時計", "ko": "날짜가 있는 디지털 시계", "tr": "Tarihli dijital saat", "pl": "Zegar cyfrowy z datą",
        "id": "Jam digital dengan tanggal", "ar": "ساعة رقمية مع التاريخ", "fa": "ساعت دیجیتال با تاریخ", "el": "Ψηφιακό ρολόι με ημερομηνία", "hi": "तारीख के साथ डिजिटल घड़ी", "bn": "তারিখ সহ ডিজিটাল ঘড়ি", "ur": "تاریخ کے ساتھ ڈیजीٹل گھڑی"
    },
    "widget.notepad.name": {
        "es": "Notas", "fr": "Notes", "it": "Note", "pt": "Notas", "de": "Notizen", "nl": "Notities",
        "ru": "Заметки", "zh": "便签", "ja": "メモ", "ko": "메모", "tr": "Notlar", "pl": "Notatki",
        "id": "Catatan", "ar": "ملاحظات", "fa": "یادداشت‌ها", "el": "Σημειώσεις", "hi": "नोट्स", "bn": "নোট", "ur": "نوٹس"
    },
    "widget.notepad.description": {
        "es": "Notas adhesivas simples", "fr": "Notes adhésives simples", "it": "Semplici note adesive", "pt": "Notas adesivas simples", "de": "Einfache Haftnotizen", "nl": "Eenvoudige notities",
        "ru": "Простые заметки", "zh": "简单的便签", "ja": "シンプルな付箋", "ko": "간단한 스티커 메모", "tr": "Basit yapışkan notlar", "pl": "Proste notatki",
        "id": "Catatan tempel sederhana", "ar": "ملاحظات لاصقة بسيطة", "fa": "یادداشت‌های چسبان ساده", "el": "Απλές σημειώσεις", "hi": "सरल चिपचिपा नोट्स", "bn": "সহজ স্টিকি নোট", "ur": "سادہ اسٹکی نوٹس"
    },
    "widget.telemetry.name": {
        "es": "Sistema", "fr": "Système", "it": "Sistema", "pt": "Sistema", "de": "System", "nl": "Systeem",
        "ru": "Система", "zh": "系统", "ja": "システム", "ko": "시스템", "tr": "Sistem", "pl": "System",
        "id": "Sistem", "ar": "النظام", "fa": "سیستم", "el": "Σύστημα", "hi": "प्रणाली", "bn": "সিস্টেম", "ur": "نظام"
    },
    "widget.telemetry.description": {
        "es": "CPU, RAM y Temp", "fr": "CPU, RAM et Temp", "it": "CPU, RAM e Temp", "pt": "CPU, RAM e Temp", "de": "CPU, RAM und Temp", "nl": "CPU, RAM en Temp",
        "ru": "CPU, RAM и Темп", "zh": "CPU, 内存和温度", "ja": "CPU, RAM, 温度", "ko": "CPU, RAM 및 온도", "tr": "CPU, RAM ve Sıcaklık", "pl": "CPU, RAM i Temp",
        "id": "CPU, RAM, dan Suhu", "ar": "المعالج والذاكرة والحرارة", "fa": "پردازنده، حافظه و دما", "el": "CPU, RAM και Θερμ", "hi": "सीपीयू, रैम और तापमान", "bn": "CPU, RAM এবং তাপমাত্রা", "ur": "سی پی یو، ریم اور درجہ حرارت"
    },
    // --- Reset ---
    "settings.restoring": {
        "es": "Restaurando...", "fr": "Restauration...", "it": "Ripristino...", "pt": "Restaurando...", "de": "Wiederherstellung...", "nl": "Herstellen...",
        "ru": "Восстановление...", "zh": "正在恢复...", "ja": "復元中...", "ko": "복원 중...", "tr": "Geri yükleniyor...", "pl": "Przywracanie...",
        "id": "Memulihkan...", "ar": "استعادة...", "fa": "بازیابی...", "el": "Επαναφορά...", "hi": "पुनर्स्थापना...", "bn": "পুনরুদ্ধার করা হচ্ছে...", "ur": "بحال کیا جا رہا ہے..."
    },
    "type.widget": {
        "es": "Widget", "fr": "Widget", "it": "Widget", "pt": "Widget", "de": "Widget", "nl": "Widget",
        "ru": "Виджет", "zh": "小部件", "ja": "ウィジェット", "ko": "위젯", "tr": "Bileşen", "pl": "Widget",
        "id": "Widget", "ar": "أداة", "fa": "ویجت", "el": "Widget", "hi": "विजेट", "bn": "উইজেট", "ur": "ویجیٹ"
    },
    // --- New Notifications ---
    "notifier.please_wait": {
        "es": "Por favor espere mientras el sistema se restablece...", "fr": "Veuillez patienter pendant la réinitialisation...", "it": "Attendere prego mientras el sistema si ripristina...", "pt": "Aguarde enquanto o sistema é redefinido...", "de": "Bitte warten, während das System zurückgesetzt wird...",
        "ru": "Пожалуйста, подождите, пока система сбрасывается...", "zh": "请稍候，系统正在重置...", "ja": "システムがリセットされるまでお待ちください...", "ko": "시스템이 초기화되는 동안 잠시 기다려 주십시오...", "nl": "Een ogenblik geduld terwijl het systeem reset...",
        "tr": "Sistem sıfırlanırken lütfen bekleyin...", "pl": "Proszę czekać, trwa resetowanie systemu...", "id": "Harap tunggu saat sistem diatur ulang...", "ar": "يرجى الانتظار بينما يتم إعادة تعيين النظام...",
        "fa": "لطفاً صبر کنید تا سیستم بازنشانی شود...", "el": "Παρακαλώ περιμένετε ενώ το σύστημα επαναφέρεται...", "hi": "कृपया प्रतीक्षा करें जब तक सिस्टम रीसेट हो रहा है...", "bn": "সিস্টেম রিসেট করার সময় অনুগ্রহ করে অপেক্ষা করুন...", "ur": "براہ کرم انتظار کریں جبکہ سسٹم ری سیٹ ہو رہا ہے..."
    },
    "section.placeholder_title": {
        "es": "Título de la Sección", "fr": "Titre de la section", "it": "Titolo della sezione", "pt": "Título da seção", "de": "Abschnittstitel", "nl": "Sectietitel",
        "ru": "Название раздела", "zh": "部分标题", "ja": "セクションのタイトル", "ko": "섹션 제목", "tr": "Bölüm Başlığı", "pl": "Tytuł sekcji", "id": "Judul Bagian",
        "ar": "عنوان القسم", "fa": "عنوان بخش", "el": "Τίτλος ενότητας", "hi": "अनुभाग शीर्षक", "bn": "বিভাগের শিরোনাম", "ur": "سیکشن کا عنوان"
    },
    "setup.error_password": {
        "es": "Contraseña demasiado corta (mín. 4 caracteres)", "fr": "Mot de passe trop court (min 4 caractères)", "it": "Password troppo corta (min 4 caratteri)", "pt": "Senha muito curta (mín 4 caracteres)", "de": "Passwort zu kurz (min. 4 Zeichen)",
        "ru": "Пароль слишком короткий (мин. 4 символа)", "zh": "密码太短（至少 4 个字符）", "ja": "パスワードが短すぎます（最低4文字）", "ko": "비밀번호가 너무 짧습니다 (최소 4자)", "nl": "Wachtwoord te kort (min 4 tekens)",
        "tr": "Şifre çok kısa (min 4 karakter)", "pl": "Hasło za krótkie (min 4 znaki)", "id": "Kata sandi terlalu pendek (min 4 karakter)", "ar": "كلمة المرور قصيرة جدًا (4 أحرف كحد أدنى)",
        "fa": "رمز عبور خیلی کوتاه است (حداقل 4 کاراکتر)", "el": "Ο κωδικός είναι πολύ μικρός (τουλάχιστον 4 χαρακτήρες)", "hi": "पासवर्ड बहुत छोटा है (न्यूनतम 4 वर्ण)", "bn": "পাসওয়ার্ড খুব ছোট (ন্যূনতম ৪ অক্ষর)", "ur": "پاس ورڈ بہت مختصر ہے (کم از کم 4 حروف)"
    },
    "setup.error_connection": {
        "es": "Falló la conexión. Revise los registros.", "fr": "La connexion a échoué. Vérifiez les journaux.", "it": "Connessione fallita. Controlla i registri.", "pt": "Falha na conexão. Verifique os logs.", "de": "Verbindung fehlgeschlagen. Protokolle prüfen.",
        "ru": "Ошибка подключения. Проверьте журналы.", "zh": "连接失败。请检查日志。", "ja": "接続に失敗しました。ログを確認してください。", "ko": "연결 실패. 로그를 확인하세요.", "nl": "Verbinding mislukt. Controleer logboeken.",
        "tr": "Bağlantı başarısız. Günlükleri kontrol edin.", "pl": "Połączenie nie powiodło się. Sprawdź logi.", "id": "Koneksi gagal. Periksa log.", "ar": "فشل الاتصال. تحقق من السجلات.",
        "fa": "اتصال ناموفق بود. لاگ‌ها را بررسی کنید.", "el": "Η σύνδεση απέτυχε. Ελέγξτε τα αρχεία καταγραφής.", "hi": "कनेक्शन विफल। लॉग की जाँच करें।", "bn": "সংযোগ ব্যর্থ হয়েছে। লগ চেক করুন।", "ur": "کنکشن ناکام ہوگیا۔ لاگز چیک کریں۔"
    },
    "notifier.username_required": {
        "es": "Usuario requerido", "fr": "Nom d'utilisateur requis", "it": "Nome utente richiesto", "pt": "Nome de usuário obrigatório", "de": "Benutzername erforderlich",
        "ru": "Требуется имя пользователя", "zh": "需要用户名", "ja": "ユーザー名が必要です", "ko": "사용자 이름이 필요합니다", "nl": "Gebruikersnaam vereist",
        "tr": "Kullanıcı adı gerekli", "pl": "Wymagana nazwa użytkownika", "id": "Nama pengguna diperlukan", "ar": "اسم المستخدم مطلوب",
        "fa": "نام کاربری الزامی است", "el": "Απαιτείται όνομα χρήστη", "hi": "उपयोगकर्ता नाम आवश्यक", "bn": "ব্যবহারকারীর নাম প্রয়োজন", "ur": "صارف نام درکار ہے"
    },
    // --- New keys for Audit ---
    "settings.type_delete_placeholder": {
        "es": "Escribe 'delete'", "fr": "Tapez 'delete'", "it": "Scrivi 'delete'", "pt": "Digite 'delete'", "de": "Tippen Sie 'delete'",
        "ru": "Введите 'delete'", "zh": "输入 'delete'", "ja": " 'delete' と入力", "ko": " 'delete' 입력", "nl": "Typ 'delete'",
        "tr": "'delete' yazın", "pl": "Wpisz 'delete'", "id": "Ketik 'delete'", "ar": "اكتب 'delete'", "fa": "تایپ کنید 'delete'",
        "el": "Πληκτρολογήστε 'delete'", "hi": "'delete' टाइप करें", "bn": "'delete' লিখুন", "ur": "'delete' لکھیں"
    },
    "settings.new_version_notif": {
        "es": "¡Nueva versión disponible!", "fr": "Nouvelle version disponible !", "it": "Nuova versione disponibile!", "pt": "Nova versão disponible!", "de": "Neue Version verfügbar!",
        "ru": "Доступна новая версия!", "zh": "新版本可用！", "ja": "新バージョンが利用可能です！", "ko": "새 버전을 사용할 수 있습니다!", "nl": "Nieuwe versie beschikbaar!",
        "tr": "Yeni versiyon mevcut!", "pl": "Dostępna nowa wersja!", "id": "Versi baru tersedia!", "ar": "نسخة جديدة متاحة!", "fa": "نسخه جدید در دسترس است!",
        "el": "Νέα έκδοση διαθέσιμη!", "hi": "नया संस्करण उपलब्ध है!", "bn": "নতুন সংস্করণ উপলব্ধ!", "ur": "نیا ورژن دستیاب ہے!"
    },
    "settings.up_to_date_docker_msg": {
        "es": "Estás estrictamente al día.", "fr": "Vous êtes strictement à jour.", "it": "Sei rigorosamente actualizado.", "pt": "Você está rigorosamente atualizado.", "de": "Sie sind auf dem neuesten Stand.",
        "ru": "Вы полностью обновлены.", "zh": "您已是最新版本。", "ja": "最新の状態です。", "ko": "최신 상태입니다.", "nl": "Je bent helemaal bijgewerkt.",
        "tr": "Tamamen güncelsiniz.", "pl": "System jest aktualny.", "id": "Anda sudah mutakhir.", "ar": "أنت محدث تمامًا.", "fa": "شما کاملاً بروز هستید.",
        "el": "Είστε πλήρως ενημερωμένοι.", "hi": "आप पूरी तरह से अपडेट हैं।", "bn": "আপনি সম্পূর্ণ আপ-টু-ডেট।", "ur": "آپ مکمل طور پر اپ ٹو ڈیٹ ہیں۔"
    },
    "general.changelog": {
        "es": "Registro de cambios", "fr": "Journal des modifications", "it": "Registro delle modifiche", "pt": "Registro de alterações", "de": "Änderungsprotokoll",
        "ru": "Список изменений", "zh": "变更日志", "ja": "変更履歴", "ko": "변경 로그", "nl": "Wijzigingslogboek",
        "tr": "Değişiklik Günlüğü", "pl": "Lista zmian", "id": "Catatan perubahan", "ar": "سجل التغييرات", "fa": "تغییرات اخیر",
        "el": "Αρχείο αλλαγών", "hi": "परिवर्तन लॉग", "bn": "পরিবর্তন লগ", "ur": "تبدیلی لاگ"
    },
    "notifier.user_delete_superadmin": {
        "es": "No se puede eliminar al Super Administrador", "fr": "L'administrateur principal ne peut pas être supprimé", "it": "L'amministratore principale non può essere eliminato", "pt": "O Super Administrador não pode ser excluído", "de": "Der Super-Administrator kann nicht gelöscht werden",
        "ru": "Супер администратор не может быть удален", "zh": "超级管理员无法删除", "ja": "スーパー管理者は削除できません", "ko": "최고 관리자는 삭제할 수 없습니다", "nl": "De superbeheerder kan niet worden verwijderd",
        "tr": "Süper Yönetici silinemez", "pl": "Nie można usunąć Super Administratora", "id": "Super Administrator tidak dapat dihapus", "ar": "لا يمكن حذف المسؤول العام", "fa": "سوپر ادمین قابل حذف نیست",
        "el": "Δεν είναι δυνατή η διαγραφή του Super Administrator", "hi": "सुपर एडमिनिस्ट्रेटर को हटाया नहीं जा सकता", "bn": "সুপার অ্যাডমিনিস্ট্রেটর মুছে ফেলা যাবে না", "ur": "سپر ایڈمنسٹریٹر کو حذف نہیں کیا جا सकता"
    },
    "settings.role_super_admin": {
        "es": "Super Admin", "fr": "Super Admin", "it": "Super Admin", "pt": "Super Admin", "de": "Super-Admin",
        "ru": "Супер-Админ", "zh": "超级管理员", "ja": "スーパー管理者", "ko": "최고 관리자", "nl": "Super-Admin",
        "tr": "Süper Yönetici", "pl": "Super Admin", "id": "Super Admin", "ar": "مسؤول عام", "fa": "سوپر ادمین",
        "el": "Super Admin", "hi": "सुपर एडमिन", "bn": "সুপার অ্যাডমিন", "ur": "سپر ایڈمن"
    },
    // --- New System & Error Keys ---
    "general.db_error": {
        "es": "Error de base de datos", "fr": "Erreur de base de données", "de": "Datenbankfehler", "it": "Errore del database",
        "pt": "Erro na base de dados", "ru": "Ошибка базы данных", "zh": "数据库错误", "ja": "データベースエラー",
        "ko": "데이터베이스 오류", "nl": "Databasefout", "pl": "Błąd bazy danych", "tr": "Veritabanı hatası",
        "id": "Kesalahan basis data", "ar": "خطأ في قاعدة البيانات", "fa": "خطای پایگاه داده", "el": "Σφάλμα βάσης δεδομένων",
        "hi": "डेटाबेस त्रुटि", "bn": "ডেটাবেस ত্রুটি", "ur": "ڈیٹا بیس کی غلطی"
    },
    "general.internal_error": {
        "es": "Error interno del servidor", "fr": "Erreur interne du serveur", "de": "Interner Serverfehler", "it": "Errore interno del server",
        "pt": "Erro interno do servidor", "ru": "Внутренняя ошибка сервера", "zh": "服务器内部错误", "ja": "サーバー内部エラー",
        "ko": "서버 내부 오류", "nl": "Interne serverfout", "pl": "Wewnętrzny błąd serwera", "tr": "Dahili sunucu hatası",
        "id": "Kesalahan server internal", "ar": "خطأ داخلي في الخادم", "fa": "خطای داخلی سرور", "el": "Εσωτερικό σφάλμα διακομιστή",
        "hi": "आंतरिक सर्वर त्रुटि", "bn": "অভ্যন্তরীণ সার্ভার ত্রুটি", "ur": "اندرونی سرور की غلطی"
    },
    "general.invalid_input": {
        "es": "Entrada no válida", "fr": "Entrée invalide", "de": "Ungültige Eingabe", "it": "Input non valido",
        "pt": "Entrada inválida", "ru": "Недопустимый ввод", "zh": "无效输入", "ja": "無効な入力",
        "ko": "유효하지 않은 입력", "nl": "Ongeldige invoer", "pl": "Nieprawidłowe dane", "tr": "Geçersiz giriş",
        "id": "Input tidak valid", "ar": "مدخلات غير صالحة", "fa": "ورودی نامعتبر", "el": "Μη έγκυρη είσοδος",
        "hi": "अमान्य इनपुट", "bn": "অকার্যকর ইনপুট", "ur": "غلط ان پٹ"
    },
    "auth.too_many_attempts": {
        "es": "Demasiados intentos fallidos, inténtalo de nuevo más tarde", "fr": "Trop de tentatives échouées, réessayez plus tard", "de": "Zu viele fehlgeschlagene Versuche, versuchen Sie es später noch einmal", "it": "Troppi tentativi falliti, riprova più tardi",
        "pt": "Muitas tentativas falhadas, tente novamente mais tarde", "ru": "Слишком много неудачных попыток, попробуйте позже", "zh": "尝试次数过多，请稍后再试", "ja": "試行回数が多すぎます。後で再試行してください",
        "ko": "실패한 시도가 너무 많습니다. 나중에 다시 시도하십시오", "nl": "Te veel mislukte pogingen, probeer het later opnieuw", "pl": "Zbyt wiele nieudanych prób, spróbuj ponownie później", "tr": "Çok fazla başarısız deneme, lütfen daha sonra tekrar deneyin",
        "id": "Terlalu banyak percobaan gagal, coba lagi nanti", "ar": "محاولات فاشلة كثيرة جدًا ، حاول مرة أخرى لاحقًا", "fa": "تلاش‌های ناموفق بیش از حد، لطفاً بعداً دوباره امتحان کنید", "el": "Πολλές αποτυχημένες προσπάθειες, δοκιμάστε ξανά αργότερα",
        "hi": "बहुत अधिक विफल प्रयास, बाद में पुनः प्रयास करें", "bn": "অনেক ব্যর্থ প্রচেষ্টা, পরে আবার চেষ্টা করুন", "ur": "بہت زیادہ ناکام کوششیں، بعد میں دوبارہ کوشش کریں"
    },
    "error.username_min_length": {
        "es": "El usuario debe tener al menos 2 caracteres", "fr": "Le nom d'utilisateur doit contenir au moins 2 caracteres", "de": "Benutzername muss mindestens 2 Zeichen lang sein",
        "ru": "Имя пользователя должно быть не менее 2 символов", "zh": "用户名必须至少包含 2 个字符", "ja": "ユーザー名は2文字以上である必要があります", "ko": "사용자 이름은 2자 이상이어야 합니다", "ar": "يجب أن يتكون اسم المستخدم من حرفين على الأقل"
    },
    "error.password_min_length": {
        "es": "La contraseña debe tener al menos 4 caracteres", "fr": "Le mot de passe doit contenir au moins 4 caracteres", "de": "Passwort muss mindestens 4 Zeichen lang sein",
        "ru": "Пароль должен быть не менее 4 символов", "zh": "密码必须至少包含 4 个字符", "ja": "パスワードは4文字以上である必要があります", "ko": "비밀번호는 4자 이상이어야 합니다", "ar": "يجب أن تتكون كلمة المرور من 4 أحرف على الأقل"
    },
    "setup.already_initialized": {
        "es": "El sistema ya ha sido inicializado", "fr": "Le sistema est déjà initialisé", "de": "System ist bereits initialisiert", "it": "Sistema già inizializzato",
        "pt": "Sistema já inicializado", "ru": "Система уже инициализирована", "zh": "系统已初始化", "ja": "システムはすでに初期化されています",
        "ko": "시스템이 이미 초기화되었습니다", "nl": "Systeem is al geïnitialiseerd", "pl": "System został już zainicjowany", "tr": "Sistem zaten başlatıldı",
        "id": "Sistem sudah diinisialisasi", "ar": "تم تهيئة النظام بالفعل", "fa": "سیستم قبلاً راه اندازی شده است", "el": "Το σύστημα έχει ήδη αρχικοποιηθεί",
        "hi": "सिस्टम पहले से ही आरंभीकृत है", "bn": "सისტেম ইতিমধ্যে शुरू হয়েছে", "ur": "نظام پہلے ہی शुरू हो चुका है"
    },
    "notifier.system_restarting": {
        "es": "El sistema se está reiniciando...", "fr": "Le système redémarre...", "de": "System wird neu gestartet...", "it": "Il sistema si sta riavviando...",
        "pt": "O sistema está a reiniciar...", "ru": "Система перезагружается...", "zh": "系统正在重启...", "ja": "システムを再起動しています...",
        "ko": "시스템을 재시작하는 중입니다...", "ar": "النظام يعيد التشغيل..."
    },
    "error.missing_url": { "es": "Falta la URL", "fr": "URL manquante", "de": "URL fehlt" },
    "error.could_not_resolve_host": { "es": "No se pudo resolver el host", "fr": "Impossible de résoudre l'hôte", "de": "Host konnte nicht aufgelöst werden" },
    "section.hide_title_hint": {
        "es": "Dejar vacío para ocultar el título.", "fr": "Laisser vide pour masquer le titre.", "de": "Leer lassen, um den Titel auszublenden.",
        "it": "Lasciare vuoto per nascondere il titolo.", "pt": "Deixe em blanco para ocultar o título.", "ru": "Оставьте пустым, чтобы скрыть заголовок."
    },
    "widget.no_config": {
        "es": "No hay configuración disponible para este elemento.", "fr": "Aucune configuration disponible pour cet élément.", "de": "Keine Konfiguration für dieses Element verfügbar."
    },
    "widget.config.no_config": {
        "es": "No hay configuración disponible para este elemento.",
        "fr": "Aucune configuration disponible pour cet élément.",
        "de": "Keine Konfiguration für dieses Element verfügbar.",
        "it": "Nessuna configurazione disponibile per questo elemento.",
        "pt": "Nenhuma configuração disponível para este item.",
        "nl": "Geen configuratie beschikbaar voor dit item.",
        "ru": "Конфигурация для этого элемента недоступна.",
        "zh": "此项目没有可用的配置。",
        "ja": "このアイテムには設定がありません。",
        "ko": "이 항목에 대한 구성이 없습니다.",
        "tr": "Bu öğe için yapılandırma yok.",
        "pl": "Brak konfiguracji dla tego elementu.",
        "id": "Tidak ada konfigurasi untuk item ini.",
        "ar": "لا يوجد تكوين متاح لهذا العنصر.",
        "fa": "تنظیماتی برای این مورد وجود ندارد.",
        "el": "Δεν υπάρχει διαθέσιμη διαμόρφωση για αυτό το στοιχείο.",
        "hi": "इस आइटम के लिए कोई कॉन्फ़िगरेशन उपलब्ध नहीं है।",
        "bn": "এই আইটেমের জন্য কোন কনফিগারেশন নেই।",
        "ur": "اس آئٹم کے لیے کوئی ترتیب دستیاب نہیں ہے۔"
    },
    "auth.unauthorized": {
        "es": "No autorizado", "fr": "Accès non autorisé", "de": "Nicht autorisiert", "it": "Non autorizzato",
        "pt": "Não autorizado", "ru": "Не авторизован", "zh": "未授权", "ja": "権限がありません",
        "ko": "권한이 없습니다", "ar": "غير مصرح"
    },
    "notifier.user_deleted": {
        "es": "Usuario eliminado", "fr": "Utilisateur supprimé", "de": "Benutzer gelöscht", "it": "Utente eliminato",
        "pt": "Utilizador eliminado", "ru": "Пользователь удален", "zh": "用户已删除", "ja": "ユーザーを削除しました"
    },
    "notifier.user_delete_error": {
        "es": "Error al eliminar usuario", "fr": "Échec de la suppression de l'utilisateur", "de": "Fehler beim Löschen des Benutzers"
    },
    "notifier.restore_success": {
        "es": "Copia de seguridad restaurada. Recargando...", "fr": "Sauvegarde restaurée. Rechargement...", "de": "Backup wiederhergestellt. Wird neu geladen..."
    },
    "notifier.update_verified": {
        "es": "Actualización verificada. Reiniciando...", "fr": "Mise à jour vérifiée. Redémarrage...", "de": "Update verifiziert. Neustart..."
    },
    "notifier.update_failed": {
        "es": "Error en la actualización", "fr": "Échec de la mise à jour", "de": "Update fehlgeschlagen"
    },
    "notifier.save_error": {
        "es": "Error al guardar los ajustes", "fr": "Échec de l'enregistrement des paramètres", "de": "Fehler beim Speichern der Einstellungen"
    },
    "notifier.profile_updated": {
        "es": "Perfil actualizado", "fr": "Profil mis à jour", "de": "Profil aktualisiert"
    },
    "notifier.profile_error": {
        "es": "Error al actualizar el perfil", "fr": "Échec de la mise à jour du profil", "de": "Fehler beim Aktualisieren des Profils"
    },
    "auth.session_expired": {
        "es": "Sesión expirada o servidor inalcanzable", "fr": "Session expirée ou serveur inalcanzable", "de": "Sitzung abgelaufen oder Server nicht erreichbar"
    }
};

const files = readdirSync(LOCALE_DIR).filter(f => f.endsWith('.json') && f !== 'en.json');

files.forEach(file => {
    const lang = file.replace('.json', '');
    const path = join(LOCALE_DIR, file);
    let content: Record<string, string> = {};

    try { content = JSON.parse(readFileSync(path, 'utf-8')); } catch (e) { }

    let added = 0;
    let updated = 0;

    // cleanup legacy
    if (content['type.group']) {
        delete content['type.group'];
        updated++;
    }

    masterKeys.forEach(key => {
        let newValue = content[key];
        const hasTranslation = COMMON_TRANSLATIONS[key] && COMMON_TRANSLATIONS[key][lang];

        // Always force update if we have a better translation in dictionary and current value matches English (or is missing)
        // OR simply force update for these specific keys to ensure correctness
        if (hasTranslation) {
            const dictValue = COMMON_TRANSLATIONS[key][lang];
            // If missing or different, update it
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
        console.log(`✅ ${lang}: Updated ${updated} keys, Added ${added} keys`);
    } else {
        console.log(`✨ ${lang}: Up to date`);
    }
});
