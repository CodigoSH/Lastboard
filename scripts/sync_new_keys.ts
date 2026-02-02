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
    // --- Auth Updates (New) ---
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
