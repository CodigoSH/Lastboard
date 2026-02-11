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
        "es": "¡Bienvenido de nuevo!", "fr": "Bon retour !", "it": "Bentornato!", "pt": "Bem-vindo de volta!", "de": "Willkommen zurück!", "nl": "Welkom terug!",
        "ru": "С возвращением!", "zh": "欢迎回来！", "ja": "おかえりなさい！", "ko": "다시 오신 것을 환영합니다!", "tr": "Tekrar hoşgeldiniz!", "pl": "Witaj ponownie!",
        "id": "Selamat datang kembali!", "ar": "مرحبًا بعودتك!", "fa": "خوش آمدید!", "el": "Καλώς ήρθατε πάλι!", "hi": "واپسی پر خوش آمدید!", "bn": "স্বাগতম!", "ur": "خوش آمدید!"
    },
    "auth.subtitle": {
        "es": "Encantado de verte otra vez", "fr": "Ravi de vous revoir", "it": "Bello rivederti", "pt": "Bom ver você novamente", "de": "Schön, Sie wiederzusehen", "nl": "Fijn je weer te zien",
        "ru": "Рады видеть вас снова", "zh": "很高兴再次见到您", "ja": "またお会いできて嬉しいです", "ko": "다시 만나서 반갑습니다", "tr": "Sizi tekrar görmek güzel", "pl": "Miło cię znowu widzieć",
        "id": "Senang bertemu Anda lagi", "ar": "سعيد لرؤيتك مرة أخرى", "fa": "از دیدن دوباره شما خوشحالم", "el": "Χαίρομαι που σας βλέπω ξανά", "hi": "आपको फिर से देखकर अच्छा लगा", "bn": "তোমাকে আবার দেখে ভালো লাগলো", "ur": "آپ کو دوبارہ دیکھ کر اچھا لگا"
    },
    "widget.notepad.placeholder": {
        "es": "Anota tus ideas...", "fr": "Notez vos idées...", "it": "Annota le tue idee...", "pt": "Anote suas ideias...", "de": "Notieren Sie Ihre Ideen...",
        "ru": "Запишите свои мысли...", "zh": "记下你的想法...", "ja": "アイデアを書き留める...", "ko": "아이디어를 적어보세요...", "nl": "Schrijf je gedachten op...", "pl": "Zapisz swoje myśli...",
        "tr": "Düşüncelerinizi not edin...", "id": "Catat ide Anda...", "ar": "دني أفكارك...", "fa": "ایده‌های خود را یادداشت کنید...", "el": "Σημειώστε τις ιδέες σας...", "hi": "अपने विचार लिख लें...",
        "bn": "আপনার চিন্তা লিখুন...", "ur": "اپنے خیالات لکھیں..."
    },
    "widget.markdown.placeholder": {
        "es": "Empieza tu historia...", "fr": "Commencez votre histoire...", "it": "Inizia la tua storia...", "pt": "Comece sua história...", "de": "Beginnen Sie Ihre Geschichte...",
        "ru": "Начните свою историю...", "zh": "开始你的故事...", "ja": "物語を始めましょう...", "ko": "이야기를 시작하세요...", "nl": "Begin je verhaal...", "pl": "Zacznij swoją historię...",
        "tr": "Hikayene başla...", "id": "Mulai ceritamu...", "ar": "ابدأ قصتك...", "fa": "داستان خود را شروع کنید...", "el": "Ξεκινήστε την ιστορία σας...", "hi": "अपनी कहानी शुरू करें...",
        "bn": "আপনার গল্প শুরু করুন...", "ur": "اپنی کہانی شروع کریں..."
    },
    "widget.markdown.name": {
        "es": "Markdown", "fr": "Markdown", "it": "Markdown", "pt": "Markdown", "de": "Markdown", "nl": "Markdown",
        "ru": "Markdown", "zh": "Markdown", "ja": "Markdown", "ko": "Markdown", "tr": "Markdown", "pl": "Markdown",
        "id": "Markdown", "ar": "Markdown", "fa": "Markdown", "el": "Markdown", "hi": "Markdown", "bn": "Markdown", "ur": "Markdown"
    },
    "widget.markdown.description": {
        "es": "Editor Markdown con vista previa en vivo", "fr": "Éditeur Markdown avec aperçu en direct", "it": "Editor Markdown con anteprima dal vivo", "pt": "Editor Markdown com visualização ao vivo", "de": "Markdown-Editor mit Live-Vorschau", "nl": "Markdown-editor met live voorbeeld",
        "ru": "Редактор Markdown с предпросмотром", "zh": "Markdown编辑器，带实时预览", "ja": "ライブプレビュー付きMarkdownエディター", "ko": "라이브 미리보기가 있는 Markdown 편집기", "tr": "Canlı önizlemeli Markdown editörü", "pl": "Edytor Markdown z podglądem na żywo",
        "id": "Editor Markdown dengan pratinjau langsung", "ar": "محرر Markdown مع معاينة مباشرة", "fa": "ویرایشگر Markdown با پیش‌نمایش زنده", "el": "Επεξεργαστής Markdown με ζωντανή προεπισκόπηση", "hi": "लाइव पूर्वावलोकन के साथ Markdown संपादक", "bn": "লাইভ প্রিভিউ সহ Markdown সম্পাদক", "ur": "لائیو پیش منظر کے ساتھ Markdown ایڈیٹر"
    },
    "widget.notepad.description": {
        "es": "Notas rápidas con formato enriquecido", "fr": "Notes rapides avec mise en forme enrichie", "it": "Note rapide con formattazione avanzata", "pt": "Notas rápidas com formatação rica", "de": "Schnellnotizen mit Rich-Formatierung", "nl": "Snelle notities met rijke opmaak",
        "ru": "Быстрые заметки с богатым форматированием", "zh": "带丰富格式的快速笔记", "ja": "リッチフォーマット付きクイックノート", "ko": "서식이 풍부한 빠른 메모", "tr": "Zengin biçimlendirmeli hızlı notlar", "pl": "Szybkie notatki z bogatym formatowaniem",
        "id": "Catatan cepat dengan format kaya", "ar": "ملاحظات سريعة مع تنسيق غني", "fa": "یادداشت‌های سریع با قالب‌بندی غنی", "el": "Γρήγορες σημειώσεις με εμπλουτισμένη μορφοποίηση", "hi": "रिच फ़ॉर्मेटिंग के साथ त्वरित नोट्स", "bn": "সমৃদ্ধ বিন্যাস সহ দ্রুত নোট", "ur": "بھرپور فارمیٹنگ کے ساتھ فوری نوٹس"
    },
    "widget.notepad.name": {
        "es": "Notas", "fr": "Notes", "it": "Note", "pt": "Notas", "de": "Notizen", "nl": "Notities",
        "ru": "Заметки", "zh": "便签", "ja": "メモ", "ko": "메모", "tr": "Notlar", "pl": "Notatki",
        "id": "Catatan", "ar": "ملاحظات", "fa": "یادداشت‌ها", "el": "Σημειώσεις", "hi": "नोट्स", "bn": "নোট", "ur": "نوٹس"
    },
    "widget.notepad.tool.undo": {
        "es": "Deshacer", "fr": "Annuler", "it": "Annulla", "pt": "Desfazer", "de": "Rückgängig", "nl": "Ongedaan maken",
        "ru": "Отменить", "zh": "撤销", "ja": "元に戻す", "ko": "실행 취소", "tr": "Geri Al", "pl": "Cofnij",
        "id": "Urungkan", "ar": "تراجع", "fa": "بازگشت", "el": "Αναίρεση", "hi": "पूर्ववत करें", "bn": "পূর্বাবস্থায় ফেরান", "ur": "واپس کریں"
    },
    "widget.notepad.tool.redo": {
        "es": "Rehacer", "fr": "Rétablir", "it": "Ripeti", "pt": "Refazer", "de": "Wiederholen", "nl": "Opnieuw",
        "ru": "Повторить", "zh": "重做", "ja": "やり直し", "ko": "다시 실행", "tr": "Yinele", "pl": "Ponów",
        "id": "Ulangi", "ar": "إعادة", "fa": "بازخوانی", "el": "Επανάληψη", "hi": "फिर से करें", "bn": "পুনরায় করুন", "ur": "دوبارہ کریں"
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
    "widget.notepad.tool.h3": {
        "es": "Encabezado 3", "fr": "Titre 3", "it": "Intestazione 3", "pt": "Título 3", "de": "Überschrift 3", "nl": "Kop 3",
        "ru": "Заголовок 3", "zh": "标题 3", "ja": "見出し 3", "ko": "제목 3", "tr": "Başlık 3", "pl": "Nagłówek 3",
        "id": "Judul 3", "ar": "عنوان 3", "fa": "عنوان 3", "el": "Επικεφαλίδα 3", "hi": "शीर्षक 3", "bn": "শিরোনাম ৩", "ur": "سرخی 3"
    },
    "widget.notepad.tool.bold": {
        "es": "Negrita", "fr": "Gras", "it": "Grassetto", "pt": "Negrito", "de": "Fett", "nl": "Vet",
        "ru": "Жирный", "zh": "粗体", "ja": "太字", "ko": "굵게", "tr": "Kalın", "pl": "Pogrubienie",
        "id": "Tebal", "ar": "غامق", "fa": "پررنگ", "el": "Έντονα", "hi": "मोटा", "bn": "বোল্ড", "ur": "موٹا"
    },
    "widget.notepad.tool.italic": {
        "es": "Cursiva", "fr": "Italique", "it": "Corsivo", "pt": "Itálico", "de": "Kursiv", "nl": "Cursief",
        "ru": "Курсив", "zh": "斜体", "ja": "斜体", "ko": "기울임꼴", "tr": "İtalik", "pl": "Kursywa",
        "id": "Miring", "ar": "مائل", "fa": "مورب", "el": "Πλάγια", "hi": "तिरछा", "bn": "ইটালিক", "ur": "ترچھا"
    },
    "widget.notepad.tool.underline": {
        "es": "Subrayado", "fr": "Souligné", "it": "Sottolineato", "pt": "Sublinhado", "de": "Unterstrichen", "nl": "Onderstreept",
        "ru": "Подчеркнутый", "zh": "下划线", "ja": "下線", "ko": "밑줄", "tr": "Altı çizili", "pl": "Podkreślenie",
        "id": "Garis bawah", "ar": "تحته خط", "fa": "زیرخط‌دار", "el": "Υπογραμμισμένο", "hi": "रेखांकित", "bn": "আন্ডারলাইন", "ur": "زیر خط"
    },
    "widget.notepad.tool.strike": {
        "es": "Tachado", "fr": "Barré", "it": "Barrato", "pt": "Riscado", "de": "Durchgestrichen", "nl": "Doorgestreept",
        "ru": "Зачеркнутый", "zh": "删除线", "ja": "取り消し線", "ko": "취소선", "tr": "Üstü çizili", "pl": "Przekreślenie",
        "id": "Dicoret", "ar": "مشطوب", "fa": "خط‌خورده", "el": "Διαγραμμένο", "hi": "कटा हुआ", "bn": "স্ট্রাইক", "ur": "کٹا ہوا"
    },
    "widget.notepad.tool.color": {
        "es": "Color de texto", "fr": "Couleur du texte", "it": "Colore testo", "pt": "Cor do texto", "de": "Textfarbe", "nl": "Tekstkleur",
        "ru": "Цвет текста", "zh": "文字颜色", "ja": "テキストの色", "ko": "텍스트 색상", "tr": "Metin rengi", "pl": "Kolor tekstu",
        "id": "Warna teks", "ar": "لون النص", "fa": "رنگ متن", "el": "Χρώμα κειμένου", "hi": "पाठ का रंग", "bn": "পাঠ্য রঙ", "ur": "متن کا رنگ"
    },
    "widget.notepad.tool.left": {
        "es": "Alinear izquierda", "fr": "Aligner à gauche", "it": "Allinea a sinistra", "pt": "Alinhar à esquerda", "de": "Links ausrichten", "nl": "Links uitlijnen",
        "ru": "Выровнять влево", "zh": "左对齐", "ja": "左揃え", "ko": "왼쪽 정렬", "tr": "Sola hizala", "pl": "Wyrównaj do lewej",
        "id": "Rata kiri", "ar": "محاذاة لليسار", "fa": "تراز چپ", "el": "Στοίχιση αριστερά", "hi": "बाएं संरेखित करें", "bn": "বাম সারিবদ্ধ করুন", "ur": "بائیں سیدھ میں لائیں"
    },
    "widget.notepad.tool.center": {
        "es": "Centrar", "fr": "Centrer", "it": "Centra", "pt": "Centralizar", "de": "Zentrieren", "nl": "Centreren",
        "ru": "По центру", "zh": "居中", "ja": "中央揃え", "ko": "가운데 정렬", "tr": "Ortala", "pl": "Wyśrodkuj",
        "id": "Rata tengah", "ar": "توسيط", "fa": "وسط‌چین", "el": "Στοίχιση κέντρο", "hi": "केंद्र में लाएं", "bn": "কেন্দ্র সারিবদ্ধ করুন", "ur": "درمیان میں لائیں"
    },
    "widget.notepad.tool.right": {
        "es": "Alinear derecha", "fr": "Aligner à droite", "it": "Allinea a destra", "pt": "Alinhar à direita", "de": "Rechts ausrichten", "nl": "Rechts uitlijnen",
        "ru": "Выровнять вправо", "zh": "右对齐", "ja": "右揃え", "ko": "오른쪽 정렬", "tr": "Sağa hizala", "pl": "Wyrównaj do prawej",
        "id": "Rata kanan", "ar": "محاذاة لليمين", "fa": "تراز راست", "el": "Στοίχιση δεξιά", "hi": "दाएं संरेखित करें", "bn": "ডান সারিবদ্ধ করুন", "ur": "دائیں سیدھ میں لائیں"
    },
    "widget.notepad.tool.justify": {
        "es": "Justificar", "fr": "Justifier", "it": "Giustifica", "pt": "Justificar", "de": "Blocksatz", "nl": "Uitvullen",
        "ru": "По ширине", "zh": "两端对齐", "ja": "両端揃え", "ko": "양쪽 정렬", "tr": "İki yana yasla", "pl": "Wyjustuj",
        "id": "Rata kanan-kiri", "ar": "ضبط", "fa": "تراز دوطرفه", "el": "Πλήρης στοίχιση", "hi": "समायोजित करें", "bn": "জাস্টিফাই করুন", "ur": "دونوں طرف سیدھ میں لائیں"
    },
    "widget.notepad.tool.link": {
        "es": "Insertar enlace", "fr": "Insérer un lien", "it": "Inserisci link", "pt": "Inserir link", "de": "Link einfügen", "nl": "Link invoegen",
        "ru": "Вставить ссылку", "zh": "插入链接", "ja": "リンクを挿入", "ko": "링크 삽입", "tr": "Bağlantı ekle", "pl": "Wstaw link",
        "id": "Sisipkan tautan", "ar": "إدراج رابط", "fa": "درج لینک", "el": "Εισαγωγή συνδέσμου", "hi": "लिंक डालें", "bn": "লিঙ্ক সন্নিবেশ করুন", "ur": "لنک داخل کریں"
    },
    "widget.notepad.tool.image": {
        "es": "Insertar imagen", "fr": "Insérer une image", "it": "Inserisci immagine", "pt": "Inserir imagem", "de": "Bild einfügen", "nl": "Afbeelding invoegen",
        "ru": "Вставить изображение", "zh": "插入图片", "ja": "画像を挿入", "ko": "이미지 삽입", "tr": "Resim ekle", "pl": "Wstaw obraz",
        "id": "Sisipkan gambar", "ar": "إدراج صورة", "fa": "درج تصویر", "el": "Εισαγωγή εικόνας", "hi": "छवि डालें", "bn": "ছবি সন্নিবেশ করুন", "ur": "تصویر داخل کریں"
    },
    "widget.notepad.tool.bullet": {
        "es": "Lista con viñetas", "fr": "Liste à puces", "it": "Elenco puntato", "pt": "Lista com marcadores", "de": "Aufzählungsliste", "nl": "Opsommingslijst",
        "ru": "Маркированный список", "zh": "项目符号列表", "ja": "箇条書きリスト", "ko": "글머리 기호 목록", "tr": "Madde işaretli liste", "pl": "Lista punktowana",
        "id": "Daftar berpoin", "ar": "قائمة نقطية", "fa": "لیست نشانه‌دار", "el": "Λίστα με κουκκίδες", "hi": "बुलेट सूची", "bn": "বুলেট তালিকা", "ur": "نقطہ فہرست"
    },
    "widget.notepad.tool.number": {
        "es": "Lista numerada", "fr": "Liste numérotée", "it": "Elenco numerato", "pt": "Lista numerada", "de": "Nummerierte Liste", "nl": "Genummerde lijst",
        "ru": "Нумерованный список", "zh": "编号列表", "ja": "番号付きリスト", "ko": "번호 매기기 목록", "tr": "Numaralandırılmış liste", "pl": "Lista numerowana",
        "id": "Daftar bernomor", "ar": "قائمة مرقمة", "fa": "لیست شماره‌دار", "el": "Αριθμημένη λίστα", "hi": "क्रमांकित सूची", "bn": "সংখ্যাযুক্ত তালিকা", "ur": "شمار شدہ فہرست"
    },
    "widget.notepad.tool.check": {
        "es": "Lista de tareas", "fr": "Liste de tâches", "it": "Lista attività", "pt": "Lista de tarefas", "de": "Aufgabenliste", "nl": "Takenlijst",
        "ru": "Список задач", "zh": "任务列表", "ja": "タスクリスト", "ko": "작업 목록", "tr": "Görev listesi", "pl": "Lista zadań",
        "id": "Daftar tugas", "ar": "قائمة مهام", "fa": "لیست کارها", "el": "Λίστα εργασιών", "hi": "कार्य सूची", "bn": "কাজের তালিকা", "ur": "کام کی فہرست"
    },
    "widget.notepad.tool.quote": {
        "es": "Cita", "fr": "Citation", "it": "Citazione", "pt": "Citação", "de": "Zitat", "nl": "Citaat",
        "ru": "Цитата", "zh": "引用", "ja": "引用", "ko": "인용", "tr": "Alıntı", "pl": "Cytat",
        "id": "Kutipan", "ar": "اقتباس", "fa": "نقل قول", "el": "Παράθεση", "hi": "उद्धरण", "bn": "উদ্ধৃতি", "ur": "اقتباس"
    },
    "widget.notepad.tool.code": {
        "es": "Código", "fr": "Code", "it": "Codice", "pt": "Código", "de": "Code", "nl": "Code",
        "ru": "Код", "zh": "代码", "ja": "コード", "ko": "코드", "tr": "Kod", "pl": "Kod",
        "id": "Kode", "ar": "كود", "fa": "کد", "el": "Κώδικας", "hi": "कोड", "bn": "কোড", "ur": "کوڈ"
    },
    "widget.notepad.tool.clear": {
        "es": "Limpiar formato", "fr": "Effacer le format", "it": "Cancella formato", "pt": "Limpar formato", "de": "Format löschen", "nl": "Opmaak wissen",
        "ru": "Очистить формат", "zh": "清除格式", "ja": "書式をクリア", "ko": "서식 지우기", "tr": "Biçimi temizle", "pl": "Wyczyść format",
        "id": "Hapus format", "ar": "مسح التنسيق", "fa": "پاک کردن قالب", "el": "Εκκαθάριση μορφοποίησης", "hi": "प्रारूप साफ़ करें", "bn": "বিন্যাস পরিষ্কার করুন", "ur": "فارمیٹ صاف کریں"
    },
    "widget.notepad.tool.lock": {
        "es": "Bloquear edición", "fr": "Verrouiller l'édition", "it": "Blocca modifica", "pt": "Bloquear edição", "de": "Bearbeitung sperren", "nl": "Bewerking vergrendelen",
        "ru": "Заблокировать редактирование", "zh": "锁定编辑", "ja": "編集をロック", "ko": "편집 잠금", "tr": "Düzenlemeyi kilitle", "pl": "Zablokuj edycję",
        "id": "Kunci pengeditan", "ar": "قفل التحرير", "fa": "قفل ویرایش", "el": "Κλείδωμα επεξεργασίας", "hi": "संपादन लॉक करें", "bn": "সম্পাদনা লক করুন", "ur": "ترمیم لاک کریں"
    },
    "widget.notepad.tool.unlock": {
        "es": "Desbloquear edición", "fr": "Déverrouiller l'édition", "it": "Sblocca modifica", "pt": "Desbloquear edição", "de": "Bearbeitung entsperren", "nl": "Bewerking ontgrendelen",
        "ru": "Разблокировать редактирование", "zh": "解锁编辑", "ja": "編集のロック解除", "ko": "편집 잠금 해제", "tr": "Düzenleme kilidini aç", "pl": "Odblokuj edycję",
        "id": "Buka kunci pengeditan", "ar": "إلغاء قفل التحرير", "fa": "باز کردن قفل ویرایش", "el": "Ξεκλείδωμα επεξεργασίας", "hi": "संपादन अनलॉक करें", "bn": "সম্পাদনা আনলক করুন", "ur": "ترمیم ان لاک کریں"
    },
    "widget.notepad.tool.update_image": {
        "es": "Actualizar imagen", "fr": "Mettre à jour l'image", "it": "Aggiorna immagine", "pt": "Atualizar imagem", "de": "Bild aktualisieren", "nl": "Afbeelding bijwerken",
        "ru": "Обновить изображение", "zh": "更新图片", "ja": "画像を更新", "ko": "이미지 업데이트", "tr": "Resmi güncelle", "pl": "Aktualizuj obraz",
        "id": "Perbarui gambar", "ar": "تحديث الصورة", "fa": "بروزرسانی تصویر", "el": "Ενημέρωση εικόνας", "hi": "छवि अपडेट करें", "bn": "ছবি আপডেট করুন", "ur": "تصویر اپ ڈیٹ کریں"
    },
    "widget.markdown.tool.toggle_preview": {
        "es": "Alternar vista previa", "fr": "Basculer l'aperçu", "it": "Attiva/disattiva anteprima", "pt": "Alternar visualização", "de": "Vorschau umschalten", "nl": "Voorbeeld schakelen",
        "ru": "Переключить предпросмотр", "zh": "切换预览", "ja": "プレビューを切り替え", "ko": "미리보기 전환", "tr": "Önizlemeyi değiştir", "pl": "Przełącz podgląd",
        "id": "Alihkan pratinjau", "ar": "تبديل المعاينة", "fa": "تغییر پیش‌نمایش", "el": "Εναλλαγή προεπισκόπησης", "hi": "पूर्वावलोकन टॉगल करें", "bn": "প্রিভিউ টগল করুন", "ur": "پیش منظر ٹوگل کریں"
    },
    "widget.markdown.tool.lock": {
        "es": "Bloquear edición", "fr": "Verrouiller l'édition", "it": "Blocca modifica", "pt": "Bloquear edição", "de": "Bearbeitung sperren", "nl": "Bewerking vergrendelen",
        "ru": "Заблокировать редактирование", "zh": "锁定编辑", "ja": "編集をロック", "ko": "편집 잠금", "tr": "Düzenlemeyi kilitle", "pl": "Zablokuj edycję",
        "id": "Kunci pengeditan", "ar": "قفل التحرير", "fa": "قفل ویرایش", "el": "Κλείδωμα επεξεργασίας", "hi": "संपादन लॉक करें", "bn": "সম্পাদনা লক করুন", "ur": "ترمیم لاک کریں"
    },
    "widget.markdown.tool.unlock": {
        "es": "Desbloquear edición", "fr": "Déverrouiller l'édition", "it": "Sblocca modifica", "pt": "Desbloquear edição", "de": "Bearbeitung entsperren", "nl": "Bewerking ontgrendelen",
        "ru": "Разблокировать редактирование", "zh": "解锁编辑", "ja": "編集のロック解除", "ko": "편집 잠금 해제", "tr": "Düzenleme kilidini aç", "pl": "Odblokuj edycję",
        "id": "Buka kunci pengeditan", "ar": "إلغاء قفل التحرير", "fa": "باز کردن قفل ویرایش", "el": "Ξεκλείδωμα επεξεργασίας", "hi": "संपादन अनलॉक करें", "bn": "সম্পাদনা আনলক করুন", "ur": "ترمیم ان لاک کریں"
    },

    // Actions - Common UI actions
    "action.add_bookmark": {
        "es": "Agregar marcador", "fr": "Ajouter un signet", "de": "Lesezeichen hinzufügen", "it": "Aggiungi segnalibro", "pt": "Adicionar favorito", "nl": "Bladwijzer toevoegen",
        "ru": "Добавить закладку", "zh": "添加书签", "ja": "ブックマークを追加", "ko": "북마크 추가", "tr": "Yer imi ekle", "pl": "Dodaj zakładkę",
        "id": "Tambah bookmark", "ar": "إضافة إشارة مرجعية", "fa": "افزودن نشانک", "el": "Προσθήκη σελιδοδείκτη", "hi": "बुकमार्क जोड़ें", "bn": "বুকমার্ক যোগ করুন", "ur": "بک مارک شامل کریں"
    },
    "action.add_new_user": {
        "es": "Agregar usuario", "fr": "Ajouter un utilisateur", "de": "Benutzer hinzufügen", "it": "Aggiungi utente", "pt": "Adicionar usuário", "nl": "Gebruiker toevoegen",
        "ru": "Добавить пользователя", "zh": "添加用户", "ja": "ユーザーを追加", "ko": "사용자 추가", "tr": "Kullanıcı ekle", "pl": "Dodaj użytkownika",
        "id": "Tambah pengguna", "ar": "إضافة مستخدم", "fa": "افزودن کاربر", "el": "Προσθήκη χρήστη", "hi": "उपयोगकर्ता जोड़ें", "bn": "ব্যবহারকারী যোগ করুন", "ur": "صارف شامل کریں"
    },
    "action.add_section": {
        "es": "Agregar sección", "fr": "Ajouter une section", "de": "Abschnitt hinzufügen", "it": "Aggiungi sezione", "pt": "Adicionar seção", "nl": "Sectie toevoegen",
        "ru": "Добавить раздел", "zh": "添加部分", "ja": "セクションを追加", "ko": "섹션 추가", "tr": "Bölüm ekle", "pl": "Dodaj sekcję",
        "id": "Tambah bagian", "ar": "إضافة قسم", "fa": "افزودن بخش", "el": "Προσθήκη ενότητας", "hi": "अनुभाग जोड़ें", "bn": "বিভাগ যোগ করুন", "ur": "سیکشن شامل کریں"
    },
    "action.add_user": {
        "es": "Agregar usuario", "fr": "Ajouter utilisateur", "de": "Benutzer hinzufügen", "it": "Aggiungi utente", "pt": "Adicionar usuário", "nl": "Gebruiker toevoegen",
        "ru": "Добавить", "zh": "添加用户", "ja": "追加", "ko": "사용자 추가", "tr": "Ekle", "pl": "Dodaj",
        "id": "Tambah", "ar": "إضافة", "fa": "افزودن", "el": "Προσθήκη", "hi": "जोड़ें", "bn": "যোগ করুন", "ur": "شامل کریں"
    },
    "action.add_widget": {
        "es": "Agregar widget", "fr": "Ajouter un widget", "de": "Widget hinzufügen", "it": "Aggiungi widget", "pt": "Adicionar widget", "nl": "Widget toevoegen",
        "ru": "Добавить виджет", "zh": "添加小部件", "ja": "ウィジェットを追加", "ko": "위젯 추가", "tr": "Widget ekle", "pl": "Dodaj widget",
        "id": "Tambah widget", "ar": "إضافة أداة", "fa": "افزودن ابزارک", "el": "Προσθήκη widget", "hi": "विजेट जोड़ें", "bn": "উইজেট যোগ করুন", "ur": "ویجیٹ شامل کریں"
    },
    "action.change_image": {
        "es": "Cambiar imagen", "fr": "Changer l'image", "de": "Bild ändern", "it": "Cambia immagine", "pt": "Alterar imagem", "nl": "Afbeelding wijzigen",
        "ru": "Изменить изображение", "zh": "更改图片", "ja": "画像を変更", "ko": "이미지 변경", "tr": "Resmi değiştir", "pl": "Zmień obraz",
        "id": "Ubah gambar", "ar": "تغيير الصورة", "fa": "تغییر تصویر", "el": "Αλλαγή εικόνας", "hi": "छवि बदलें", "bn": "ছবি পরিবর্তন করুন", "ur": "تصویر تبدیل کریں"
    },
    "action.check_again": {
        "es": "Comprobar de nuevo", "fr": "Vérifier à nouveau", "de": "Erneut prüfen", "it": "Controlla di nuovo", "pt": "Verificar novamente", "nl": "Opnieuw controleren",
        "ru": "Проверить снова", "zh": "再次检查", "ja": "再確認", "ko": "다시 확인", "tr": "Tekrar kontrol et", "pl": "Sprawdź ponownie",
        "id": "Periksa lagi", "ar": "تحقق مرة أخرى", "fa": "دوباره بررسی کنید", "el": "Ελέγξτε ξανά", "hi": "फिर से जांचें", "bn": "আবার পরীক্ষা করুন", "ur": "دوبارہ چیک کریں"
    },
    "action.check_updates": {
        "es": "Buscar actualizaciones", "fr": "Vérifier les mises à jour", "de": "Nach Updates suchen", "it": "Verifica aggiornamenti", "pt": "Verificar atualizações", "nl": "Controleren op updates",
        "ru": "Проверить обновления", "zh": "检查更新", "ja": "更新を確認", "ko": "업데이트 확인", "tr": "Güncellemeleri kontrol et", "pl": "Sprawdź aktualizacje",
        "id": "Periksa pembaruan", "ar": "التحقق من التحديثات", "fa": "بررسی به‌روزرسانی‌ها", "el": "Έλεγχος ενημερώσεων", "hi": "अपडेट जांचें", "bn": "আপডেট পরীক্ষা করুন", "ur": "اپ ڈیٹس چیک کریں"
    },
    "action.download_backup": {
        "es": "Descargar Copia de Seguridad", "fr": "Télécharger la sauvegarde", "de": "Backup herunterladen", "it": "Scarica backup", "pt": "Baixar backup", "nl": "Back-up downloaden",
        "ru": "Скачать резервную копию", "zh": "下载备份", "ja": "バックアップをダウンロード", "ko": "백업 다운로드", "tr": "Yedeği indir", "pl": "Pobierz kopię zapasową",
        "id": "Unduh cadangan", "ar": "تنزيل النسخة الاحتياطية", "fa": "دانلود پشتیبان", "el": "Λήψη αντιγράφου ασφαλείας", "hi": "बैकअप डाउनलोड करें", "bn": "ব্যাকআপ ডাউনলোড করুন", "ur": "بیک اپ ڈاؤن لوڈ کریں"
    },
    "action.download_install": {
        "es": "Descargar e instalar", "fr": "Télécharger et instalar", "de": "Herunterladen & installieren", "it": "Scarica e installa", "pt": "Baixar e instalar", "nl": "Downloaden & installeren",
        "ru": "Скачать и установить", "zh": "下载并安装", "ja": "ダウンロードしてインストール", "ko": "다운로드 및 설치", "tr": "İndir ve yükle", "pl": "Pobierz i zainstalluj",
        "id": "Unduh & instal", "ar": "تنزيل وتثبيت", "fa": "دانلود و نصب", "el": "Λήψη και εγκατάσταση", "hi": "डाउनलोड और इंस्टॉल करें", "bn": "ডাউনলোড এবং ইনস্টল করুন", "ur": "ڈاؤن لوڈ اور انسٹال کریں"
    },
    "action.edit_mode": {
        "es": "Modo Edición", "fr": "Mode Édition", "de": "Bearbeitungsmodus", "it": "Modalità Modifica", "pt": "Modo de Edição", "nl": "Bewerkingsmodus",
        "ru": "Режим редактирования", "zh": "编辑模式", "ja": "編集モード", "ko": "편집 모드", "tr": "Düzenleme Modu", "pl": "Tryb edycji",
        "id": "Mode Edit", "ar": "وضع التحرير", "fa": "حالت ویرایش", "el": "Λειτουργία επεξεργασίας", "hi": "संपादन मोड", "bn": "সম্পাদনা মোড", "ur": "ترمیم کا موڈ"
    },
    "action.edit_user": {
        "es": "Editar usuario", "fr": "Modifier l'utilisateur", "de": "Benutzer bearbeiten", "it": "Modifica utente", "pt": "Editar utilizador", "nl": "Gebruiker bewerken",
        "ru": "Редактировать пользователя", "zh": "编辑用户", "ja": "ユーザーを編集", "ko": "사용자 편집", "tr": "Kullanıcıyı düzenle", "pl": "Edytuj użytkownika",
        "id": "Edit pengguna", "ar": "تحرير المستخدم", "fa": "ویرایش کاربر", "el": "Επεξεργασία χρήστη", "hi": "उपयोगकर्ता संपादित करें", "bn": "ব্যবহারকারী সম্পাদনা করুন", "ur": "صارف میں ترمیم کریں"
    },
    "action.save_changes": {
        "es": "Guardar cambios", "fr": "Enregistrer les modifications", "de": "Änderungen speichern", "it": "Salva modifiche", "pt": "Guardar alterações", "nl": "Wijzigingen opslaan",
        "ru": "Сохранить изменения", "zh": "保存更改", "ja": "変更を保存", "ko": "변경 사항 저장", "tr": "Değişiklikleri kaydet", "pl": "Zapisz zmiany",
        "id": "Simpan perubahan", "ar": "حفظ التغييرات", "fa": "ذخیره تغییرات", "el": "Αποθήκευση αλλαγών", "hi": "परिवर्तन सहेजें", "bn": "পরিবর্তনগুলি সংরক্ষণ করুন", "ur": "تبدیلیاں محفوظ کریں"
    },
    "action.erase_everything": {
        "es": "Borrar todo", "fr": "Tout effacer", "de": "Alles löschen", "it": "Cancella tutto", "pt": "Apagar tudo", "nl": "Alles wissen",
        "ru": "Удалить всё", "zh": "清除所有", "ja": "すべて消去", "ko": "모두 지우기", "tr": "Her şeyi sil", "pl": "Wyczyść wszystko",
        "id": "Hapus semua", "ar": "مسح كل شيء", "fa": "پاک کردن همه", "el": "Διαγραφή όλων", "hi": "सब कुछ मिटाएं", "bn": "সব মুছুন", "ur": "سب کچھ مٹائیں"
    },
    "action.report_issue": {
        "es": "Reportar problema", "fr": "Signaler un problema", "de": "Problem melden", "it": "Segnala problema", "pt": "Relatar problema", "nl": "Probleem melden",
        "ru": "Сообщить о проблеме", "zh": "报告问题", "ja": "問題を報告", "ko": "문제 신고", "tr": "Sorun bildir", "pl": "Zgłoś problem",
        "id": "Laporkan masalah", "ar": "الإبلاغ عن مشكلة", "fa": "گزارش مشکل", "el": "Αναφορά προβλήματος", "hi": "समस्या की रिपोर्ट करें", "bn": "সমস্যা রিপোর্ট করুন", "ur": "مسئلہ کی اطلاع دیں"
    },
    "action.reset_system": {
        "es": "Reiniciar sistema", "fr": "Réinitialiser le système", "de": "System zurücksetzen", "it": "Ripristina sistema", "pt": "Resetar sistema", "nl": "Systeem resetten",
        "ru": "Сбросить систему", "zh": "重置系统", "ja": "システムをリセット", "ko": "시스템 재설정", "tr": "Sistemi sıfırla", "pl": "Zresetuj system",
        "id": "Reset sistem", "ar": "إعادة تعيين النظام", "fa": "بازنشانی سیستم", "el": "Επαναφορά συστήματος", "hi": "सिस्टम रीसेट करें", "bn": "সিস্টেম রিসেট করুন", "ur": "سسٹم ری سیٹ کریں"
    },
    "action.select_file": {
        "es": "Seleccionar archivo", "fr": "Sélectionner un fichier", "de": "Datei auswählen", "it": "Seleziona file", "pt": "Selecionar arquivo", "nl": "Bestand selecteren",
        "ru": "Выбрать файл", "zh": "选择文件", "ja": "ファイルを選択", "ko": "파일 선택", "tr": "Dosya seç", "pl": "Wybierz plik",
        "id": "Pilih file", "ar": "اختر ملف", "fa": "انتخاب فایل", "el": "Επιλογή αρχείου", "hi": "फ़ाइल चुनें", "bn": "ফাইল নির্বাচন করুন", "ur": "فائل منتخب کریں"
    },
    "action.update": {
        "es": "Actualizar", "fr": "Mettre à jour", "de": "Aktualisieren", "it": "Aggiorna", "pt": "Atualizar", "nl": "Bijwerken",
        "ru": "Обновить", "zh": "更新", "ja": "更新", "ko": "업데이트", "tr": "Güncelle", "pl": "Aktualizuj",
        "id": "Perbarui", "ar": "تحديث", "fa": "به‌روزرسانی", "el": "Ενημέρωση", "hi": "अपडेट करें", "bn": "আপডেট করুন", "ur": "اپ ڈیٹ کریں"
    },

    "widget.telemetry.name": {
        "es": "Salud del Servidor", "fr": "Santé du Serveur", "it": "Salute del Server", "pt": "Saúde do Servidor", "de": "Serverstatus", "nl": "Servergezondheid",
        "ru": "Состояние сервера", "zh": "服务器健康", "ja": "サーバーの状態", "ko": "서버 상태", "tr": "Sunucu Sağlığı", "pl": "Stan serwera",
        "id": "Kesehatan Server", "ar": "حالة الخادم", "fa": "سلامت سرور", "el": "Υγεία διακομιστή", "hi": "सरवर की सेहत", "bn": "সার্ভার স্বাস্থ্য", "ur": "سرور کی صحت"
    },
    "widget.telemetry.description": {
        "es": "Monitor de hardware en vivo", "fr": "Moniteur matériel en direct", "it": "Monitor hardware live", "pt": "Monitor de hardware ao vivo", "de": "Live-Hardware-Überwachung", "nl": "Live hardwaremonitor",
        "ru": "Мониторинг оборудования", "zh": "实时硬件监控", "ja": "ライブハードウェア監視", "ko": "실시간 하드웨어 모니터", "tr": "Canlı Donanım İzleme", "pl": "Monitorowanie sprzętu na żywo",
        "id": "Monitor perangkat keras langsung", "ar": "مراقبة الأجهزة الحية", "fa": "مانیتورینگ سخت‌افزار زنده", "el": "Ζωντανή παρακολούθηση υλικού", "hi": "लائیو हार्डवीयर मॉनिटर", "bn": "লাইভ হার্ডওয়্যার মনিটর", "ur": "لائیو ہارڈویئر مانیٹر"
    },
    "setup.ready_msg": {
        "es": "¿Listo para inicializar el sistema?", "fr": "Prêt à initialiser le système ?", "it": "Pronto per inizializzare el sistema?", "pt": "Pronto para inicializar o sistema?", "de": "Bereit zum Initialisieren?",
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
    "general.cancel": {
        "es": "Cancelar", "fr": "Annuler", "de": "Abbrechen", "it": "Annulla", "pt": "Cancelar", "nl": "Annuleren",
        "ru": "Отмена", "zh": "取消", "ja": "キャンセル", "ko": "취소", "tr": "İptal", "pl": "Anuluj",
        "id": "Batal", "ar": "إلغاء", "fa": "لغو", "el": "Ακύρωση", "hi": "रद्द करें", "bn": "বাতিল", "ur": "منسوخ کریں"
    },
    "general.close": {
        "es": "Cerrar", "fr": "Fermer", "de": "Schließen", "it": "Chiudi", "pt": "Fechar", "nl": "Sluiten",
        "ru": "Закрыть", "zh": "关闭", "ja": "閉じる", "ko": "닫기", "tr": "Kapat", "pl": "Zamknij",
        "id": "Tutup", "ar": "إغلاق", "fa": "بستن", "el": "Κλείσιμο", "hi": "बंद करें", "bn": "বন্ধ করুন", "ur": "بند کریں"
    },
    "general.confirm": {
        "es": "Confirmar", "fr": "Confirmer", "de": "Bestätigen", "it": "Conferma", "pt": "Confirmar", "nl": "Bevestigen",
        "ru": "Подтвердить", "zh": "确认", "ja": "確認", "ko": "확인", "tr": "Onayla", "pl": "Potwierdź",
        "id": "Konfirmasi", "ar": "تأكيد", "fa": "تایید", "el": "Επιβεβαίωση", "hi": "पुष्टि करें", "bn": "নিশ্চিত করুন", "ur": "تصدیق کریں"
    },
    "general.delete": {
        "es": "Eliminar", "fr": "Supprimer", "de": "Löschen", "it": "Elimina", "pt": "Eliminar", "nl": "Verwijderen",
        "ru": "Удалить", "zh": "删除", "ja": "削除", "ko": "삭제", "tr": "Sil", "pl": "Usuń",
        "id": "Hapus", "ar": "حذف", "fa": "حذف", "el": "Διαγραφή", "hi": "हटाएं", "bn": "মুছে ফেলুন", "ur": "حذف کریں"
    },
    "general.edit": {
        "es": "Editar", "fr": "Modifier", "de": "Bearbeiten", "it": "Modifica", "pt": "Editar", "nl": "Bewerken",
        "ru": "Редактировать", "zh": "编辑", "ja": "編集", "ko": "편집", "tr": "Düzenle", "pl": "Edytuj",
        "id": "Edit", "ar": "تحرير", "fa": "ویرایش", "el": "Επεξεργασία", "hi": "संपादित करें", "bn": "সম্পাদনা", "ur": "ترمیم کریں"
    },
    "general.error": {
        "es": "¡Uy!", "fr": "Oups !", "de": "Hoppla!", "it": "Ops!", "pt": "Ops!", "nl": "Oeps!",
        "ru": "Ой!", "zh": "糟糕！", "ja": "おっと！", "ko": "앗!", "tr": "Hata!", "pl": "Ups!",
        "id": "Ups!", "ar": "عفوًا!", "fa": "اوه!", "el": "Ωχ!", "hi": "ओह!", "bn": "ওহ!", "ur": "اوہ!"
    },
    "general.save": {
        "es": "Guardar cambios", "fr": "Enregistrer les modifications", "de": "Änderungen speichern", "it": "Salva modifiche", "pt": "Guardar alterações", "nl": "Wijzigingen opslaan",
        "ru": "Сохранить изменения", "zh": "保存更改", "ja": "変更を保存", "ko": "변경 사항 저장", "tr": "Değişiklikleri kaydet", "pl": "Zapisz zmiany",
        "id": "Simpan perubahan", "ar": "حفظ التغييرات", "fa": "ذخیره تغییرات", "el": "Αποθήκευση αλλαγών", "hi": "परिवर्तन सहेजें", "bn": "পরিবর্তনগুলি সংরক্ষণ করুন", "ur": "تبدیلیاں محفوظ کریں"
    },
    "general.success": {
        "es": "¡Todo listo!", "fr": "Tout est prêt !", "de": "Alles bereit!", "it": "Tutto pronto!", "pt": "Tudo pronto!", "nl": "Alles klaar!",
        "ru": "Все готово!", "zh": "一切就绪！", "ja": "準備完了！", "ko": "모두 준비됐습니다!", "tr": "Her şey hazır!", "pl": "Wszystko gotowe!",
        "id": "Semua siap!", "ar": "كل شيء جاهز!", "fa": "همه چیز آماده!", "el": "Όλα έτοιμα!", "hi": "सब तैयार है!", "bn": "সব প্রস্তুত!", "ur": "سب تیار ہے!"
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
    "settings.beta_tester": {
        "es": "Beta Tester", "fr": "Bêta-testeur", "de": "Beta-Tester", "it": "Beta Tester", "pt": "Beta Tester", "nl": "Bètatester",
        "ru": "Бета-тестер", "zh": "Beta 测试员", "ja": "ベータテスター", "ko": "베타 테스터", "tr": "Beta Test Kullanıcısı", "pl": "Tester wersji beta",
        "id": "Penguji Beta", "ar": "مختبر بيتا", "fa": "تست‌کننده بتا", "el": "Δοκιμαστής Beta", "hi": "बीटा टेस्टर", "bn": "বিটা টেস্টার", "ur": "بیٹا ٹیسٹر"
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
    "widget.markdown.error.preview": {
        "es": "¡Ups! Error al procesar Markdown.", "fr": "Oups ! Échec de l'aperçu Markdown.", "it": "Ops! Errore di anteprima Markdown.", "pt": "Ops! Erro de visualização Markdown.", "de": "Hoppla! Markdown-Vorschau fehlgeschlagen.",
        "ru": "Ой! Ошибка предпросмотра Markdown.", "zh": "糟糕！Markdown 预览失败。", "ja": "おっと！Markdownのプレビューに失敗しました。", "ko": "앗! Markdown 미리보기에 실패했습니다.", "nl": "Oeps! Markdown-voorbeeld mislukt.",
        "tr": "Hata! Markdown önizlemesi başarısız.", "pl": "Ups! Błąd podglądu Markdown.", "id": "Ups! Pratinjau Markdown gagal.", "ar": "عفوًا! فشلت معاينة Markdown.", "fa": "اوه! پیش‌نمایش Markdown ناموفق بود.",
        "el": "Ωχ! Η προεπισκόπηση Markdown απέτυψε.", "hi": "ओह! Markdown पूर्वावलोकन विफल रहा।", "bn": "ওহ! Markdown প্রিভিউ ব্যর্থ হয়েছে।", "ur": "اوہ! مکارڈاؤن پیش منظر ناکام رہا۔"
    },
    "widget.notepad.modal.title": {
        "es": "Insertar contenido", "fr": "Insérer du contenu", "it": "Inserisci contenuto", "pt": "Inserir conteúdo", "de": "Inhalt einfügen",
        "ru": "Вставить содержимое", "zh": "插入内容", "ja": "コンテンツを挿入", "ko": "콘텐츠 삽입", "nl": "Inhoud invoegen",
        "tr": "İçerik Ekle", "pl": "Wstaw zawartość", "id": "Sisipkan konten", "ar": "إدراج محتوى", "fa": "درج محتوا",
        "el": "Εισαγωγή περιεχομένου", "hi": "सामग्री डालें", "bn": "সামগ্রী সন্নিবেশ করুন", "ur": "مواد داخل کریں"
    },
    "widget.notepad.modal.link_title": {
        "es": "Insertar enlace", "fr": "Insérer un lien", "it": "Inserisci link", "pt": "Inserir link", "de": "Link einfügen",
        "ru": "Вставить ссылку", "zh": "插入链接", "ja": "リンクを挿入", "ko": "링크 삽입", "nl": "Link invoegen",
        "tr": "Bağlantı Ekle", "pl": "Wstaw link", "id": "Sisipkan tautan", "ar": "إدراج رابط", "fa": "درج لینک",
        "el": "Εισαγωγή συνδέσμου", "hi": "लिंक डालें", "bn": "লিঙ্ক সন্নিবেশ করুন", "ur": "لنک داخل کریں"
    },
    "widget.notepad.modal.image_title": {
        "es": "Insertar imagen", "fr": "Insérer une image", "it": "Inserisci immagine", "pt": "Inserir imagem", "de": "Bild einfügen",
        "ru": "Вставить изображение", "zh": "插入图片", "ja": "画像を挿入", "ko": "이미지 삽입", "nl": "Afbeelding invoegen",
        "tr": "Resim Ekle", "pl": "Wstaw obraz", "id": "Sisipkan gambar", "ar": "إدراج صورة", "fa": "درج تصویر",
        "el": "Εισαγωγή εικόνας", "hi": "छवि डालें", "bn": "ছবি সন্নিবেশ করুন", "ur": "تصویر داخل کریں"
    },
    "widget.notepad.modal.image_edit_title": {
        "es": "Editar imagen", "fr": "Modifier l'image", "it": "Modifica immagine", "pt": "Editar imagem", "de": "Bild bearbeiten",
        "ru": "Изменить изображение", "zh": "编辑图片", "ja": "画像を編集", "ko": "이미지 편집", "nl": "Afbeelding bewerken",
        "tr": "Resmi Düzenle", "pl": "Edytuj obraz", "id": "Edit gambar", "ar": "تعديل الصورة", "fa": "ویرایش تصویر",
        "el": "Επεξεργασία εικόνας", "hi": "छवि बदलें", "bn": "ছবি সম্পাদনা করুন", "ur": "تصویر میں ترمیم کریں"
    },
    "widget.notepad.modal.placeholder_url": {
        "es": "https://ejemplo.com", "fr": "https://exemple.com", "it": "https://esempio.com", "pt": "https://exemplo.com", "de": "https://beispiel.de",
        "ru": "https://example.com", "zh": "https://example.com", "ja": "https://example.com", "ko": "https://example.com", "nl": "https://voorbeeld.nl",
        "tr": "https://example.com", "pl": "https://przyklad.pl", "id": "https://contoh.com", "ar": "https://example.com", "fa": "https://example.com",
        "el": "https://example.com", "hi": "https://example.com", "bn": "https://example.com", "ur": "https://example.com"
    },
    "widget.notepad.modal.placeholder_img": {
        "es": "Pega la URL de la imagen...", "fr": "Collez l'URL de l'image...", "it": "Incolla l'URL dell'immagine...", "pt": "Cole o URL da imagem...", "de": "Bild-URL einfügen...",
        "ru": "Вставьте URL изображения...", "zh": "粘贴图片网址...", "ja": "画像のURLを貼り付け...", "ko": "이미지 URL 붙여넣기...", "nl": "Plak afbeeldings-URL...",
        "tr": "Resim URL'sini yapıştır...", "pl": "Wklej adres URL obrazu...", "id": "Tempel URL gambar...", "ar": "الاصق رابط الصورة...", "fa": "آدرس تصویر را بچسبانید...",
        "el": "Επικολλήστε το URL της εικόνας...", "hi": "छवि URL चिपकाएं...", "bn": "ছবির URL পেস্ট করুন...", "ur": "تصویر کا یو آر ایل چسپاں کریں..."
    },
    "widget.notepad.modal.placeholder_width": {
        "es": "Ancho (ej. 100%, 300px)", "fr": "Largeur (ex. 100%, 300px)", "it": "Larghezza (es. 100%, 300px)", "pt": "Largura (ex. 100%, 300px)", "de": "Breite (z.B. 100%, 300px)",
        "ru": "Ширина (напр., 100%, 300px)", "zh": "宽度 (例如 100%, 300px)", "ja": "幅 (例: 100%, 300px)", "ko": "너비 (예: 100%, 300px)", "nl": "Breedte (bijv. 100%, 300px)",
        "tr": "Genişlik (örn. 100%, 300px)", "pl": "Szerokość (np. 100%, 300px)", "id": "Lebar (mis. 100%, 300px)", "ar": "العرض (مثال 100%, 300px)", "fa": "عرض (مانند 100%, 300px)",
        "el": "Πλάτος (π.χ. 100%, 300px)", "hi": "चौड़ाई (जैसे 100%, 300px)", "bn": "প্রস্থ (যেমন 100%, 300px)", "ur": "چوڑائی (مثلاً 100%, 300px)"
    },
    "widget.notepad.error.save": {
        "es": "Error al guardar: ", "fr": "Échec de l'enregistrement: ", "it": "Errore salvataggio: ", "pt": "Erro ao salvar: ", "de": "Fehler beim Speichern: ", "nl": "Opslaan mislukt: ",
        "ru": "Ошибка сохранения: ", "zh": "保存失败: ", "ja": "保存失敗: ", "ko": "저장 실패: ", "tr": "Kaydetme Başarısız: ", "pl": "Błąd zapisu: ",
        "id": "Gagal menyimpan: ", "ar": "فشل الحفظ: ", "fa": "خطا در ذخیره: ", "el": "Αποτυχία αποθήκευσης: ", "hi": "सहेजने में विफल: ", "bn": "সংরক্ষণ ব্যর্থ: ", "ur": "محفوظ ناکام: "
    },
    "widget.notepad.tool.scroll_hint": {
        "es": "Desplaza horizontalmente con la rueda del ratón para ver más herramientas",
        "fr": "Faites défiler horizontalement avec la molette de la souris pour voir plus d'outils",
        "it": "Scorri orizzontalmente con la rotellina del mouse para vedere altri strumenti",
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
        "es": "Reloj digital con fecha", "fr": "Horloge numérique con fecha", "it": "Orologio digitale con data", "pt": "Relógio digital com data", "de": "Digitaluhr mit Datum", "nl": "Digitale klok met datum",
        "ru": "Цифровые часы с датой", "zh": "带日期的数字时钟", "ja": "日付付きデジタル時計", "ko": "날짜가 있는 디지털 시계", "tr": "Tarihli dijital saat", "pl": "Zegar cyfrowy z datą",
        "id": "Jam digital dengan tanggal", "ar": "ساعة رقمية مع التاريخ", "fa": "ساعت دیجیتال با تاریخ", "el": "Ψηφιακό ρολόι με ημερομηνία", "hi": "तारीख के साथ डिजिटल घड़ी", "bn": "তারিখ সহ ডিজিটাল ঘড়ি", "ur": "تاریخ کے ساتھ ڈیجیٹل گھڑی"
    },
    "widget.clock.city_desc": {
        "es": "Busca tu ciudad y selecciónala de los resultados.",
        "fr": "Recherchez votre ville et sélectionnez-la dans les résultats.",
        "it": "Cerca la tua città y selezionala dai risultati.",
        "pt": "Pesquise sua cidade e selecione-a nos resultados.",
        "de": "Suchen Sie Ihre Stadt und wählen Sie sie aus den Ergebnissen aus.",
        "nl": "Zoek uw stad en selecteer deze uit de resultaten.",
        "ru": "Найдите свой город и выберите его из результатов.",
        "zh": "搜索您的城市并从结果中选择。",
        "ja": "都市を検索して結果から選択してください。",
        "ko": "도시를 검색하고 결과에서 선택하세요.",
        "tr": "Şehrinizi arayın ve sonuçlardan seçin.",
        "pl": "Wyszukaj swoje miasto i wybierz je z wyników.",
        "id": "Cari kota Anda dan pilih dari hasil.",
        "ar": "ابحث عن مدينتك واختر من النتائج.",
        "fa": "شهر خود را جستجو کنید و از نتایج انتخاب کنید.",
        "el": "Αναζητήστε την πόλη σας και επιλέξτε από τα αποτελέσματα.",
        "hi": "अपने शहर को खोजें और परिणामों में से चुनें।",
        "bn": "আপনার শহর খুঁজুন এবং ফলাফল থেকে নির্বাচন করুন।",
        "ur": "اپنے شہر کو تلاش کریں اور نتائج میں سے منتخب کریں۔"
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
        "ru": "Пожалуйста, подождите, пока система сбрасывается...", "zh": "请稍候，系统正在重置...", "ja": "システムがリसेटされるまでお待ちください...", "ko": "시스템이 초기화되는 동안 잠시 기다려 주십시오...", "nl": "Een ogenblik geduld terwijl het systeem reset...",
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
        "es": "Falló la conexión. Revise los registros.", "fr": "La conexión ha fallado. Verifique los registros.", "it": "Connessione fallita. Controlla i registri.", "pt": "Falha na conexão. Verifique os logs.", "de": "Verbindung fehlgeschlagen. Protokolle prüfen.",
        "ru": "Ошибка подключения. Проверьте журналы.", "zh": "连接失败。请检查日志。", "ja": "接続に失敗しました。ログを確認してください。", "ko": "연결 실패. 로그를 확인하세요.", "nl": "Verbinding mislukt. Controleer logboeken.",
        "tr": "Bağlantı başarısız. Günlükleri kontrol edin.", "pl": "Połączenie nie powiodło się. Sprawdź logi.", "id": "Koneksi gagal. Periksa log.", "ar": "فشل الاتصال. تحقق من السجلات.",
        "fa": "اتصال ناموفق بود. لاگ‌ها را بررسی کنید.", "el": "Η σύνδεση απέτυψε. Ελέγξτε τα αρχεία καταγραφής.", "hi": "कनेक्शन विफल। लॉग की जाँच करें।", "bn": "সংযোগ ব্যর্থ হয়েছে। লগ চেক করুন।", "ur": "کنکشن ناکام ہوگیا۔ لاگز چیک کریں۔"
    },
    "notifier.username_required": {
        "es": "Usuario requerido", "fr": "Nom d'utilisateur requis", "it": "Nome utente richiesto", "pt": "Nome de usuário obrigatório", "de": "Benutzername erforderlich",
        "ru": "Требуется имя пользователя", "zh": "需要用户名", "ja": "ユーザー名が必要です", "ko": "사용자 이름이 필요합니다", "nl": "Gebruikersnaam vereist",
        "tr": "Kullanıcı adı gerekli", "pl": "Wymagana nazwa użytkownika", "id": "Nama pengguna diperlukan", "ar": "اسم المستخدم مطلوب",
        "fa": "نام کاربری الزامی است", "el": "Απαιτείται όνομα χρήστη", "hi": "उपयोगकर्ता नाम आवश्यक", "bn": "ব্যবহারকারীর নাম প্রয়োজন", "ur": "صارف نام درکار ہے"
    },
    "settings.new_version_notif": {
        "es": "¡Nueva versión disponible!", "fr": "Nouvelle version disponible !", "it": "Nuova versione disponibile!", "pt": "Nova versão disponible!", "de": "Neue Version verfügbar!",
        "ru": "Доступна новая версия!", "zh": "新版本可用！", "ja": "新バージョンが利用可能です！", "ko": "새 버전을 사용할 수 있습니다!", "nl": "Nieuwe versie beschikbaar!",
        "tr": "Yeni versiyon mevcut!", "pl": "Dostępna nowa wersja!", "id": "Versi baru tersedia!", "ar": "نسخة جديدة متاحة!", "fa": "نسخه جدید در دسترس است!",
        "el": "Νέα έκδοση διαθέσιμη!", "hi": "नया संस्करण उपलब्ध है!", "bn": "নতুন সংস্করণ উপলব্ধ!", "ur": "نیا ورژن دستیاب ہے!"
    },
    "settings.up_to_date_docker_msg": {
        "es": "Estás estrictamente al día.", "fr": "Vous êtes strictement à jour.", "it": "Sei rigorosamente actualizado.", "pt": "Você está rigorosamente atualizado.", "de": "Sie sind auf dem neuesten Stand.",
        "ru": "Вы полностью обновлены.", "zh": "Вы полностью обновлены.", "ja": "最新の状態です。", "ko": "최신 상태입니다.", "nl": "Je bent helemaal bijgewerkt.",
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
        "ru": "Супер администратор не может ser удален", "zh": "超级管理员无法删除", "ja": "スーパー管理者は削除できません", "ko": "최고 관리자는 삭제할 수 없습니다", "nl": "De superbeheerder kan niet worden verwijderd",
        "tr": "Süper Yönetici silinemez", "pl": "Nie można usunąć Super Administratora", "id": "Super Administrator tidak dapat dihapus", "ar": "لا يمكن حذف المسؤول العام", "fa": "سوپر ادمین قابل حذف نیست",
        "el": "Δεν είναι δυνατή η διαγραφή του Super Administrator", "hi": "सुपर एडमिनिस्ट्रेटर को हटाया नहीं जा सकता", "bn": "সুপার অ্যাডমিনিস্ট্রেটর মুছে ফেলা যাবে না", "ur": "سپر ایڈمنسٹریٹر کو حذف نہیں کیا جا سکتا"
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
        "hi": "डेटाबेस त्रुटि", "bn": "ডেটাবেস ত্রুটি", "ur": "ڈیٹا بیس کی غلطی"
    },
    "general.internal_error": {
        "es": "Error interno del servidor", "fr": "Erreur interne du serveur", "de": "Interner Serverfehler", "it": "Errore interno del server",
        "pt": "Erro interno do servidor", "ru": "Внутренняя ошибка сервера", "zh": "服务器内部错误", "ja": "サーバー内部エラー",
        "ko": "서버 내부 오류", "nl": "Interne serverfout", "pl": "Wewnętrzny błąd serwera", "tr": "Dahili sunucu hatası",
        "id": "Kesalahan server internal", "ar": "خطأ داخلي في الخادم", "fa": "خطای داخلی سرور", "el": "Εσωτερικό σφάλμα διακομιστή",
        "hi": "आंतरिक सर्वर त्रुटि", "bn": "অভ্যন্তরীণ সার্ভার ত্রুটি", "ur": "اندرونی سرور کی غلطی"
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
        "es": "La contraseña debe tener al menos 4 caracteres", "fr": "Le mot de passe doit contenir au menos 4 caracteres", "de": "Passwort muss mindestens 4 Zeichen lang sein",
        "ru": "Пароль должен быть не менее 4 символов", "zh": "密码必须至少包含 4 个字符", "ja": "パスワードは4文字以上である必要があります", "ko": "비밀번호는 4자 이상이어야 합니다", "ar": "يجب أن تتكون كلمة المرور من 4 أحرف على الأقل"
    },
    "setup.already_initialized": {
        "es": "El sistema ya ha sido inicializado", "fr": "Le sistema est déjà initialisé", "de": "System ist bereits initialisiert", "it": "Sistema già inizializzato",
        "pt": "Sistema já inicializado", "ru": "Система уже инициализирована", "zh": "系统已初始化", "ja": "システムはすでに初期化されています",
        "ko": "시스템이 이미 초기화되었습니다", "nl": "Systeem is al geïnitialiseerd", "pl": "System został już zainicjowany", "tr": "Sistem zaten başlatıldı",
        "id": "Sistem sudah diinisialisasi", "ar": "تم تهيئة النظام بالفعل", "fa": "سیستم قبلاً راه اندازی شده است", "el": "Το σύστημα έχει ήδη αρχικοποιηθεί",
        "hi": "सिस्टम पहले से ही आरंभीकृत है", "bn": "সিস্টেম ইতিমধ্যে শুরু হয়েছে", "ur": "نظام پہلے ہی شروع ہو چکا ہے"
    },
    "notifier.system_restarting": {
        "es": "El sistema se está reiniciando...", "fr": "Le système redémarre...", "de": "System wird neu gestartado...", "it": "Il sistema si sta riavviando...",
        "pt": "O sistema está a reiniciar...", "ru": "Система перезагружается...", "zh": "系统正在重启...", "ja": "システムを再起動しています...",
        "ko": "시스템을 재시작하는 중입니다...", "ar": "النظام يعيد التشغيل..."
    },
    "error.missing_url": {
        "es": "Falta la URL", "fr": "URL manquante", "de": "URL fehlt", "it": "URL mancante", "pt": "URL ausente", "nl": "URL ontbreekt",
        "ru": "URL отсутствует", "zh": "缺少 URL", "ja": "URLがありません", "ko": "URL 누락", "tr": "URL eksik", "pl": "Brak adresu URL",
        "id": "URL tidak ada", "ar": "عنوان URL مفقود", "fa": "آدرس وب موجود نیست", "el": "Λείпси το URL", "hi": "URL गायब है", "bn": "URL অনুপস্থিত", "ur": "یو آر ایل غائب ہے"
    },
    "error.could_not_resolve_host": {
        "es": "No se pudo resolver el host", "fr": "Impossible de résoudre l'hôte", "de": "Host konnte nicht aufgelöst werden", "it": "Impossibile risolvere l'host", "pt": "Não foi possível resolver o host", "nl": "Kan host niet oplossen",
        "ru": "Не удалось разрешить хост", "zh": "无法解析主机", "ja": "ホストを解決できません", "ko": "호스트를 확인할 수 없습니다", "tr": "Ana bilgisayar çözülemedi", "pl": "Nie można rozpoznać hosta",
        "id": "Tidak dapat menyelesaikan host", "ar": "تعذر حل المضيف", "fa": "امکان تحلیل میزبان وجود ندارد", "el": "Αδυναμία επίλυσης κεντρικού υπολογιστή", "hi": "होस्ट को हल नहीं किया जा सका", "bn": "হোস্ট সমাধান করা যায়নি", "ur": "ہوسٹ کو حل نہیں کیا جا سکا"
    },
    "section.hide_title_hint": {
        "es": "Dejar vacío para ocultar el título.", "fr": "Laisser vide pour masquer le titre.", "de": "Leer lassen, um den Titel auszublenden.",
        "it": "Lasciare vuoto per nascondere il titolo.", "pt": "Deixe vazio para ocultar o título.", "ru": "Оставьте пустым, чтобы скрыть заголовок.",
        "zh": "留空以隐藏标题。", "ja": "タイトルを非表示にするには空のままにします。", "ko": "제목을 숨기려면 비워 두세요。", "nl": "Laat leeg om de titel te verbergen.",
        "tr": "Başlığı gizlemek için boş bırakın.", "pl": "Pozostaw puste, aby ukryć tytuł.",
        "id": "Biarkan kosong untuk menyembunyikan judul.",
        "ar": "اتركه فارغًا لإخفاء العنوان.", "fa": "برای مخفی کردن عنوان خالی بگذارید.", "el": "Αφήστε κενό για απόκρυψη τίτλου.",
        "hi": "शीर्षक छिपाने के लिए खाली छोड़ें।", "bn": "শিরোনাম লুকাতে খালি রাখুন।", "ur": "عنوان چھپانے کے لیے خالی چھوڑ دیں۔"
    },
    // --- Clock Widget ---
    "widget.clock.timezone": {
        "es": "Zona Horaria", "fr": "Fuseau horaire", "it": "Fuso orario", "pt": "Fuso horário", "de": "Zeitzone", "nl": "Tijdzone",
        "ru": "Часовой пояс", "zh": "时区", "ja": "タイムゾーン", "ko": "표준 시간대", "tr": "Saat Dilimi", "pl": "Strefa czasowa",
        "id": "Zona Waktu", "ar": "المنطقة الزمنية", "fa": "منطقه زمانی", "el": "Ζώνη ώρας", "hi": "समय क्षेत्र", "bn": "সময় অঞ্চল", "ur": "ٹائم زون"
    },
    "widget.clock.auto_detect": {
        "es": "Auto Detectar", "fr": "Détection automatique", "it": "Rilevamento automatico", "pt": "Detecção automática", "de": "Automatische Erkennung", "nl": "Automatische detectie",
        "ru": "Автоматическое определение", "zh": "自动检测", "ja": "自動検出", "ko": "자동 감지", "tr": "Otomatik Algılama", "pl": "Wykrywanie automatyczne",
        "id": "Deteksi Otomatis", "ar": "كشف تلقائي", "fa": "تشخیص خودکار", "el": "Αυτόματος εντοπισμός", "hi": "स्वतः पता लगाएँ", "bn": "স্বয়ংক্রিয় সনাক্তকরণ", "ur": "خودکار پتہ لگائیں"
    },
    "widget.clock.timezone_desc": {
        "es": "ej. America/New_York, UTC, o 'local'", "fr": "ex. America/New_York, UTC, ou 'local'", "it": "es. America/New_York, UTC, o 'local'", "pt": "ex. America/New_York, UTC, ou 'local'", "de": "z.B. America/New_York, UTC oder 'local'", "nl": "bijv. America/New_York, UTC, of 'local'",
        "ru": "например, America/New_York, UTC или 'local'", "zh": "例如 America/New_York, UTC 或 'local'", "ja": "例: America/New_York, UTC, または 'local'", "ko": "예: America/New_York, UTC 또는 'local'", "tr": "örneğin America/New_York, UTC veya 'local'", "pl": "np. America/New_York, UTC lub 'local'",
        "id": "cth. America/New_York, UTC, atau 'local'", "ar": "مثال America/New_York, UTC, أو 'local'", "fa": "مانند America/New_York, UTC, یا 'local'", "el": "π.χ. America/New_York, UTC, ή 'local'", "hi": "उदाहरण America/New_York, UTC, या 'local'", "bn": "যেমন America/New_York, UTC, বা 'local'", "ur": "مثال America/New_York, UTC, یا 'local'"
    },
    // --- Weather Widget ---
    "widget.weather.city": {
        "es": "Ciudad", "fr": "Ville", "it": "Città", "pt": "Cidade", "de": "Stadt", "nl": "Stad",
        "ru": "Город", "zh": "城市", "ja": "都市", "ko": "도시", "tr": "Şehir", "pl": "Miasto",
        "id": "Kota", "ar": "مدينة", "fa": "شهر", "el": "Πόλη", "hi": "शहर", "bn": "শহর", "ur": "شہر"
    },
    "widget.weather.city_placeholder": {
        "es": "ej. Madrid, Buenos Aires, Ciudad de México", "fr": "ex. Paris, Lyon, Marseille", "it": "es. Roma, Milano, Napoli", "pt": "ex. Lisboa, Porto, Rio de Janeiro", "de": "z.B. Berlin, München, Hamburg", "nl": "bijv. Amsterdam, Rotterdam, Utrecht",
        "ru": "например, Москва, Санкт-Петербург, Новосибирск", "zh": "例如 北京, 上海, 广州", "ja": "例: 東京, 大阪, 京都", "ko": "예: 서울, 부산, 인천", "tr": "örneğin İstanbul, Ankara, İzmir", "pl": "np. Warszawa, Kraków, Gdańsk",
        "id": "cth. Jakarta, Surabaya, Bandung", "ar": "مثال القاهرة، الرياض، دبي", "fa": "مانند تهران، مشهد، اصفهان", "el": "π.χ. Αθήνα, Θεσσαλονίκη, Πάτρα", "hi": "उदाहरण दिल्ली, मुंबई, बैंगलोर", "bn": "যেমন ঢাকা, চট্টগ্রাম, খুলনা", "ur": "مثال کراچی، لاہور، اسلام آباد"
    },
    "widget.weather.city_desc": {
        "es": "Busca una ciudad para autocompletar las coordenadas.", "fr": "Recherchez una ciudad para completar automáticamente las coordenadas.", "it": "Cerca una città per completare automaticamente le coordinate.", "pt": "Pesquise uma cidade para preencher automaticamente as coordenadas.", "de": "Suchen Sie nach einer Stadt, um die Koordinaten automatisch zu vervollständigen.", "nl": "Zoek een stad om de coördinaten automatisch aan te vullen.",
        "ru": "Найдите город, чтобы автоматически заполнить координаты.", "zh": "搜索城市以自动完成坐标。", "ja": "都市を検索して座標を自動入力します。", "ko": "도시를 검색하여 좌표를 자동 완성합니다.", "tr": "Koordinatları otomatik tamamlamak için bir şehir arayın.", "pl": "Wyszukaj miasto, aby automatycznie uzupełnić współrzędne.",
        "id": "Cari kota untuk melengkapi koordinat secara otomatis.", "ar": "ابحث عن مدينة لإكمال الإحداثيات تلقائيًا.", "fa": "برای تکمیل خودکار مختصات یک شهر جستجو کنید.", "el": "Αναζητήστε μια πόλη για αυτόματη συμπλήρωση συντεταγμένων.", "hi": "निर्देशांक स्वतः पूर्ण करने के लिए शहर खोजें।", "bn": "স্থানাঙ্ক স্বয়ংক্রিয়ভাবে পূরণ করতে একটি শহর অনুসন্ধান করুন।", "ur": "کوآرڈینیٹس خودکار مکمل کرنے کے لیے شہر تلاش کریں۔"
    },
    "widget.weather.search": {
        "es": "Buscar", "fr": "Rechercher", "it": "Cerca", "pt": "Pesquisar", "de": "Suchen", "nl": "Zoeken",
        "ru": "Поиск", "zh": "搜索", "ja": "検索", "ko": "검색", "tr": "Ara", "pl": "Szukaj",
        "id": "Cari", "ar": "بحث", "fa": "جستجو", "el": "Αναζήτηση", "hi": "खोज", "bn": "অনুসন্ধান", "ur": "تلاش کریں"
    },
    "widget.weather.results": {
        "es": "Resultados", "fr": "Résultats", "it": "Risultati", "pt": "Resultados", "de": "Ergebnisse", "nl": "Resultaten",
        "ru": "Результаты", "zh": "结果", "ja": "結果", "ko": "결과", "tr": "Sonuçlar", "pl": "Wyniki",
        "id": "Hasil", "ar": "النتائج", "fa": "نتایج", "el": "Αποτελέσματα", "hi": "परिणाम", "bn": "ফলাফল", "ur": "نتائج"
    },
    "widget.weather.coordinates": {
        "es": "Coordenadas", "fr": "Coordonnées", "it": "Coordinate", "pt": "Coordenadas", "de": "Koordinaten", "nl": "Coördinaten",
        "ru": "Координаты", "zh": "坐标", "ja": "座標", "ko": "좌표", "tr": "Koordinatlar", "pl": "Współrzędne",
        "id": "Koordinat", "ar": "الإحداثيات", "fa": "مختصات", "el": "Συντεταγμένες", "hi": "निर्देशांक", "bn": "স্থানাঙ্ক", "ur": "کوآرڈینیٹس"
    },
    "widget.weather.use_fahrenheit": {
        "es": "Usar Fahrenheit (°F)", "fr": "Utiliser Fahrenheit (°F)", "it": "Usa Fahrenheit (°F)", "pt": "Usar Fahrenheit (°F)", "de": "Fahrenheit verwenden (°F)", "nl": "Gebruik Fahrenheit (°F)",
        "ru": "Использовать Фаренгейт (°F)", "zh": "Использовать Фаренгейт (°F)", "ja": "華氏 (°F) を使用", "ko": "화씨 (°F) 사용", "tr": "Fahrenheit (°F) kullan", "pl": "Użyj Fahrenheita (°F)",
        "id": "Gunakan Fahrenheit (°F)", "ar": "استخدم فهرنهايت (°F)", "fa": "استفاده از فارنهایت (°F)", "el": "Χρήση Fahrenheit (°F)", "hi": "फारेनहाइट (°F) का उपयोग करें", "bn": "ফারেনহাইট (°F) ব্যবহার করুন", "ur": "فارن ہائیٹ (°F) استعمال کریں"
    },
    "widget.weather.show_forecast": {
        "es": "Mostrar pronóstico", "fr": "Afficher las prévisions", "it": "Mostra previsioni", "pt": "Mostrar previsão", "de": "Vorhersage anzeigen", "nl": "Voorspelling tonen",
        "ru": "Показать прогноз", "zh": "显示预报", "ja": "予報を表示", "ko": "예보 표시", "tr": "Tahmini Göster", "pl": "Pokaż prognozę",
        "id": "Tampilkan Prakiraan", "ar": "عرض التوقعات", "fa": "نمایش پیش‌بینی", "el": "Εμφάνιση πρόβλεψης", "hi": "पूर्वानुमान दिखाएं", "bn": "পূর্বাভাস দেখান", "ur": "پیشین گوئی دکھائیں"
    },
    "widget.weather.forecast_days": {
        "es": "Días de pronóstico", "fr": "Jours de prévision", "it": "Giorni de previsione", "pt": "Dias de previsão", "de": "Vorhersagetage", "nl": "Voorspellingsdagen",
        "ru": "Дни прогноза", "zh": "预报天数", "ja": "予報日数", "ko": "예보 일수", "tr": "Tahmin Günleri", "pl": "Dni prognozy",
        "id": "Hari Prakiraan", "ar": "أيام التوقعات", "fa": "روزهای پیش‌بینی", "el": "Ημέρες πρόβλεψης", "hi": "पूर्वानुमान के दिन", "bn": "পূর্বাভাস দিন", "ur": "پیشین گوئی کے دن"
    },
    "widget.weather.no_location": {
        "es": "Configura una ubicación", "fr": "Configurer un emplacement", "it": "Imposta una posizione", "pt": "Configurar uma localização", "de": "Standort einrichten", "nl": "Locatie instellen",
        "ru": "Настроить местоположение", "zh": "设置位置", "ja": "場所を設定", "ko": "위치 설정", "tr": "Konum Ayarla", "pl": "Ustaw lokalizację",
        "id": "Atur Lokasi", "ar": "تحديد الموقع", "fa": "تنظیم مکان", "el": "Ορισμός τοποθεσίας", "hi": "स्थान सेटअप करें", "bn": "অবস্থান সেটআপ করুন", "ur": "مقام سیٹ کریں"
    },
    "widget.weather.max_min": {
        "es": "Máx / Mín", "fr": "Max / Min", "it": "Max / Min", "pt": "Máx / Mín", "de": "Max / Min", "nl": "Max / Min",
        "ru": "Макс / Мин", "zh": "最高 / 最低", "ja": "最高 / 最低", "ko": "최고 / 최저", "tr": "Maks / Min", "pl": "Maks / Min",
        "id": "Maks / Min", "ar": "الأعلى / الأدنى", "fa": "حداکثر / حداقل", "el": "Μέγ / Ελάχ", "hi": "अधिकतम / न्यूनतम", "bn": "সর্বোচ্চ / সর্বনিম্ন", "ur": "زیادہ سے زیادہ / کم سے کم"
    },
    "widget.weather.sunrise": {
        "es": "Amanecer", "fr": "Lever du soleil", "it": "Alba", "pt": "Nascer do sol", "de": "Sonnenaufgang", "nl": "Zonsopgang",
        "ru": "Восход", "zh": "日出", "ja": "日の出", "ko": "일출", "tr": "Gün Doğumu", "pl": "Wschód słońca",
        "id": "Matahari Terbit", "ar": "شروق الشمس", "fa": "طلوع خورشید", "el": "Ανατολή", "hi": "सूर्योदय", "bn": "সূর্যোদয়", "ur": "سورج طلوع"
    },
    "widget.weather.sunset": {
        "es": "Atardecer", "fr": "Coucher du soleil", "it": "Tramonto", "pt": "Pôr do sol", "de": "Sonnenuntergang", "nl": "Zonsondergang",
        "ru": "Закат", "zh": "日落", "ja": "日の入り", "ko": "일몰", "tr": "Gün Batımı", "pl": "Zachód słońca",
        "id": "Matahari Terbenam", "ar": "غروب الشمس", "fa": "غروب خورشید", "el": "Δύση", "hi": "सूर्यास्त", "bn": "সূর্যাস্ত", "ur": "سورج غروب"
    },
    "widget.weather.wind": {
        "es": "Viento", "fr": "Vent", "it": "Vento", "pt": "Vento", "de": "Wind", "nl": "Wind",
        "ru": "Ветер", "zh": "风", "ja": "風", "ko": "바람", "tr": "Rüzgar", "pl": "Wiatr",
        "id": "Angin", "ar": "رياح", "fa": "باد", "el": "Άνεμος", "hi": "हवा", "bn": "বাতাস", "ur": "ہوا"
    },
    "widget.no_config": {
        "es": "No hay configuración disponible para este elemento.", "fr": "Aucune configuration disponible para cet élément.", "de": "Keine Konfiguration für dieses Element verfügbar."
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
    "auth.connection_error": {
        "es": "No se puede conectar ahora. ¿Reintentar?", "fr": "Connexion impossible pour le moment. Réessayer ?", "de": "Verbindung derzeit nicht möglich. Erneut versuchen?", "it": "Impossibile connettersi ora. Riprovare?", "pt": "Não é posible conetar agora. Tentar novamente?", "nl": "Kan nu geen verbinding maken. Opnieuw proberen?",
        "ru": "Сейчас невозможно подключиться. Попробовать снова?", "zh": "现在无法连接。重试吗？", "ja": "現在接続できません。再試行しますか？", "ko": "지금은 연결할 수 없습니다. 다시 시도할까요?", "tr": "Şu anda bağlanılamıyor. Tekrar denensin mi?", "pl": "Nie można się teraz połączyć. Spróbować ponownie?",
        "id": "Tidak dapat terhubung sekarang. Coba lagi?", "ar": "لا يمكن الاتصال الآن. هل تريد المحاولة مرة أخرى؟", "fa": "در حال حاضر امکان اتصال وجود ندارد. تلاش مجدد؟", "el": "Δεν είναι δυνατή η σύνδεση αυτή τη στιγμή. Δοκιμάστε ξανά;", "hi": "अभी कनेक्ट नहीं हो सकता। फिर से प्रयास करें?", "bn": "এখন সংযোগ করা যাচ্ছে না। আবার চেষ্টা করবেন?", "ur": "ابھی منسلک نہیں ہو سکتا۔ دوبارہ کوشش کریں؟"
    },
    "auth.invalid_credentials": {
        "es": "Eso no parece correcto", "fr": "Cela ne semble pas correct", "de": "Das sieht nicht richtig aus", "it": "Non sembra corretto", "pt": "Isso não parece correto", "nl": "Dat ziet er niet goed uit",
        "ru": "Это выглядит неправильно", "zh": "这看起来不对", "ja": "正しくないようです", "ko": "올바르지 않은 것 같습니다", "tr": "Bu doğru görünmüyor", "pl": "To nie wygląda poprawnie",
        "id": "Itu sepertinya tidak benar", "ar": "هذا لا يبدو صحيحًا", "fa": "این درست به نظر نمی‌رسد", "el": "Αυτό δεν φαίνεται σωστό", "hi": "यह सही नहीं लग रहा है", "bn": "এটি সঠিক মনে হচ্ছে না", "ur": "یہ درست نہیں لگتا"
    },
    "general.loading": {
        "es": "Cargando...", "fr": "Chargement...", "it": "Caricamento...", "pt": "Carregando...", "de": "Laden...", "nl": "Laden...",
        "ru": "Загрузка...", "zh": "加载中...", "ja": "読み込み中...", "ko": "로딩 중...", "tr": "Yükleniyor...", "pl": "Ładowanie...",
        "id": "Memuat...", "ar": "جار التحميل...", "fa": "در حال بارگذاری...", "el": "Φόρτωση...", "hi": "लोड हो रहा है...", "bn": "লোড হচ্ছে...", "ur": "لوڈ ہو رہا ہے..."
    },
    "notifier.user_deleted": {
        "es": "Usuario eliminado", "fr": "Utilisateur supprimé", "de": "Benutzer gelöscht", "it": "Utente eliminato",
        "pt": "Utilizador eliminado", "ru": "Пользователь удален", "zh": "用户已删除", "ja": "ユーザーを削除しました",
        "ko": "사용자가 삭제되었습니다", "nl": "Gebruiker verwijderd", "pl": "Użytkownik usunięty", "tr": "Kullanıcı silindi",
        "id": "Pengguna dihapus", "ar": "تم حذف المستخدم", "fa": "کاربر حذف شد", "el": "Ο χρήστης διαγράφηκε",
        "hi": "उपयोगकर्ता हटा दिया गया", "bn": "ব্যবহারকারী মুছে ফেলা হয়েছে", "ur": "صارف حذف کردیا گیا"
    },
    "notifier.user_delete_error": {
        "es": "Error al eliminar usuario", "fr": "Échec de la suppression de l'utilisateur", "de": "Fehler beim Löschen des Benutzers",
        "it": "Errore durante l'eliminazione dell'utente", "pt": "Erro ao eliminar utilizador", "nl": "Fout bij verwijderen gebruiker",
        "ru": "Ошибка при удалении пользователя", "zh": "Ошибка при удалении пользователя", "ja": "ユーザーの削除エラー", "ko": "사용자 삭제 오류",
        "tr": "Kullanıcı silinirken hata oluştu", "pl": "Błąd usuwania użytkownika", "id": "Kesalahan menghapus pengguna",
        "ar": "خطأ في حذف المستخدم", "fa": "خطا در حذف کاربر", "el": "Σφάλμα διαγραφής χρήστη",
        "hi": "उपयोगकर्ता हटाने में त्रुटि", "bn": "ব্যবহারকারী মুছতে ত্রুটি", "ur": "صارف حذف کرنے میں خرابی"
    },
    "notifier.restore_success": {
        "es": "Copia de seguridad restaurada. Recargando...", "fr": "Sauvegarde restaurée. Rechargement...", "de": "Backup wiederhergestellt. Wird neu geladen...",
        "it": "Backup ripristinato. Ricaricamento...", "pt": "Backup restaurado. Recarregando...", "nl": "Back-up hersteld. Herladen...",
        "ru": "Резервная копия восстановлена. Перезагрузка...", "zh": "备份已恢复。重新加载中...", "ja": "バックアップが復元されました。再読み込み中...",
        "ko": "백업이 복원되었습니다. 다시 로드 중...", "tr": "Yedekleme geri yüklendi. Yeniden yükleniyor...", "pl": "Kopia zapasowa przywrócona. Ponowne ładowanie...",
        "id": "Cadangan dipulihkan. Memuat ulang...", "ar": "تمت استعادة النسخة الاحتياطية. إعادة التحميل...", "fa": "پشتیبان بازیابی شد. بارگذاری مجدد...",
        "el": "Το αντίγραφο ασφαλείας αποκαταστάθηκε. Επαναφόρτωση...", "hi": "बैकअप पुनर्स्थापित किया गया। पुनः लोड हो रहा है...",
        "bn": "ব্যাকআপ পুনরুদ্ধার করা হয়েছে। পুনরায় লোড হচ্ছে...", "ur": "بیک اپ بحال ہو گیا۔ دوبارہ لوڈ ہو رہا ہے..."
    },
    "notifier.update_verified": {
        "es": "Actualización verificada. Reiniciando...", "fr": "Mise à jour vérifiée. Redémarrage...", "de": "Update verifiziert. Neustart...",
        "it": "Aggiornamento verificato. Riavvio...", "pt": "Atualização verificada. Reiniciando...", "nl": "Update geverifieerd. Opnieuw opstarten...",
        "ru": "Обновление проверено. Перезапуск...", "zh": "更新已验证。重启中...", "ja": "更新が確認されました。再起動中...",
        "ko": "업데이트가 확인되었습니다. 재시작 중...", "tr": "Güncelleme doğrulandı. Yeniden başlatılıyor...", "pl": "Aktualizacja zweryfikowana. Ponowne uruchamianie...",
        "id": "Pembaruan diverifikasi. Memulai ulang...", "ar": "تم التحقق من التحديث. إعادة التشغيل...", "fa": "به‌روزرسانی تایید شد. راه‌اندازی مجدد...",
        "el": "Η ενημέρωση επαληθεύτηκε. Επανεκκίνηση...", "hi": "अपडेट सत्यापित। पुनः आरंभ हो रहा है...",
        "bn": "আপডেট যাচাই করা হয়েছে। পুনরায় চালু হচ্ছে...", "ur": "اپ ڈیٹ تصدیق شدہ۔ دوبارہ شروع ہو رہا ہے..."
    },
    "notifier.update_failed": {
        "es": "Error en la actualización", "fr": "Échec de la mise à jour", "de": "Update fehlgeschlagen",
        "it": "Aggiornamento fallito", "pt": "Atualização falhada", "nl": "Update mislukt",
        "ru": "Ошибка обновления", "zh": "更新失败", "ja": "更新に失敗しました", "ko": "업데이트 실패",
        "tr": "Güncelleme başarısız", "pl": "Aktualizacja nie powiodła się", "id": "Pembaruan gagal",
        "ar": "فشل التحديث", "fa": "به‌روزرسانی ناموفق بود", "el": "Η ενημέρωση απέτυψε",
        "hi": "अपडेट विफल", "bn": "আপডেট ব্যর্থ", "ur": "اپ ڈیٹ ناکام"
    },
    "notifier.save_error": {
        "es": "Error al guardar los ajustes", "fr": "Échec de l'enregistrement de los parámetros", "de": "Fehler beim Speichern der Einstellungen",
        "it": "Errore nel salvataggio delle impostazioni", "pt": "Erro ao guardar as definições", "nl": "Fout bij opslaan instellingen",
        "ru": "Ошибка сохранения настроек", "zh": "保存设置时出错", "ja": "設定の保存エラー", "ko": "설정 저장 오류",
        "tr": "Ayarlar kaydedilirken hata", "pl": "Błąd zapisu ustawień", "id": "Kesalahan menyimpan pengaturan",
        "ar": "خطأ في حفظ الإعدادات", "fa": "خطا در ذخیره تنظیمات", "el": "Σφάλμα αποθήκευσης ρυθμίσεων",
        "hi": "सेटिंग सहेजने में त्रुटि", "bn": "সেটিংস সংরক্ষণে ত্রুটি", "ur": "ترتیبات محفوظ کرنے میں خرابی"
    },
    "notifier.profile_updated": {
        "es": "Perfil actualizado", "fr": "Profil mis à jour", "de": "Profil aktualisiert",
        "it": "Profilo aggiornato", "pt": "Perfil atualizado", "nl": "Profiel bijgewerkt",
        "ru": "Профиль обновлен", "zh": "个人资料已更新", "ja": "プロフィールが更新されました", "ko": "프로필 업데이트됨",
        "tr": "Profil güncellendi", "pl": "Profil zaktualizowany", "id": "Profil diperbarui",
        "ar": "تم تحديث الملف الشخصي", "fa": "نمایه به‌روز شد", "el": "Το προφίλ ενημερώθηκε",
        "hi": "प्रोफ़ाइल अपडेट की गई", "bn": "প্রোফাইল আপডেট করা হয়েছে", "ur": "پروفائل اپ ڈیٹ ہو گیا"
    },
    "notifier.profile_error": {
        "es": "Error al actualizar el perfil", "fr": "Échec de la mise à jour del perfil", "de": "Fehler beim Aktualisieren des Profils",
        "it": "Errore nell'aggiornamento del profilo", "pt": "Erro ao atualizar o perfil", "nl": "Fout bij bijwerken profiel",
        "ru": "Ошибка обновления профиля", "zh": "更新个人资料时出错", "ja": "プロフィール更新エラー", "ko": "프로필 업데이트 오류",
        "tr": "Profil güncellenirken hata", "pl": "Błąd aktualizacji profilu", "id": "Kesalahan memperbarui profil",
        "ar": "خطأ في تحديث الملف الشخصي", "fa": "خطا در به‌روزرسانی نمایه", "el": "Σφάλμα ενημέρωσης προφίλ",
        "hi": "प्रोफ़ाइल अपडेट करने में त्रुटि", "bn": "প্রোফাইল আপডেট করতে ত্রুটি", "ur": "پروفائل اپ ڈیٹ کرنے میں خرابی"
    },
    "auth.session_expired": {
        "es": "Sesión expirada", "fr": "Session expirée", "de": "Sitzung abgelaufen",
        "it": "Sessione scaduta", "pt": "Sessão expirada", "nl": "Sessie verlopen",
        "ru": "Сеанс истек", "zh": "会话已过期", "ja": "セッションが期限切れです", "ko": "세션이 만료되었습니다",
        "tr": "Oturum süresi doldu", "pl": "Sesja wygasła", "id": "Sesi kedaluwarsa",
        "ar": "انتهت صلاحية الجلسة", "fa": "نشست منقضی شده است", "el": "Η συνεδρία έχει λήξει",
        "hi": "सत्र समाप्त हो गया", "bn": "সেশন মেয়াদ শেষ", "ur": "سیشن ختم ہو گیا"
    },

    // === Additional Missing Keys ===

    "app.title": {
        "es": "Lastboard", "fr": "Lastboard", "de": "Lastboard", "it": "Lastboard", "pt": "Lastboard", "nl": "Lastboard",
        "ru": "Lastboard", "zh": "Lastboard", "ja": "Lastboard", "ko": "Lastboard", "tr": "Lastboard", "pl": "Lastboard",
        "id": "Lastboard", "ar": "Lastboard", "fa": "Lastboard", "el": "Lastboard", "hi": "Lastboard", "bn": "Lastboard", "ur": "Lastboard"
    },
    "auth.login": {
        "es": "Iniciar sesión", "fr": "Connexion", "de": "Anmelden", "it": "Accedi", "pt": "Entrar", "nl": "Inloggen",
        "ru": "Войти", "zh": "登录", "ja": "ログイン", "ko": "로그인", "tr": "Giriş", "pl": "Zaloguj",
        "id": "Masuk", "ar": "تسجيل الدخول", "fa": "ورود", "el": "Σύνδεση", "hi": "लॉग इन करें", "bn": "লগ ইন", "ur": "لاگ ان"
    },
    "auth.logout": {
        "es": "Cerrar sesión", "fr": "Déconnexion", "de": "Abmelden", "it": "Esci", "pt": "Sair", "nl": "Uitloggen",
        "ru": "Выйти", "zh": "登出", "ja": "ログアウト", "ko": "로그아웃", "tr": "Çıkış", "pl": "Wyloguj",
        "id": "Keluar", "ar": "تسجيل الخروج", "fa": "خروج", "el": "Αποσύνδεση", "hi": "लॉग आउट", "bn": "লগ আউট", "ur": "لاگ آؤٹ"
    },
    "auth.password": {
        "es": "Contraseña", "fr": "Mot de passe", "de": "Passwort", "it": "Password", "pt": "Senha", "nl": "Wachtwoord",
        "ru": "Пароль", "zh": "密码", "ja": "パスワード", "ko": "비밀번호", "tr": "Şifre", "pl": "Hasło",
        "id": "Kata sandi", "ar": "كلمة المرور", "fa": "رمز عبور", "el": "Κωδικός", "hi": "पासवर्ड", "bn": "পাসওয়ার্ড", "ur": "پاس ورڈ"
    },
    "auth.sign_in": {
        "es": "Entrar", "fr": "Se connecter", "de": "Anmelden", "it": "Accedi", "pt": "Entrar", "nl": "Aanmelden",
        "ru": "Войти", "zh": "登录", "ja": "サインイン", "ko": "로그인", "tr": "Giriş Yap", "pl": "Zaloguj się",
        "id": "Masuk", "ar": "تسجيل الدخول", "fa": "ورود", "el": "Είσοδος", "hi": "साइन इन करें", "bn": "সাইন ইন", "ur": "سائن ان کریں"
    },
    "auth.sign_out": {
        "es": "Salir", "fr": "Se déconnecter", "de": "Abmelden", "it": "Esci", "pt": "Sair", "nl": "Afmelden",
        "ru": "Выйти", "zh": "退出", "ja": "サインアウト", "ko": "로그아웃", "tr": "Çıkış Yap", "pl": "Wyloguj się",
        "id": "Keluar", "ar": "تسجيل الخروج", "fa": "خروج", "el": "Έξοδος", "hi": "साइन आउट", "bn": "সাইন আউট", "ur": "سائن آؤٹ کریں"
    },
    "auth.username": {
        "es": "Usuario", "fr": "Nom d'utilisateur", "de": "Benutzername", "it": "Nome utente", "pt": "Nome de utilizador", "nl": "Gebruikersnaam",
        "ru": "Имя пользователя", "zh": "用户名", "ja": "ユーザー名", "ko": "사용자 이름", "tr": "Kullanıcı adı", "pl": "Nazwa użytkownika",
        "id": "Nama pengguna", "ar": "اسم المستخدم", "fa": "نام کاربری", "el": "Όνομα χρήστη", "hi": "उपयोगकर्ता नाम", "bn": "ব্যবহারকারীর নাম", "ur": "صارف نام"
    },
    "bookmark.add": {
        "es": "Agregar marcador", "fr": "Ajouter un signet", "de": "Lesezeichen hinzufügen", "it": "Aggiungi segnalibro", "pt": "Adicionar favorito", "nl": "Bladwijzer toevoegen",
        "ru": "Добавить закладку", "zh": "添加书签", "ja": "ブックマークを追加", "ko": "북마크 추가", "tr": "Yer imi ekle", "pl": "Dodaj zakładkę",
        "id": "Tambah bookmark", "ar": "إضافة إشارة مرجعية", "fa": "افزودن نشانک", "el": "Προσθήκη σελιδοδείκτη", "hi": "बुकमार्क जोड़ें", "bn": "বুকমার্ক যোগ করুন", "ur": "بک مارک شامل کریں"
    },
    "bookmark.edit": {
        "es": "Editar", "fr": "Modifier", "de": "Bearbeiten", "it": "Modifica", "pt": "Editar", "nl": "Bewerken",
        "ru": "Редактировать", "zh": "编辑", "ja": "編集", "ko": "편집", "tr": "Düzenle", "pl": "Edytuj",
        "id": "Edit", "ar": "تحرير", "fa": "ویرایش", "el": "Επεξεργασία", "hi": "संपादित करें", "bn": "সম্পাদনা", "ur": "ترمیم کریں"
    },
    "bookmark.delete_confirm_message": {
        "es": "¿Estás seguro? Se eliminará para siempre.", "fr": "Êtes-vous sûr ? Ce sera supprimé définitivement.", "de": "Bist du sicher? Es wird endgültig gelöscht.", "it": "Sei sicuro? Sarà eliminato per sempre.", "pt": "Tem certeza? Será eliminado para sempre.", "nl": "Weet je het zeker? Het wordt permanent verwijderd.",
        "ru": "Вы уверены? Это будет удалено навсегда.", "zh": "你确定吗？它将被永久删除。", "ja": "本当によろしいですか？完全に削除されます。", "ko": "확실합니까? 영구적으로 삭제됩니다.", "tr": "Emin misiniz? Kalıcı olarak silinecek.", "pl": "Czy jesteś pewien? Zostanie trwale usunięte.",
        "id": "Apakah Anda yakin? Ini akan dihapus selamanya.", "ar": "هل أنت متأكد؟ سيتم حذفه نهائيًا.", "fa": "آیا مطمئن هستید؟ برای همیشه حذف خواهد شد.", "el": "Είστε σίγουροι; Θα διαγραφεί οριστικά.", "hi": "क्या आप सुनिश्चित हैं? यह हमेशा के लिए हटा दिया जाएगा।", "bn": "আপনি কি নিশ্চিত? এটি চিরতরে মুছে যাবে।", "ur": "کیا آپ کو یقین ہے؟ یہ ہمیشہ کے لیے حذف ہو جائے گا۔"
    },
    "bookmark.delete_confirm_title": {
        "es": "Eliminar elemento", "fr": "Supprimer l'élément", "de": "Element löschen", "it": "Rimuovi elemento", "pt": "Remover item", "nl": "Item verwijderen",
        "ru": "Удалить элемент", "zh": "删除项目", "ja": "アイテムを削除", "ko": "항목 삭제", "tr": "Öğeyi kaldır", "pl": "Usuń element",
        "id": "Hapus item", "ar": "حذف العنصر", "fa": "حذف مورد", "el": "Αφαίρεση στοιχείου", "hi": "आइटम हटाएं", "bn": "আইটেম সরান", "ur": "آئٹم ہٹائیں"
    },
    "bookmark.icon": {
        "es": "Icono", "fr": "Icône", "de": "Symbol", "it": "Icona", "pt": "Ícone", "nl": "Pictogram",
        "ru": "Иконка", "zh": "图标", "ja": "アイコン", "ko": "아이콘", "tr": "Simge", "pl": "Ikona",
        "id": "Ikon", "ar": "أيقونة", "fa": "نماد", "el": "Εικονίδιο", "hi": "आइकन", "bn": "আইকন", "ur": "آئیکن"
    },
    "bookmark.monitor_status": {
        "es": "Monitor en vivo (Ping)", "fr": "Moniteur en direct (Ping)", "de": "Live-Monitor (Ping)", "it": "Monitor live (Ping)", "pt": "Monitor ao vivo (Ping)", "nl": "Live monitor (Ping)",
        "ru": "Мониторинг в реальном времени (Ping)", "zh": "实时监控（Ping）", "ja": "ライブモニター（Ping）", "ko": "실시간 모니터 (Ping)", "tr": "Canlı İzleme (Ping)", "pl": "Monitor na żywo (Ping)",
        "id": "Monitor Langsung (Ping)", "ar": "مراقبة مباشرة (Ping)", "fa": "مانیتور زنده (Ping)", "el": "Ζωντανή παρακολούθηση (Ping)", "hi": "लाइव मॉनिटर (Ping)", "bn": "লাইভ মনিটর (Ping)", "ur": "لائیو مانیٹر (Ping)"
    },
    "bookmark.placeholder_label": {
        "es": "Mi Sitio Increíble", "fr": "Mon Site Génial", "de": "Meine tolle Seite", "it": "Il Mio Sito Fantastico", "pt": "Meu Site Incrível", "nl": "Mijn Geweldige Site",
        "ru": "Мой Замечательный Сайт", "zh": "我的精彩网站", "ja": "私の素晴らしいサイト", "ko": "내 멋진 사이트", "tr": "Harika Sitem", "pl": "Moja Niesamowita Strona",
        "id": "Situs Keren Saya", "ar": "موقعي الرائع", "fa": "سایت فوق‌العاده من", "el": "Η Υπέροχη Ιστοσελίδα μου", "hi": "मेरी शानदार साइट", "bn": "আমার দুর্দান্ত সাইট", "ur": "میری شاندار سائٹ"
    },
    "bookmark.placeholder_url": {
        "es": "https://ejemplo.com", "fr": "https://exemple.com", "de": "https://beispiel.com", "it": "https://esempio.com", "pt": "https://exemplo.com", "nl": "https://voorbeeld.com",
        "ru": "https://пример.com", "zh": "https://示例.com", "ja": "https://例.com", "ko": "https://예시.com", "tr": "https://örnek.com", "pl": "https://przykład.com",
        "id": "https://contoh.com", "ar": "https://مثال.com", "fa": "https://نمونه.com", "el": "https://παράδειγμα.com", "hi": "https://उदाहरण.com", "bn": "https://উদাহরণ.com", "ur": "https://مثال.com"
    },
    "bookmark.url": {
        "es": "URL", "fr": "URL", "de": "URL", "it": "URL", "pt": "URL", "nl": "URL",
        "ru": "URL", "zh": "网址", "ja": "URL", "ko": "URL", "tr": "URL", "pl": "URL",
        "id": "URL", "ar": "عنوان URL", "fa": "آدرس وب", "el": "URL", "hi": "यूआरएल", "bn": "ইউআরএল", "ur": "یو آر ایل"
    },
    "error.invalid_id": {
        "es": "Ese ID no funciona", "fr": "Cet identifiant ne fonctionne pas", "de": "Diese ID funktioniert nicht", "it": "Questo ID non funziona", "pt": "Ese ID não funciona", "nl": "Die ID werkt niet",
        "ru": "Этот ID не работает", "zh": "该 ID 无效", "ja": "そのIDは機能しません", "ko": "그 ID는 작동하지 않습니다", "tr": "Bu kimlik çalışmıyor", "pl": "Ten identyfikator nie działa",
        "id": "ID itu tidak berfungsi", "ar": "هذا المعرف لا يعمل", "fa": "آن شناسه کار نمی‌کند", "el": "Αυτό το ID δεν λειτουργεί", "hi": "वह आईडी काम नहीं करती", "bn": "ওই আইডি কাজ করছে না", "ur": "وہ آئی ڈی کام نہیں کرتی"
    },
    "error.invalid_url": {
        "es": "Esa URL no parece correcta", "fr": "Cette URL ne semble pas correcte", "de": "Diese URL sieht nicht richtig aus", "it": "Questa URL non sembra corretta", "pt": "Esa URL não parece correta", "nl": "Die URL ziet er niet goed uit",
        "ru": "Этот URL выглядит неправильно", "zh": "该 URL 看起来不对", "ja": "そのURLは正しくないようです", "ko": "그 URL은 올바르지 않은 것 같습니다", "tr": "Bu URL doğru görünmüyor", "pl": "Ten adres URL nie wygląda poprawnie",
        "id": "URL itu sepertinya tidak benar", "ar": "هذا الرابط لا يبدو صحيحًا", "fa": "آن آدرس درست به نظر نمی‌رسد", "el": "Αυτό το URL δεν φαίνεται σωστό", "hi": "वह यूआरएल सही नहीं लग रहा है", "bn": "ওই ইউআরএল সঠিক মনে হচ্ছে না", "ur": "وہ یو آر ایل درست نہیں لگتا"
    },
    "error.not_found": {
        "es": "No se puede encontrar eso", "fr": "Impossible de trouver cela", "de": "Das kann nicht gefunden werden", "it": "Impossibile trovare questo", "pt": "Não é posible encontrar isso", "nl": "Dat kan niet worden gevonden",
        "ru": "Это не удалось найти", "zh": "找不到该项", "ja": "見つかりませんでした", "ko": "찾을 수 없습니다", "tr": "Bu bulunamadı", "pl": "Nie można tego znaleźć",
        "id": "Tidak dapat ditemukan", "ar": "تعذر العثور على ذلك", "fa": "پیدا نشد", "el": "Δεν βρέθηκε", "hi": "वह नहीं मिला", "bn": "এটি খুঁজে পাওয়া যাচ্ছে না", "ur": "وہ نہیں ملا"
    },
    "error.failed_to_create": {
        "es": "No se pudo crear", "fr": "Impossible de créer", "de": "Erstellung fehlgeschlagen", "it": "Impossibile creare", "pt": "Falha ao criar", "nl": "Kon niet maken",
        "ru": "Не удалось создать", "zh": "创建失败", "ja": "作成に失敗しました", "ko": "생성 실패", "tr": "Oluşturulamadı", "pl": "Nie udało się utworzyć",
        "id": "Gagal membuat", "ar": "فشل الإنشاء", "fa": "ایجاد ناموفق بود", "el": "Αποτυχία δημιουργίας", "hi": "बनाने में विफल", "bn": "তৈরি করতে ব্যর্থ", "ur": "بنانے میں ناکام"
    },
    "error.label_required": {
        "es": "Necesitas un título", "fr": "Un titre est requis", "de": "Titel erforderlich", "it": "Serve un titolo", "pt": "É necessário um título", "nl": "Titel vereist",
        "ru": "Требуется заголовок", "zh": "需要标题", "ja": "タイトルが必要です", "ko": "제목이 필요합니다", "tr": "Başlık gerekli", "pl": "Wymagany tytuł",
        "id": "Judul diperlukan", "ar": "العنوان مطلوب", "fa": "عنوان الزامی است", "el": "Απαιτείται τίτλος", "hi": "शीर्षक आवश्यक", "bn": "শিরোনাম প্রয়োজন", "ur": "عنوان درکار ہے"
    },
    "error.password_max_length": {
        "es": "Contraseña demasiado larga (máx. 72 caracteres)", "fr": "Mot de passe trop long (max. 72 caractères)", "de": "Passwort zu lang (max. 72 Zeichen)", "it": "Password troppo lunga (max 72 caratteri)", "pt": "Senha muito longa (máx. 72 caracteres)", "nl": "Wachtwoord te lang (max. 72 tekens)",
        "ru": "Пароль слишком длинный (макс. 72 символа)", "zh": "密码太长（最多 72 个字符）", "ja": "パスワードが長すぎます（最大72文字）", "ko": "비밀번호가 너무 깁니다 (최대 72자)", "tr": "Şifre çok uzun (maks. 72 karakter)", "pl": "Hasło za długie (maks. 72 znaki)",
        "id": "Kata sandi terlalu panjang (maks. 72 karakter)", "ar": "كلمة المرور طويلة جدًا (72 حرفًا كحد أقصى)", "fa": "رمز عبور خیلی طولانی است (حداکثر 72 کاراکتر)", "el": "Ο κωδικός είναι πολύ μεγάλος (μέγ. 72 χαρακτήρες)", "hi": "पासवर्ड बहुत लंबा है (अधिकतम 72 वर्ण)", "bn": "পাসওয়ার্ড খুব বড় (সর্বোচ্চ ৭২ অক্ষর)", "ur": "پاس ورڈ بہت لمبا ہے (زیادہ سے زیادہ 72 حروف)"
    },
    "error.username_invalid_chars": {
        "es": "El usuario tiene caracteres extraños", "fr": "Le nom d'utilisateur contient des caractères bizarres", "de": "Benutzername enthält seltsame Zeichen", "it": "Il nome utente ha caratteri strani", "pt": "O nome de utilizador tem caracteres estranhos", "nl": "Gebruikersnaam heeft vreemde tekens",
        "ru": "Имя пользователя содержит странные символы", "zh": "用户名包含奇怪的字符", "ja": "ユーザー名に奇妙な文字が含まれています", "ko": "사용자 이름에 이상한 문자가 있습니다", "tr": "Kullanıcı adında garip karakterler var", "pl": "Nazwa użytkownika zawiera dziwne znaki",
        "id": "Nama pengguna memiliki karakter aneh", "ar": "اسم المستخدم يحتوي على أحرف غريبة", "fa": "نام کاربری دارای کاراکترهای عجیب است", "el": "Το όνομα χρήστη έχει παράξενους χαρακτήρες", "hi": "उपयोगकर्ता नाम में अजीब वर्ण हैं", "bn": "ব্যবহারকারীর নামে অদ্ভুত অক্ষর আছে", "ur": "صارف نام میں عجیب حروف ہیں"
    },
    "error.username_max_length": {
        "es": "Usuario demasiado largo (máx. 32 caracteres)", "fr": "Nom d'utilisateur trop long (max. 32 caractères)", "de": "Benutzername zu lang (max. 32 Zeichen)", "it": "Nome utente troppo lungo (max 32 caratteri)", "pt": "Nome de utilizador muito longo (máx. 32 caracteres)", "nl": "Gebruikersnaam te lang (max. 32 tekens)",
        "ru": "Имя пользователя слишком длинное (макс. 32 символа)", "zh": "用户名太长（最多 32 个字符）", "ja": "ユーザー名が長すぎます（最大32文字）", "ko": "사용자 이름이 너무 깁니다 (최대 32자)", "tr": "Kullanıcı adı çok uzun (maks. 32 karakter)", "pl": "Nazwa użytkownika za długa (maks. 32 znaki)",
        "id": "Nama pengguna terlalu panjang (maks. 32 karakter)", "ar": "اسم المستخدم طويل جدًا (32 حرفًا كحد أقصى)", "fa": "نام کاربری خیلی طولانی است (حداکثر 32 کاراکتر)", "el": "Το όνομα χρήστη είναι πολύ μεγάλο (μέγ. 32 χαρακτήρες)", "hi": "उपयोगकर्ता नाम बहुत लंबा है (अधिकतम 32 वर्ण)", "bn": "ব্যবহারকারীর নাম খুব বড় (সর্বোচ্চ ৩২ অক্ষর)", "ur": "صارف نام بہت لمبا ہے (زیادہ سے زیادہ 32 حروف)"
    },
    "general.no_icons": {
        "es": "No hay iconos aquí", "fr": "Pas d'icônes ici", "de": "Hier sind keine Symbole", "it": "Nessuna icona qui", "pt": "Sem ícones aqui", "nl": "Geen pictogrammen hier",
        "ru": "Здесь нет иконок", "zh": "Здесь нет иконок", "ja": "ここにアイコンはありません", "ko": "여기에 아이콘이 없습니다", "tr": "Burada simge yok", "pl": "Brak ikon tutaj",
        "id": "Tidak ada ikon di sini", "ar": "لا توجد أيقونات هنا", "fa": "اینجا نمادی وجود ندارد", "el": "Δεν υπάρχουν εικονίδια εδώ", "hi": "यहां कोई आइकन नहीं", "bn": "এখানে কোন আইকন নেই", "ur": "یہاں کوئی آئیکن نہیں"
    },
    "general.restore": {
        "es": "Restaurar", "fr": "Restaurer", "de": "Wiederherstellen", "it": "Ripristina", "pt": "Restaurar", "nl": "Herstellen",
        "ru": "Восстановить", "zh": "恢复", "ja": "復元", "ko": "복원", "tr": "Geri Yükle", "pl": "Przywróć",
        "id": "Pulihkan", "ar": "استعادة", "fa": "بازیابی", "el": "Επαναφορά", "hi": "पुनर्स्थापित करें", "bn": "পুনরুদ্ধার", "ur": "بحال کریں"
    },
    "general.search": {
        "es": "Buscar algo...", "fr": "Chercher quelque chose...", "de": "Etwas suchen...", "it": "Cerca qualcosa...", "pt": "Procurar algo...", "nl": "Iets zoeken...",
        "ru": "Найти что-нибудь...", "zh": "查找内容...", "ja": "何かを検索...", "ko": "무언가 찾기...", "tr": "Bir şey ara...", "pl": "Szukaj czegoś...",
        "id": "Cari sesuatu...", "ar": "ابحث عن شيء...", "fa": "چیزی جستجو کنید...", "el": "Αναζητήστε κάτι...", "hi": "कुछ खोजें...", "bn": "কিছু খুঁজুন...", "ur": "کچھ تلاش کریں..."
    },
    "header.preferences": {
        "es": "Configuración", "fr": "Paramètres", "de": "Einstellungen", "it": "Impostazioni", "pt": "Configurações", "nl": "Instellingen",
        "ru": "Настройки", "zh": "设置", "ja": "設定", "ko": "설정", "tr": "Ayarlar", "pl": "Ustawienia",
        "id": "Pengaturan", "ar": "الإعدادات", "fa": "تنظیمات", "el": "Ρυθμίσεις", "hi": "सेटिंग्स", "bn": "সেটিংস", "ur": "ترتیبات"
    },
    "header.view_changelog": {
        "es": "Ver novedades", "fr": "Voir las novedades", "de": "Neuerungen ansehen", "it": "Vedi novità", "pt": "Ver novidades", "nl": "Bekijk nieuwigheden",
        "ru": "Посмотреть новинки", "zh": "查看新功能", "ja": "新機能を見る", "ko": "새로운 기능 보기", "tr": "Yenilikleri gör", "pl": "Zobacz nowości",
        "id": "Lihat yang baru", "ar": "عرض الجديد", "fa": "مشاهده تازه‌ها", "el": "Δείτε τα νέα", "hi": "नया क्या है देखें", "bn": "নতুন কী দেখুন", "ur": "نیا کیا ہے دیکھیں"
    },
    "header.view_profile": {
        "es": "Mi perfil", "fr": "Mon perfil", "de": "Mein Profil", "it": "Il mio profilo", "pt": "Meu perfil", "nl": "Mijn profiel",
        "ru": "Мой профиль", "zh": "Мой профиль", "ja": "マイプロフィール", "ko": "내 프로필", "tr": "Profilim", "pl": "Mój profil",
        "id": "Profil saya", "ar": "ملفي الشخصي", "fa": "نمایه من", "el": "Το προφίλ μου", "hi": "मेरी प्रोफ़ाइल", "bn": "আমার প্রোফাইল", "ur": "میری پروفائل"
    },

    // === Notifier Messages ===
    "notifier.avatar_updated": {
        "es": "¡Te ves bien!", "fr": "Superbe !", "de": "Sieht gut aus!", "it": "Stai benissimo!", "pt": "Ficou ótimo!", "nl": "Ziet er goed uit!",
        "ru": "Отлично выглядит!", "zh": "看起来不错！", "ja": "いい感じ！", "ko": "멋지네요!", "tr": "Harika görünüyor!", "pl": "Wygląda świetnie!",
        "id": "Terlihat bagus!", "ar": "تبدو رائعًا!", "fa": "عالی به نظر می‌رسد!", "el": "Φαίνεσαι υπέροχα!", "hi": "बढ़िया लग रहे हैं!", "bn": "দারুণ দেখাচ্ছে!", "ur": "بہترین لگ رہے ہیں!"
    },
    "notifier.bookmark_added": {
        "es": "Marcador agregado", "fr": "Signet ajouté", "de": "Lesezeichen hinzugefügt", "it": "Segnalibro aggiunto", "pt": "Favorito adicionado", "nl": "Bladwijzer toegevoegd",
        "ru": "Закладка добавлена", "zh": "书签已添加", "ja": "ブックマークを追加しました", "ko": "북마크 추가됨", "tr": "Yer imi eklendi", "pl": "Zakładka dodana",
        "id": "Bookmark ditambahkan", "ar": "تمت إضافة الإشارة المرجعية", "fa": "نشانک اضافه شد", "el": "Προστέθηκε σελιδοδείκτης", "hi": "बुकमार्क जोड़ा गया", "bn": "বুকমার্ক যোগ করা হয়েছে", "ur": "بک مارک شامل کیا گیا"
    },
    "notifier.bookmark_error": {
        "es": "No se pudo guardar el marcador", "fr": "Impossible de sauvegarder el signet", "de": "Lesezeichen konnte nicht gespeichert werden", "it": "Impossibile salvare il segnalibro", "pt": "Não foi possível guardar o favorito", "nl": "Kon bladwijzer niet opslaan",
        "ru": "Не удалось сохранить закладку", "zh": "无法保存书签", "ja": "ブックマークを保存できませんでした", "ko": "북마크를 저장할 수 없습니다", "tr": "Yer imi kaydedilemedi", "pl": "Nie można zapisać zakładki",
        "id": "Tidak dapat menyimpan bookmark", "ar": "تعذر حفظ الإشارة المرجعية", "fa": "امکان ذخیره نشانک وجود ندارد", "el": "Αδυναμία αποθήκευσης σελιδοδείκτη", "hi": "बुकमार्क सहेजा नहीं जा सका", "bn": "বুকমার্ক সংরক্ষণ করা যায়নি", "ur": "بک مارک محفوظ نہیں ہو سکا"
    },
    "notifier.bookmark_updated": {
        "es": "Marcador actualizado", "fr": "Signet mis a jour", "de": "Lesezeichen aktualisiert", "it": "Segnalibro aggiornato", "pt": "Favorito atualizado", "nl": "Bladwijzer bijgewerkt",
        "ru": "Закладка обновлена", "zh": "书签已更新", "ja": "ブックマークを更新しました", "ko": "북마크 업데이트됨", "tr": "Yer imi güncellendi", "pl": "Zakładka zaktualizowana",
        "id": "Bookmark diperbarui", "ar": "تم تحديث الإشارة المرجعية", "fa": "نشانک به‌روز شد", "el": "Ο σελιδοδείκτης ενημερώθηκε", "hi": "बुकमार्क अपडेट किया गया", "bn": "বুকমার্ক আপডেট করা হয়েছে", "ur": "بک مارک اپ ڈیٹ ہوگیا"
    },
    "notifier.downloading_secure": {
        "es": "Iniciando descarga segura...", "fr": "Démarrage del téléchargement sécurisé...", "de": "Sicherer Download wird gestartet...", "it": "Avvio download sicuro...", "pt": "Iniciando download seguro...", "nl": "Veilige download starten...",
        "ru": "Начало безопасной загрузки...", "zh": "开始安全下载...", "ja": "安全なダウンロードを開始しています...", "ko": "안전한 다운로드 시작 중...", "tr": "Güvenli indirme başlatılıyor...", "pl": "Rozpoczynanie bezpiecznego pobierania...",
        "id": "Memulai unduhan aman...", "ar": "بدء التنزيل الآمن...", "fa": "شروع دانلود ایمن...", "el": "Έναρξη ασφαλούς λήψης...", "hi": "सुरक्षित डाउनलोड शुरू हो रहा है...", "bn": "নিরাপদ ডাউনলোড শুরু হচ্ছে...", "ur": "محفوظ ڈاؤن لوڈ شروع ہو رہا ہے..."
    },
    "notifier.fields_required": {
        "es": "Se necesitan tus credenciales", "fr": "Vos identifiants sont requis", "de": "Anmeldedaten erforderlich", "it": "Sono necessarie le credenziali", "pt": "Credenciais necessárias", "nl": "Inloggegevens vereist",
        "ru": "Требуются учетные данные", "zh": "Требуются учетные данные", "ja": "認証情報が必要です", "ko": "자격 증명이 필요합니다", "tr": "Kimlik bilgileri gerekli", "pl": "Wymagane dane logowania",
        "id": "Kredensial diperlukan", "ar": "مطلوب بيانات الاعتماد", "fa": "اعتبارنامه مورد نیاز است", "el": "Απαιτούνται διαπιστευτήρια", "hi": "क्रेडेंशियल आवश्यक", "bn": "শংসাপত্র প্রয়োজন", "ur": "اسناد درکار ہے"
    },
    "notifier.password_changed": {
        "es": "Contraseña actualizada", "fr": "Mot de passe mis a jour", "de": "Passwort aktualisiert", "it": "Password aggiornata", "pt": "Senha atualizada", "nl": "Wachtwoord bijgewerkt",
        "ru": "Пароль обновлен", "zh": "密码已更新", "ja": "パスワードが更新されました", "ko": "비밀번호 업데이트됨", "tr": "Şifre güncellendi", "pl": "Hasło zaktualizowane",
        "id": "Kata sandi diperbarui", "ar": "تم تحديث كلمة المرور", "fa": "رمز عبور به‌روز شد", "el": "Ο κωδικός ενημερώθηκε", "hi": "पासवर्ड अपडेट किया गया", "bn": "পাসওয়ার্ড আপডেট করা হয়েছে", "ur": "پاس ورڈ اپ ڈیٹ ہوگیا"
    },
    "notifier.password_empty": {
        "es": "No puede estar vacío", "fr": "Ne peut pas être vide", "de": "Darf nicht leer sein", "it": "Non può essere vuoto", "pt": "Não pode estar vazio", "nl": "Mag niet leeg zijn",
        "ru": "Не может быть пустым", "zh": "不能为空", "ja": "空にできません", "ko": "비워 둘 수 없습니다", "tr": "Boş olamaz", "pl": "Nie może być puste",
        "id": "Tidak boleh kosong", "ar": "لا يمكن أن يكون فارغًا", "fa": "نمی‌تواند خالی باشد", "el": "Δεν μπορεί να είναι κενό", "hi": "खाली नहीं हो सकता", "bn": "খালি থাকতে পারে না", "ur": "خالی نہیں ہو سکتا"
    },
    "notifier.password_incorrect": {
        "es": "Esa no es", "fr": "Ce n'est pas la bonne", "de": "Das ist es nicht", "it": "Non è quella giusta", "pt": "Não é essa", "nl": "Dat is het niet",
        "ru": "Это не то", "zh": "不正确", "ja": "それは違います", "ko": "그게 아닙니다", "tr": "O değil", "pl": "To nie to",
        "id": "Bukan itu", "ar": "هذه ليست صحيحة", "fa": "این درست نیست", "el": "Αυτό δεν είναι", "hi": "यह नहीं है", "bn": "এটা নয়", "ur": "یہ نہیں ہے"
    },
    "notifier.password_mismatch": {
        "es": "Las contraseñas no coinciden", "fr": "Les mots de passe no coinciden", "de": "Passwörter stimmen nicht überein", "it": "Le password non corrispondono", "pt": "As senhas não correspondem", "nl": "Wachtwoorden komen niet overeen",
        "ru": "Пароли не совпадают", "zh": "密码不匹配", "ja": "パスワードが一致しません", "ko": "비밀번호가 일치하지 않습니다", "tr": "Şifreler eşleşmiyor", "pl": "Hasła nie pasują",
        "id": "Kata sandi tidak cocok", "ar": "كلمات المرور غير متطابقة", "fa": "رمزهای عبور مطابقت ندارند", "el": "Οι κωδικοί δεν ταιριάζουν", "hi": "पासवर्ड मेल नहीं खाते", "bn": "পাসওয়ার্ড মিলছে না", "ur": "پاس ورڈ مماثل نہیں"
    },
    "notifier.password_required": {
        "es": "Se necesita tu contraseña actual", "fr": "Votre mot de passe actuel est requis", "de": "Aktuelles Passwort erforderlich", "it": "È richiesta la password attuale", "pt": "Senha atual necessária", "nl": "Huidig wachtwoord vereist",
        "ru": "Требуется текущий пароль", "zh": "Требуется текущий пароль", "ja": "現在のパスワードが必要です", "ko": "현재 비밀번호가 필요합니다", "tr": "Mevcut şifre gerekli", "pl": "Wymagane obecne hasło",
        "id": "Kata sandi saat ini diperlukan", "ar": "مطلوب كلمة المرور الحالية", "fa": "رمز عبور فعلی مورد نیاز است", "el": "Απαιτείται ο τρέχων κωδικός", "hi": "वर्तमान पासवर्ड आवश्यक", "bn": "বর্তমান পাসওয়ার্ড প্রয়োজন", "ur": "موجودہ پاس ورڈ درکار ہے"
    },
    "notifier.reset_confirm_text": {
        "es": "Escribe \"delete\" para confirmar", "fr": "Tapez \"delete\" para confirmar", "de": "Geben Sie \"delete\" ein, um zu bestätigen", "it": "Digita \"delete\" per confermare", "pt": "Digite \"delete\" para confirmar", "nl": "Typ \"delete\" om te bevestigen",
        "ru": "Введите \"delete\" для подтверждения", "zh": "输入 \"delete\" 以确认", "ja": "確認するには \"delete\" と入力してください", "ko": "확인하려면 \"delete\" 를 입력하세요", "tr": "Onaylamak için \"delete\" yazın", "pl": "Wpisz \"delete\", aby potwierdzić",
        "id": "Ketik \"delete\" untuk mengonfirmasi", "ar": "اكتب \"delete\" للتأكيد", "fa": "برای تایید \"delete\" تایپ کنید", "el": "Πληκτρολογήστε \"delete\" για επιβεβαίωση", "hi": "पुष्टि करने के लिए \"delete\" टाइप करें", "bn": "নিশ্চিত করতে \"delete\" লিখুন", "ur": "تصدیق کے لیے \"delete\" لکھیں"
    },
    "notifier.reset_error": {
        "es": "Reinicio fallido (revisa tu conexión)", "fr": "Réinitialisation échouée (vérifiez votre conexión)", "de": "Reset fehlgeschlagen (Verbindung prüfen)", "it": "Reset fallito (controlla la connessione)", "pt": "Reset falhado (verifique a conexão)", "nl": "Reset mislukt (controleer verbinding)",
        "ru": "Сброс не удался (проверьте подключение)", "zh": "重置失败（检查连接）", "ja": "リセット失敗（接続を確認してください）", "ko": "재설정 실패 (연결 확인)", "tr": "Sıfırlama başarısız (bağlantıyı kontrol edin)", "pl": "Reset nie powiódł się (sprawdź połączenie)",
        "id": "Reset gagal (periksa koneksi)", "ar": "فشلت إعادة التعيين (تحقق من الاتصال)", "fa": "بازنشانی ناموفق (اتصال را بررسی کنید)", "el": "Η επαναφορά απέτυχε (ελέγξτε τη σύνδεση)", "hi": "रीसेट विफल (कनेक्शन जांचें)", "bn": "রিসেট ব্যর্থ (সংযোগ পরীক্ষা করুন)", "ur": "ری سیٹ ناکام (کنکشن چیک کریں)"
    },
    "notifier.reset_failed": {
        "es": "El reinicio no funcionó", "fr": "La réinitialisation n'a pas fonctionné", "de": "Reset hat nicht funktioniert", "it": "Il reset non ha funzionato", "pt": "O reset não funcionou", "nl": "Reset werkte niet",
        "ru": "Сброс не сработал", "zh": "重置不起作用", "ja": "リセットが機能しませんでした", "ko": "재설정이 작동하지 않았습니다", "tr": "Sıfırlama işe yaramadı", "pl": "Reset nie zadziałał",
        "id": "Reset tidak berhasil", "ar": "لم تنجح إعادة التعيين", "fa": "بازنشانی کار نکرد", "el": "Η επαναφορά δεν λειτούργησε", "hi": "रीसेट काम नहीं किया", "bn": "রিসেট কাজ করেনি", "ur": "ری سیٹ کام نہیں کیا"
    },
    "notifier.restore_confirm": {
        "es": "ADVERTENCIA: Esto reemplazará todo. ¿Estás seguro?", "fr": "ATTENTION : Cela remplacera tout. Êtes-vous sûr ?", "de": "WARNUNG: Dies ersetzt alles. Sind Sie sicher?", "it": "AVVISO: Questo sostituirà tutto. Sei sicuro?", "pt": "AVISO: Isto substituirá tudo. Tem certeza?", "nl": "WAARSCHUWING: Dit vervangt alles. Weet u het zeker?",
        "ru": "ВНИМАНИЕ: Это заменит все. Вы уверены?", "zh": "警告：这将替换所有内容。确定吗？", "ja": "警告：これによりすべてが置き換えられます。よろしいですか？", "ko": "경고: 모든 것이 교체됩니다. 확실합니까?", "tr": "UYARI: Bu her şeyin yerine geçecek. Emin misiniz?", "pl": "OSTRZEŻENIE: To zastąpi wszystko. Czy jesteś pewien?",
        "id": "PERINGATAN: Ini akan mengganti semuanya. Apakah Anda yakin?", "ar": "تحذير: سيؤدي هذا إلى استبدال كل شيء. هل أنت متأكد؟", "fa": "هشدار: این همه چیز را جایگزین می‌کند. آیا مطمئن هستید؟", "el": "ΠΡΟΕΙΔΟΠΟΙΗΣΗ: Αυτό θα αντικαταστήσει τα πάντα. Είστε σίγουροι;", "hi": "चेतावनी: यह सब कुछ बदल देगा। क्या आप सुनिश्चित हैं?", "bn": "সতর্কতা: এটি সবকিছু প্রতিস্থাপন করবে। আপনি কি নিশ্চিত?", "ur": "انتباہ: یہ سب کچھ تبدیل کر دے گا۔ کیا آپ کو یقین ہے؟"
    },
    "notifier.restore_failed": {
        "es": "La restauración no funcionó", "fr": "La restauration n'a pas funcionado", "de": "Wiederherstellung hat nicht funktioniert", "it": "Il ripristino non ha funzionato", "pt": "A restauração não funcionou", "nl": "Herstel werkte niet",
        "ru": "Восстановление не сработало", "zh": "恢复不起作用", "ja": "復元が機能しませんでした", "ko": "복원이 작동하지 않았습니다", "tr": "Geri yükleme işe yaramadı", "pl": "Przywracanie nie zadziałało",
        "id": "Pemulihan tidak berhasil", "ar": "لم تنجح الاستعادة", "fa": "بازیابی کار نکرد", "el": "Η επαναφορά δεν λειτούργησε", "hi": "पुनर्स्थापना काम नहीं की", "bn": "পুনরুদ্ধার কাজ করেনি", "ur": "بحالی کام نہیں کی"
    },
    "notifier.update_downloading": {
        "es": "Descargando actualización...", "fr": "Téléchargement de la mise à jour...", "de": "Update wird heruntergeladen...", "it": "Download aggiornamento...", "pt": "Baixando atualização...", "nl": "Update downloaden...",
        "ru": "Загрузка обновления...", "zh": "下载更新中...", "ja": "更新をダウンロードしています...", "ko": "업데이트 다운로드 중...", "tr": "Güncelleme indiriliyor...", "pl": "Pobieranie aktualizacji...",
        "id": "Mengunduh pembaruan...", "ar": "جاري تنزيل التحديث...", "fa": "در حال دانلود به‌روزرسانی...", "el": "Λήψη ενημέρωσης...", "hi": "अपडेट डाउनलोड हो रहा है...", "bn": "আপডেট ডাউনলোড হচ্ছে...", "ur": "اپ ڈیٹ ڈاؤن لوڈ ہو رہی ہے..."
    },
    "notifier.update_error": {
        "es": "Error al descargar la actualización", "fr": "Échec del téléchargement de la mise à jour", "de": "Update-Download fehlgeschlagen", "it": "Download aggiornamento fallito", "pt": "Falha no download da atualização", "nl": "Update-download mislukt",
        "ru": "Ошибка загрузки обновления", "zh": "更新下载失败", "ja": "更新のダウンロードに失敗しました", "ko": "업데이트 다운로드 실패", "tr": "Güncelleme indirme başarısız", "pl": "Pobieranie aktualizacji nie powiodło się",
        "id": "Gagal mengunduh pembaruan", "ar": "فشل تنزيل التحديث", "fa": "دانلود به‌روزرسانی ناموفق بود", "el": "Αποτυχία λήψης ενημέρωσης", "hi": "अपडेट डाउनलोड विफल", "bn": "আপডেট ডাউনলোড ব্যর্থ", "ur": "اپ ڈیٹ ڈاؤن لوڈ ناکام"
    },
    "notifier.update_start_confirm": {
        "es": "¿Listo para actualizar? Vamos a reiniciar.", "fr": "Prêt à mettre à jour ? On va redémarrer.", "de": "Bereit zum Aktualisieren? Wir starten neu.", "it": "Pronto ad aggiornare? Riavvieremo.", "pt": "Pronto para atualizar? Vamos reiniciar.", "nl": "Klaar om bij te werken? We gaan opnieuw opstarten.",
        "ru": "Готовы к обновлению? Мы перезапустимся.", "zh": "准备好更新了吗？我们将重新启动。", "ja": "更新の準備はできましたか？再起動します。", "ko": "업데이트할 준비가 되셨습니까? 재시작합니다.", "tr": "Güncellemeye hazır mısınız? Yeniden başlatacağız.", "pl": "Gotowy do aktualizacji? Uruchomimy ponownie.",
        "id": "Siap memperbarui? Kami akan restart.", "ar": "هل أنت مستعد للتحديث؟ سنقوم بإعادة التشغيل.", "fa": "آماده به‌روزرسانی هستید؟ راه‌اندازی مجدد می‌کنیم.", "el": "Έτοιμοι για ενημέρωση; Θα κάνουμε επανεκκίνηση.", "hi": "अपडेट के लिए तैयार? हम पुनः आरंभ करेंगे।", "bn": "আপডেট করার জন্য প্রস্তুত? আমরা পুনরায় চালু করব।", "ur": "اپ ڈیٹ کے لیے تیار ہیں؟ ہم دوبارہ شروع کریں گے۔"
    },
    "notifier.user_create_error": {
        "es": "No se pudo crear ese usuario", "fr": "No se pudo crear ese usuario", "de": "Benutzer konnte nicht erstellt werden", "it": "Impossibile creare quell'utente", "pt": "Não foi possível criar esse utilizador", "nl": "Kon die gebruiker niet maken",
        "ru": "Не удалось создать пользователя", "zh": "无法创建该用户", "ja": "そのユーザーを作成できませんでした", "ko": "해당 사용자를 만들 수 없습니다", "tr": "Bu kullanıcı oluşturulamadı", "pl": "Nie można utworzyć tego użytkownika",
        "id": "Tidak dapat membuat pengguna itu", "ar": "تعذر إنشاء هذا المستخدم", "fa": "امکان ایجاد آن کاربر وجود ندارد", "el": "Αδυναμία δημιουργίας αυτού του χρήστη", "hi": "वह उपयोगकर्ता नहीं बनाया जा सका", "bn": "সেই ব্যবহারকারী তৈরি করা যায়নি", "ur": "وہ صارف نہیں بنایا جا سکا"
    },
    "notifier.user_created": {
        "es": "Usuario agregado", "fr": "Utilisateur ajouté", "de": "Benutzer hinzugefügt", "it": "Utente aggiunto", "pt": "Utilizador adicionado", "nl": "Gebruiker toegevoegd",
        "ru": "Пользователь добавлен", "zh": "Пользователь добавлен", "ja": "ユーザーを追加しました", "ko": "사용자 추가됨", "tr": "Kullanıcı eklendi", "pl": "Użytkownik dodany",
        "id": "Pengguna ditambahkan", "ar": "تمت إضافة المستخدم", "fa": "کاربر اضافه شد", "el": "Προστέθηκε χρήστης", "hi": "उपयोगकर्ता जोड़ा गया", "bn": "ব্যবহারকারী যোগ করা হয়েছে", "ur": "صارف شامل کیا گیا"
    },
    "notifier.user_delete_confirm": {
        "es": "¿Eliminar este usuario de verdad?", "fr": "Supprimer este usuario de verdad?", "de": "Diesen Benutzer wirklich löschen?", "it": "Eliminare davvero questo utente?", "pt": "Eliminar mesmo este utilizador?", "nl": "Deze gebruiker echt verwijderen?",
        "ru": "Действительно удалить этого пользователя?", "zh": "真的要删除此用户吗？", "ja": "本当にこのユーザーを削除しますか？", "ko": "정말로 이 사용자를 삭제하시겠습니까?", "tr": "Bu kullanıcıyı gerçekten silmek istiyor musunuz?", "pl": "Czy na pewno usunąć tego użytkownika?",
        "id": "Benar-benar hapus pengguna ini?", "ar": "هل تريد حذف هذا المستخدم حقًا؟", "fa": "واقعاً این کاربر را حذف کنید؟", "el": "Πραγματικά να διαγραφεί αυτός ο χρήστης;", "hi": "वाकई इस उपयोगकर्ता को हटाएं?", "bn": "সত্যিই এই ব্যবহারকারী মুছবেন?", "ur": "واقعی میں اس صارف کو حذف کریں؟"
    },
    "notifier.user_update_error": {
        "es": "No se pudo actualizar el usuario", "fr": "No se pudo actualizar el usuario", "de": "Benutzer konnte nicht aktualisiert werden", "it": "Impossibile aggiornare l'utente", "pt": "Não foi possível atualizar o utilizador", "nl": "Kon gebruiker niet bijwerken",
        "ru": "Не удалось обновить пользователя", "zh": "无法更新用户", "ja": "ユーザーを更新できませんでした", "ko": "사용자를 업데이트할 수 없습니다", "tr": "Kullanıcı güncellenemedi", "pl": "Nie można zaktualizować użytkownika",
        "id": "Tidak dapat memperbarui pengguna", "ar": "تعذر تحديث المستخدم", "fa": "امکان به‌روزرسانی کاربر وجود ندارد", "el": "Αδυναμία ενημέρωσης χρήστη", "hi": "उपयोगकर्ता अपडेट नहीं किया जा सका", "bn": "ব্যবহারকারী আপডেট করা যায়নি", "ur": "صارف کو اپ ڈیٹ نہیں کیا جا سکا"
    },
    "notifier.user_updated": {
        "es": "Usuario actualizado", "fr": "Usuario actualizado", "de": "Benutzer aktualisiert", "it": "Utente aggiornato", "pt": "Utilizador atualizado", "nl": "Gebruiker bijgewerkt",
        "ru": "Пользователь обновлен", "zh": "用户已更新", "ja": "ユーザーが更新されました", "ko": "사용자 업데이트됨", "tr": "Kullanıcı güncellendi", "pl": "Użytkownik zaktualizowany",
        "id": "Pengguna diperbarui", "ar": "تم تحديث المستخدم", "fa": "کاربر به‌روز شد", "el": "Ο χρήστης ενημερώθηκε", "hi": "उपयोगकर्ता अपडेट किया गया", "bn": "ব্যবহারকারী আপডেট করা হয়েছে", "ur": "صارف اپ ڈیٹ ہو گیا"
    },
    "notifier.username_updated": {
        "es": "Nombre de usuario cambiado", "fr": "Nombre de usuario cambiado", "de": "Benutzername geändert", "it": "Nome utente cambiato", "pt": "Nome de utilizador alterado", "nl": "Gebruikersnaam gewijzigd",
        "ru": "Имя пользователя изменено", "zh": "用户名已更改", "ja": "ユーザー名が変更されました", "ko": "사용자 이름 변경됨", "tr": "Kullanıcı adı değiştirildi", "pl": "Nazwa użytkownika zmieniona",
        "id": "Nama pengguna diubah", "ar": "تم تغيير اسم المستخدم", "fa": "نام کاربری تغییر کرد", "el": "Το όνομα χρήστη άλλαξε", "hi": "उपयोगकर्ता नाम बदल गया", "bn": "ব্যবহারকারীর নাম পরিবর্তিত", "ur": "صارف نام تبدیل ہو گیا"
    },

    // === Section Keys ===
    "section.add": {
        "es": "Agregar sección", "fr": "Ajouter une section", "de": "Abschnitt hinzufügen", "it": "Aggiungi sezione", "pt": "Adicionar seção", "nl": "Sectie toevoegen",
        "ru": "Добавить раздел", "zh": "添加部分", "ja": "セクションを追加", "ko": "섹션 추가", "tr": "Bölüm ekle", "pl": "Dodaj sekcję",
        "id": "Tambah bagian", "ar": "إضافة قسم", "fa": "افزودن بخش", "el": "Προσθήκη ενότητας", "hi": "अनुभाग जोड़ें", "bn": "বিভাগ যোগ করুন", "ur": "سیکشن شامل کریں"
    },
    "section.delete_confirm_message": {
        "es": "¿Eliminar esta sección y todo su contenido?", "fr": "Supprimer cette section et tout son contenu ?", "de": "Diesen Abschnitt und seinen gesamten Inhalt löschen?", "it": "Eliminare questa sezione e tutto il suo contenuto?", "pt": "Eliminar esta seção e todo o seu conteúdo?", "nl": "Deze sectie en alle inhoud verwijderen?",
        "ru": "Удалить этот раздел и всё его содержимое?", "zh": "删除此部分及其所有内容？", "ja": "このセクションとそのすべての内容を削除しますか？", "ko": "이 섹션과 모든 내용을 삭제하시겠습니까?", "tr": "Bu bölümü ve tüm içeriğini silmek istiyor musunuz?", "pl": "Usunąć tę sekcję i całą jej zawartość?",
        "id": "Hapus bagian ini dan semua isinya?", "ar": "هل تريد حذف هذا القسم وجميع محتوياته؟", "fa": "این بخش و تمامی محتوای آن حذف شود؟", "el": "Διαγραφή αυτής της ενότητας και όλου του περιεχομένου της;", "hi": "इस अनुभाग और इसकी सभी सामग्री को हटाएं?", "bn": "এই বিভাগ এবং এর সমস্ত বিষয়বস্তু মুছুন?", "ur": "اس سیکشن اور اس کے تمام مواد کو حذف کریں؟"
    },

    // === Settings Keys ===
    "settings.adaptive_msg": {
        "es": "> La aceleración de hardware adaptable está activada.", "fr": "> L'accélération matérielle adaptive est activée.", "de": "> Adaptive Hardware-Beschleunigung ist aktiviert.", "it": "> L'accelerazione hardware adattiva è attiva.", "pt": "> A aceleração de hardware adaptativa está ativada.", "nl": "> Adaptieve hardwareversnelling is ingeschakeld.",
        "id": "> Akselerasi perangkat keras adaptif diaktifkan.", "ar": "> التسريع الأجهزة التكيفي نشط.", "fa": "> شتاب سخت‌افزاری تطبیقی فعال است.", "el": "> Η προσαρμοστική επιτάχυνση υλικού είναι ενεργή.", "hi": "> अनुकूली हार्डवेयर त्वरण सक्रिय है।", "bn": "> অভিযোজক হার্ডওয়্যার ত্বরণ সক্রিয়।", "ur": "> موافقت پذیر ہارڈ ویئر سرعت فعال ہے۔"
    },
    "settings.admin": {
        "es": "Administración", "fr": "Administration", "de": "Verwaltung", "it": "Amministrazione", "pt": "Administração", "nl": "Beheer",
        "ru": "Администрирование", "zh": "管理", "ja": "管理", "ko": "관리", "tr": "Yönetim", "pl": "Administracja",
        "id": "Administrasi", "ar": "الإدارة", "fa": "مدیریت", "el": "Διαχείριση", "hi": "प्रशासन", "bn": "প্রশাসন", "ur": "انتظامیہ"
    },
    "settings.admin_section": {
        "es": "Control de acceso", "fr": "Contrôle d'accès", "de": "Zugangskontrolle", "it": "Controllo accessi", "pt": "Controle de acesso", "nl": "Toegangscontrole",
        "ru": "Контроль доступа", "zh": "访问控制", "ja": "アクセス制御", "ko": "액세스 제어", "tr": "Erişim Kontrolü", "pl": "Kontrola dostępu",
        "id": "Kontrol Akses", "ar": "التحكم في الوصول", "fa": "کنترل دسترسی", "el": "Έλεγχος πρόσβασης", "hi": "पहुंच नियंत्रण", "bn": "প্রবেশ নিয়ন্ত্রণ", "ur": "رسائی کنٹرول"
    },
    "settings.advanced": {
        "es": "Usuario avanzado", "fr": "Utilisateur avancé", "de": "Power-User", "it": "Utente avanzato", "pt": "Utilizador avançado", "nl": "Geavanceerde gebruiker",
        "ru": "Продвинутый пользователь", "zh": "高级用户", "ja": "パワーユーザー", "ko": "고급 사용자", "tr": "İleri Kullanıcı", "pl": "Użytkownik zaawansowany",
        "id": "Pengguna Lanjutan", "ar": "مستخدم متقدم", "fa": "کاربر پیشرفته", "el": "Προχωρημένος χρήστης", "hi": "उन्नत उपयोगकर्ता", "bn": "উন্নত ব্যবহারকারী", "ur": "جدید صارف"
    },
    "settings.appearance": {
        "es": "Aspecto", "fr": "Apparence", "de": "Erscheinungsbild", "it": "Aspetto", "pt": "Aparência", "nl": "Uiterlijk",
        "ru": "Внешний вид", "zh": "外观", "ja": "外観", "ko": "외관", "tr": "Görünüm", "pl": "Wygląd",
        "id": "Tampilan", "ar": "المظهر", "fa": "ظاهر", "el": "Εμφάνιση", "hi": "रूप", "bn": "চেহারা", "ur": "ظاہری شکل"
    },
    "settings.checking_updates": {
        "es": "Buscando actualizaciones...", "fr": "Recherche de mises à jour...", "de": "Nach Updates suchen...", "it": "Ricerca aggiornamenti...", "pt": "Verificando atualizações...", "nl": "Controleren op updates...",
        "ru": "Проверка обновлений...", "zh": "检查更新中...", "ja": "更新を確認しています...", "ko": "업데이트 확인 중...", "tr": "Güncellemeler kontrol ediliyor...", "pl": "Sprawdzanie aktualizacji...",
        "id": "Memeriksa pembaruan...", "ar": "جاري البحث عن التحديثات...", "fa": "بررسی به‌روزرسانی‌ها...", "el": "Έλεγχος ενημερώσεων...", "hi": "अपडेट जांच रहा है...", "bn": "আপডেট পরীক্ষা করা হচ্ছে...", "ur": "اپ ڈیٹس چیک ہو رہی ہیں..."
    },
    "settings.confirm_password": {
        "es": "Confirmar contraseña", "fr": "Confirmer le mot de passe", "de": "Passwort bestätigen", "it": "Conferma password", "pt": "Confirmar senha", "nl": "Wachtwoord bevestigen",
        "ru": "Подтвердите пароль", "zh": "确认密码", "ja": "パスワードを確認", "ko": "비밀번호 확인", "tr": "Şifreyi Onayla", "pl": "Potwierdź hasło",
        "id": "Konfirmasi kata sandi", "ar": "تأكيد كلمة المرور", "fa": "تایید رمز عبور", "el": "Επιβεβαίωση κωδικού", "hi": "पासवर्ड की पुष्टि करें", "bn": "পাসওয়ার্ড নিশ্চিত করুন", "ur": "پاس ورڈ کی تصدیق کریں"
    },
    "settings.confirm_reset_msg": {
        "es": "Es hora del gran botón rojo. <b>Todo</b> se va.", "fr": "C'est l'heure du gros bouton rouge. <b>Tout</b> s'en va.", "de": "Zeit für den großen roten Knopf. <b>Alles</b> wird weg sein.", "it": "È ora del grande pulsante rosso. <b>Tutto</b> sparirà.", "pt": "É hora do grande botão vermelho. <b>Tudo</b> vai embora.", "nl": "Tijd voor de grote rode knop. <b>Alles</b> gaat weg.",
        "ru": "Время большой красной кнопки. <b>Все</b> исчезнет.", "zh": "是时候按大红色按钮了。<b>一切</b>都将消失。", "ja": "大きな赤いボタンの時間です。<b>すべて</b>がなくなります。", "ko": "큰 빨간 버튼 시간입니다. <b>모든 것</b>이 사라집니다.", "tr": "Büyük kırmızı düğme zamanı. <b>Her şey</b> gidecek.", "pl": "Czas na wielki czerwony przycisk. <b>Wszystko</b> zniknie.",
        "id": "Waktu tombol merah besar. <b>Semuanya</b> akan hilang.", "ar": "حان وقت الزر الأحمر الكبير. <b>كل شيء</b> سيختفي.", "fa": "وقت دکمه قرمز بزرگ. <b>همه چیز</b> می‌رود.", "el": "Ώρα για το μεγάλο κόκκινο κουμπί. <b>Όλα</b> θα χαθούν.", "hi": "बड़े लाल बटन का समय। <b>सब कुछ</b> चला जाएगा।", "bn": "বড় লাল বোতামের সময়। <b>সবকিছু</b> চলে যাবে।", "ur": "بڑے سرخ بٹن کا وقت۔ <b>سب کچھ</b> چلا جائے گا۔"
    },
    "settings.confirm_reset_title": {
        "es": "¿Reinicio de fábrica?", "fr": "Réinitialisation d'usine ?", "de": "Werksreset?", "it": "Ripristino di fabbrica?", "pt": "Redefinição de fábrica?", "nl": "Fabrieksinstellingen herstellen?",
        "ru": "Сброс к заводским настройкам?", "zh": "恢复出厂设置？", "ja": "工場出荷時設定にリセットしますか？", "ko": "공장 초기화?", "tr": "Fabrika Ayarlarına Sıfırla?", "pl": "Reset do ustawień fabrycznych?",
        "id": "Reset Pabrik?", "ar": "إعادة التعيين إلى إعدادات المصنع؟", "fa": "بازنشانی کارخانه؟", "el": "Επαναφορά εργοστασιακών ρυθμίσεων;", "hi": "फैक्ट्री रीसेट?", "bn": "ফ্যাক্টরি রিসেট?", "ur": "فیکٹری ری سیٹ؟"
    },
    "settings.current_password": {
        "es": "Contraseña actual", "fr": "Mot de passe actuel", "de": "Aktuelles Passwort", "it": "Password attuale", "pt": "Senha atual", "nl": "Huidig wachtwoord",
        "ru": "Текущий пароль", "zh": "当前密码", "ja": "現在のパスワード", "ko": "현재 비밀번호", "tr": "Mevcut Şifre", "pl": "Obecne hasło",
        "id": "Kata sandi saat ini", "ar": "كلمة المرور الحالية", "fa": "رمز عبور فعلی", "el": "Τρέχων κωδικός", "hi": "वर्तमान पासवर्ड", "bn": "বর্তমান পাসওয়ার্ড", "ur": "موجودہ پاس ورڈ"
    },
    "settings.danger_zone": {
        "es": "Zona peligrosa", "fr": "Zone dangereuse", "de": "Gefahrenzone", "it": "Zona pericolosa", "pt": "Zona de perigo", "nl": "Gevarenzone",
        "ru": "Опасная зона", "zh": "危险区域", "ja": "危険ゾーン", "ko": "위험 구역", "tr": "Tehlike Bölgesi", "pl": "Strefa niebezpieczna",
        "id": "Zona Bahaya", "ar": "منطقة الخطر", "fa": "منطقه خطر", "el": "Ζώνη κινδύνου", "hi": "खतरे का क्षेत्र", "bn": "বিপদ অঞ্চল", "ur": "خطرے کا علاقہ"
    },
    "settings.dark": {
        "es": "Oscuro", "fr": "Sombre", "de": "Dunkel", "it": "Scuro", "pt": "Escuro", "nl": "Donker",
        "ru": "Темная", "zh": "深色", "ja": "ダーク", "ko": "다크", "tr": "Koyu", "pl": "Ciemny",
        "id": "Gelap", "ar": "داكن", "fa": "تیره", "el": "Σκούρο", "hi": "डार्क", "bn": "ডার্ক", "ur": "ڈارک"
    },
    "settings.default_module_desc": {
        "es": "Configuraciones principales.", "fr": "Paramètres principaux.", "de": "Haupteinstellungen.", "it": "Impostazioni principali.", "pt": "Configurações principais.", "nl": "Hoofdinstellingen.",
        "ru": "Основные настройки.", "zh": "主要设置。", "ja": "メイン設定。", "ko": "주요 설정.", "tr": "Ana ayarlar.", "pl": "Główne ustawienia.",
        "id": "Pengaturan utama.", "ar": "الإعدادات الرئيسية.", "fa": "تنظیمات اصلی.", "el": "Κύριες ρυθμίσεις.", "hi": "मुख्य सेटिंग्स।", "bn": "প্রধান সেটিংস।", "ur": "اہم ترتیبات۔"
    },
    "settings.default_role": {
        "es": "Gerente", "fr": "Gestionnaire", "de": "Manager", "it": "Manager", "pt": "Gerente", "nl": "Beheerder",
        "ru": "Менеджер", "zh": "管理员", "ja": "マネージャー", "ko": "관리자", "tr": "Yönetici", "pl": "Menedżer",
        "id": "Manajer", "ar": "مدير", "fa": "مدیر", "el": "Διαχειριστής", "hi": "प्रबंधक", "bn": "ম্যানেজার", "ur": "منیجر"
    },
    "settings.default_user": {
        "es": "Miembro", "fr": "Membre", "de": "Mitglied", "it": "Membro", "pt": "Membro", "nl": "Lid",
        "ru": "Участник", "zh": "成员", "ja": "メンバー", "ko": "회원", "tr": "Üye", "pl": "Członek",
        "id": "Anggota", "ar": "عضو", "fa": "عضو", "el": "Μέλος", "hi": "सदस्य", "bn": "সদস্য", "ur": "رکن"
    },
    "settings.display_username": {
        "es": "Mostrar nombre de usuario", "fr": "Afficher le nom d'utilisateur", "de": "Benutzernamen anzeigen", "it": "Mostra nome utente", "pt": "Mostrar nome de utilizador", "nl": "Gebruikersnaam weergeven",
        "ru": "Показать имя пользователя", "zh": "显示用户名", "ja": "ユーザー名を表示", "ko": "사용자 이름 표시", "tr": "Kullanıcı adını göster", "pl": "Pokaż nazwę użytkownika",
        "id": "Tampilkan nama pengguna", "ar": "عرض اسم المستخدم", "fa": "نمایش نام کاربری", "el": "Εμφάνιση ονόματος χρήστη", "hi": "उपयोगकर्ता नाम दिखाएं", "bn": "ব্যবহারকারীর নাম দেখান", "ur": "صارف نام دکھائیں"
    },
    "settings.docker_desc": {
        "es": "Gestionado por Docker.", "fr": "Géré par Docker.", "de": "Von Docker verwaltet.", "it": "Gestito da Docker.", "pt": "Gerido pelo Docker.", "nl": "Beheerd door Docker.",
        "ru": "Управляется Docker.", "zh": "由 Docker 管理。", "ja": "Docker によって管理されています。", "ko": "Docker에서 관리합니다.", "tr": "Docker tarafından yönetilir.", "pl": "Zarządzane przez Docker.",
        "id": "Dikelola oleh Docker.", "ar": "مُدار بواسطة Docker.", "fa": "توسط Docker مدیریت می‌شود.", "el": "Διαχειρίζεται από Docker.", "hi": "Docker द्वारा प्रबंधित।", "bn": "Docker দ্বারা পরিচালিত।", "ur": "Docker کے ذریعے منظم۔"
    },
    "settings.docker_mode": {
        "es": "Modo Docker", "fr": "Mode Docker", "de": "Docker-Modus", "it": "Modalità Docker", "pt": "Modo Docker", "nl": "Docker-modus",
        "ru": "Режим Docker", "zh": "Docker 模式", "ja": "Docker モード", "ko": "Docker 모드", "tr": "Docker Modu", "pl": "Tryb Docker",
        "id": "Mode Docker", "ar": "وضع Docker", "fa": "حالت Docker", "el": "Λειτουργία Docker", "hi": "Docker मोड", "bn": "Docker মোড", "ur": "Docker موڈ"
    },
    "settings.export_db": {
        "es": "Copias de seguridad", "fr": "Données de sauvegarde", "de": "Backup-Daten", "it": "Dati di backup", "pt": "Dados de cópia de segurança", "nl": "Back-upgegevens",
        "ru": "Резервные данные", "zh": "备份数据", "ja": "バックアップデータ", "ko": "백업 데이터", "tr": "Yedek Veri", "pl": "Dane kopii zapasowej",
        "id": "Data Cadangan", "ar": "بيانات النسخ الاحتياطي", "fa": "داده‌های پشتیبان", "el": "Δεδομένα αντιγράφων ασφαλείας", "hi": "बैकअप डेटा", "bn": "ব্যাকআপ ডেটা", "ur": "بیک اپ ڈیٹا"
    },
    "settings.export_desc": {
        "es": "Guarda una copia de todo tu panel.", "fr": "Sauvegardez une copie de tout votre tableau de bord.", "de": "Speichern Sie eine Kopie Ihres gesamten Dashboards.", "it": "Salva una copia di tutta la tua dashboard.", "pt": "Guarde uma cópia de todo o seu painel.", "nl": "Sla een kopie van uw hele dashboard op.",
        "ru": "Сохраните копию всей панели управления.", "zh": "保存整个仪表板的副本。", "ja": "ダッシュボード全体のコピーを保存します。", "ko": "전체 대시보드 사본을 저장합니다.", "tr": "Kontrol panelinizin tamamının bir kopyasını kaydedin.", "pl": "Zapisz kopię całego pulpitu nawigacyjnego.",
        "id": "Simpan salinan seluruh dasbor Anda.", "ar": "احفظ نسخة من لوحة التحكم بأكملها.", "fa": "یک کپی از کل داشبورد خود ذخیره کنید.", "el": "Αποθηκεύστε ένα αντίγραφο ολόκληρου του πίνακα ελέγχου σας.", "hi": "अपने पूरे डैशबोर्ड की एक प्रति सहेजें।", "bn": "আপনার সম্পূর্ণ ড্যাশবোর্ডের একটি অনুলিপি সংরক্ষণ করুন।", "ur": "اپنے پورے ڈیش بورڈ کی ایک کاپی محفوظ کریں۔"
    },
    "settings.factory_reset": {
        "es": "Borrar todo", "fr": "Tout effacer", "de": "Alles löschen", "it": "Cancella tutto", "pt": "Apagar tudo", "nl": "Alles wissen",
        "ru": "Стереть все", "zh": "擦除所有内容", "ja": "すべて消去", "ko": "모두 지우기", "tr": "Her Şeyi Sil", "pl": "Wymaż wszystko",
        "id": "Hapus Semua", "ar": "مسح كل شيء", "fa": "پاک کردن همه", "el": "Διαγραφή όλων", "hi": "सब कुछ मिटाएं", "bn": "সব মুছে ফেলুন", "ur": "سب کچھ مٹائیں"
    },
    "settings.github": {
        "es": "Código fuente", "fr": "Code source", "de": "Quellcode", "it": "Codice sorgente", "pt": "Código fonte", "nl": "Broncode",
        "ru": "Исходный код", "zh": "源代码", "ja": "ソースコード", "ko": "소스 코드", "tr": "Kaynak Kodu", "pl": "Kod źródłowy",
        "id": "Kode Sumber", "ar": "كود المصدر", "fa": "کد منبع", "el": "Πηγαίος κώδικας", "hi": "स्रोत कोड", "bn": "উৎস কোড", "ur": "سورس کوڈ"
    },
    "settings.grid_mobile": {
        "es": "Diseño móvil", "fr": "Disposition mobile", "de": "Mobiles Layout", "it": "Layout mobile", "pt": "Layout móvel", "nl": "Mobiele lay-out",
        "ru": "Мобильный макет", "zh": "移动布局", "ja": "モバイルレイアウト", "ko": "모바일 레이아웃", "tr": "Mobil Düzen", "pl": "Układ mobilny",
        "id": "Tata Letak Seluler", "ar": "تخطيط الجوال", "fa": "طرح‌بندی موبایل", "el": "Διάταξη κινητού", "hi": "मोबाइल लेआउट", "bn": "মোবাইল লেআউট", "ur": "موبائل لے آؤٹ"
    },
    "settings.grid_pc": {
        "es": "Diseño de escritorio", "fr": "Disposition bureau", "de": "Desktop-Layout", "it": "Layout desktop", "pt": "Layout de desktop", "nl": "Desktopindeling",
        "ru": "Макет рабочего стола", "zh": "桌面布局", "ja": "デスクトップレイアウト", "ko": "데스크톱 레이아웃", "tr": "Masaüstü Düzeni", "pl": "Układ pulpitu",
        "id": "Tata Letak Desktop", "ar": "تخطيط سطح المكتب", "fa": "طرح‌بندی دسکتاپ", "el": "Διάταξη επιφάνειας εργασίας", "hi": "डेस्कटॉप लेआउट", "bn": "ডেস্কটপ লেআউট", "ur": "ڈیسک ٹاپ لے آؤٹ"
    },
    "settings.grid_tablet": {
        "es": "Diseño para tableta", "fr": "Disposition tablette", "de": "Tablet-Layout", "it": "Layout tablet", "pt": "Layout de tablet", "nl": "Tabletindeling",
        "ru": "Макет планшета", "zh": "平板布局", "ja": "タブレットレイアウト", "ko": "태블릿 레이아웃", "tr": "Tablet Düzeni", "pl": "Układ tabletu",
        "id": "Tata Letak Tablet", "ar": "تخطيط الجهاز اللوحي", "fa": "طرح‌بندی تبلت", "el": "Διάταξη tablet", "hi": "टैबलेट लेआउट", "bn": "ট্যাবলেট লেআউট", "ur": "ٹیبلیٹ لے آؤٹ"
    },
    "settings.import_db": {
        "es": "Restaurar copia", "fr": "Restaurer la sauvegarde", "de": "Backup wiederherstellen", "it": "Ripristina backup", "pt": "Restaurar cópia de segurança", "nl": "Back-up herstellen",
        "ru": "Восстановить резервную копию", "zh": "恢复备份", "ja": "バックアップを復元", "ko": "백업 복원", "tr": "Yedeği Geri Yükle", "pl": "Przywróć kopię zapasową",
        "id": "Pulihkan Cadangan", "ar": "استعادة النسخة الاحتياطية", "fa": "بازیابی پشتیبان", "el": "Επαναφορά αντιγράφου ασφαλείας", "hi": "बैकअप पुनर्स्थापित करें", "bn": "ব্যাকআপ পুনরুদ্ধার করুন", "ur": "بیک اپ بحال کریں"
    },
    "settings.import_desc": {
        "es": "Sube una copia de seguridad para restaurar.", "fr": "Téléchargez une sauvegarde à restaurer.", "de": "Laden Sie ein Backup hoch, um es wiederherzustellen.", "it": "Carica un backup da ripristinare.", "pt": "Carregue uma cópia de segurança para restaurar.", "nl": "Upload een back-up om te herstellen.",
        "ru": "Загрузите резервную копию для восстановления.", "zh": "上传备份以进行恢复。", "ja": "復元するバックアップをアップロードします。", "ko": "복원할 백업을 업로드합니다.", "tr": "Geri yüklemek için bir yedek yükleyin.", "pl": "Prześlij kopię zapasową do przywrócenia.",
        "id": "Unggah cadangan untuk dipulihkan.", "ar": "قم بتحميل نسخة احتياطية للاستعادة.", "fa": "یک پشتیبان برای بازیابی آپلود کنید.", "el": "Ανεβάστε ένα αντίγραφο ασφαλείας για επαναφορά.", "hi": "पुनर्स्थापित करने के लिए एक बैकअप अपलोड करें।", "bn": "পুনরুদ্ধার করতে একটি ব্যাকআপ আপলোড করুন।", "ur": "بحال کرنے کے لیے ایک بیک اپ اپ لوڈ کریں۔"
    },
    "settings.import_warn": {
        "es": "Esto reemplazará tus datos actuales.", "fr": "Cela remplacera vos données actuelles.", "de": "Dies ersetzt Ihre aktuellen Daten.", "it": "Questo sostituirà i tuoi dati attuali.", "pt": "Isto substituirá os seus dados atuais.", "nl": "Dit vervangt uw huidige gegevens.",
        "ru": "Это заменит ваши текущие данные.", "zh": "这将替换您当前的数据。", "ja": "これにより現在のデータが置き換えられます。", "ko": "현재 데이터가 교체됩니다.", "tr": "Bu, mevcut verilerinizin yerine geçecektir.", "pl": "To zastąpi Twoje obecne dane.",
        "id": "Ini akan menggantikan data Anda saat ini.", "ar": "سيؤدي هذا إلى استبدال بياناتك الحالية.", "fa": "این داده‌های فعلی شما را جایگزین می‌کند.", "el": "Αυτό θα αντικαταστήσει τα τρέχοντα δεδομένα σας.", "hi": "यह आपके वर्तमान डेटा को बदल देगा।", "bn": "এটি আপনার বর্তমান ডেটা প্রতিস্থাপন করবে।", "ur": "یہ آپ کے موجودہ ڈیٹا کو تبدیل کر دے گا۔"
    },
    "settings.interface_title": {
        "es": "Diseño y aspecto", "fr": "Mise en page et design", "de": "Layout & Design", "it": "Layout e design", "pt": "Layout e design", "nl": "Lay-out en ontwerp",
        "ru": "Макет и дизайн", "zh": "布局与设计", "ja": "レイアウトとデザイン", "ko": "레이아웃 및 디자인", "tr": "Düzen ve Tasarım", "pl": "Układ i projekt",
        "id": "Tata Letak & Desain", "ar": "التخطيط والتصميم", "fa": "طرح‌بندی و طراحی", "el": "Διάταξη & Σχεδιασμός", "hi": "लेआउट और डिज़ाइन", "bn": "লেআউট ও ডিজাইন", "ur": "لے آؤٹ اور ڈیزائن"
    },
    "settings.language": {
        "es": "Idioma", "fr": "Langue", "de": "Sprache", "it": "Lingua", "pt": "Idioma", "nl": "Taal",
        "ru": "Язык", "zh": "语言", "ja": "言語", "ko": "언어", "tr": "Dil", "pl": "Język",
        "id": "Bahasa", "ar": "اللغة", "fa": "زبان", "el": "Γλώσσα", "hi": "भाषा", "bn": "ভাষা", "ur": "زبان"
    },
    "settings.light": {
        "es": "Claro", "fr": "Clair", "de": "Hell", "it": "Chiaro", "pt": "Claro", "nl": "Licht",
        "ru": "Светлая", "zh": "浅色", "ja": "ライト", "ko": "라이트", "tr": "Açık", "pl": "Jasny",
        "id": "Terang", "ar": "فاتح", "fa": "روشن", "el": "Φωτεινό", "hi": "लाइट", "bn": "লাইট", "ur": "لائٹ"
    },
    "settings.localization": {
        "es": "Región", "fr": "Région", "de": "Region", "it": "Regione", "pt": "Região", "nl": "Regio",
        "ru": "Регион", "zh": "地区", "ja": "地域", "ko": "지역", "tr": "Bölge", "pl": "Region",
        "id": "Wilayah", "ar": "المنطقة", "fa": "منطقه", "el": "Περιοχή", "hi": "क्षेत्र", "bn": "অঞ্চল", "ur": "علاقہ"
    },
    "settings.new_password": {
        "es": "Nueva contraseña", "fr": "Nouveau mot de passe", "de": "Neues Passwort", "it": "Nuova password", "pt": "Nova senha", "nl": "Nieuw wachtwoord",
        "ru": "Новый пароль", "zh": "新密码", "ja": "新しいパスワード", "ko": "새 비밀번호", "tr": "Yeni Şifre", "pl": "Nowe hasło",
        "id": "Kata sandi baru", "ar": "كلمة مرور جديدة", "fa": "رمز عبور جدید", "el": "Νέος κωδικός", "hi": "नया पासवर्ड", "bn": "নতুন পাসওয়ার্ড", "ur": "نیا پاس ورڈ"
    },
    "settings.no_users": {
        "es": "Aún no hay usuarios aquí.", "fr": "Aucun utilisateur ici pour le moment.", "de": "Hier sind noch keine Benutzer.", "it": "Ancora nessun utente qui.", "pt": "Ainda não há utilizadores aqui.", "nl": "Nog geen gebruikers hier.",
        "ru": "Здесь пока нет пользователей.", "zh": "这里还没有用户。", "ja": "まだユーザーはいません。", "ko": "아직 사용자가 없습니다.", "tr": "Henüz burada kullanıcı yok.", "pl": "Jeszcze nie ma tutaj użytkowników.",
        "id": "Belum ada pengguna di sini.", "ar": "لا يوجد مستخدمون هنا حتى الآن.", "fa": "هنوز کاربری وجود ندارد.", "el": "Δεν υπάρχουν ακόμα χρήστες εδώ.", "hi": "अभी यहां कोई उपयोगकर्ता नहीं है।", "bn": "এখনও এখানে কোনো ব্যবহারকারী নেই।", "ur": "ابھی یہاں کوئی صارف نہیں۔"
    },
    "settings.password_leave_blank": {
        "es": "Dejar en blanco para mantener la actual", "fr": "Laisser vide pour conserver l'actuel", "de": "Leer lassen, um aktuelles beizubehalten", "it": "Lascia vuoto per mantenere l'attuale", "pt": "Deixe em branco para manter a atual", "nl": "Laat leeg om huidige te behouden",
        "ru": "Оставьте пустым, чтобы сохранить текущий", "zh": "留空以保留当前", "ja": "現在のものを保持するには空のままにしてください", "ko": "현재 항목을 유지하려면 비워 두세요", "tr": "Mevcut olanı korumak için boş bırakın", "pl": "Pozostaw puste, aby zachować obecne",
        "id": "Biarkan kosong untuk mempertahankan saat ini", "ar": "اتركه فارغًا للاحتفاظ بالحالي", "fa": "برای نگه‌داشتن فعلی خالی بگذارید", "el": "Αφήστε κενό για διατήρηση του τρέχοντος", "hi": "वर्तमान रखने के लिए खाली छोड़ें", "bn": "বর্তমান রাখতে খালি রাখুন", "ur": "موجودہ رکھنے کے لیے خالی چھوڑ دیں"
    },
    "settings.password_placeholder": {
        "es": "Necesario para guardar cambios", "fr": "Requis pour sauvegarder les modifications", "de": "Erforderlich zum Speichern von Änderungen", "it": "Necessario per salvare le modifiche", "pt": "Necessário para guardar alterações", "nl": "Vereist om wijzigingen op te slaan",
        "ru": "Требуется для сохранения изменений", "zh": "保存更改所需", "ja": "変更を保存するために必要", "ko": "변경 사항을 저장하는 데 필요", "tr": "Değişiklikleri kaydetmek için gerekli", "pl": "Wymagane do zapisania zmian",
        "id": "Diperlukan untuk menyimpan perubahan", "ar": "مطلوب لحفظ التغييرات", "fa": "برای ذخیره تغییرات لازم است", "el": "Απαιτείται για αποθήκευση αλλαγών", "hi": "परिवर्तन सहेजने के लिए आवश्यक", "bn": "পরিবর্তন সংরক্ষণের জন্য প্রয়োজন", "ur": "تبدیلیاں محفوظ کرنے کے لیے ضروری"
    },
    "settings.personalization": {
        "es": "Hazlo tuyo", "fr": "Personnalisez", "de": "Machen Sie es zu Ihrem", "it": "Rendilo tuo", "pt": "Torne-o seu", "nl": "Maak het van jou",
        "ru": "Сделайте его своим", "zh": "让它成为你的", "ja": "あなた好みにカスタマイズ", "ko": "당신의 것으로 만드세요", "tr": "Kendinize Ait Yapın", "pl": "Spersonalizuj",
        "id": "Buat Milik Anda", "ar": "اجعله خاصًا بك", "fa": "آن را برای خود بسازید", "el": "Κάντε το δικό σας", "hi": "इसे अपना बनाएं", "bn": "এটি আপনার করুন", "ur": "اسے اپنا بنائیں"
    },
    "settings.profile": {
        "es": "Mi perfil", "fr": "Mon profil", "de": "Mein Profil", "it": "Il mio profilo", "pt": "Meu perfil", "nl": "Mijn profiel",
        "ru": "Мой профиль", "zh": "我的个人资料", "ja": "マイプロフィール", "ko": "내 프로필", "tr": "Profilim", "pl": "Mój profil",
        "id": "Profil saya", "ar": "ملفي الشخصي", "fa": "نمایه من", "el": "Το προφίλ μου", "hi": "मेरी प्रोफ़ाइल", "bn": "আমার প্রোফাইল", "ur": "میری پروفائل"
    },
    "settings.project_name": {
        "es": "Nombre del panel", "fr": "Nom du tableau de bord", "de": "Dashboard-Name", "it": "Nome dashboard", "pt": "Nome do painel", "nl": "Dashboardnaam",
        "ru": "Название панели", "zh": "仪表板名称", "ja": "ダッシュボード名", "ko": "대시보드 이름", "tr": "Kontrol Paneli Adı", "pl": "Nazwa pulpitu",
        "id": "Nama Dasbor", "ar": "اسم لوحة التحكم", "fa": "نام داشبورد", "el": "Όνομα πίνακα ελέγχου", "hi": "डैशबोर्ड का नाम", "bn": "ড্যাশবোর্ডের নাম", "ur": "ڈیش بورڈ کا نام"
    },
    "settings.project_name_desc": {
        "es": "Lo que aparece en tu encabezado.", "fr": "Ce qui apparaît dans votre en-tête.", "de": "Was in Ihrer Kopfzeile erscheint.", "it": "Ciò che appare nell'intestazione.", "pt": "O que aparece no seu cabeçalho.", "nl": "Wat in uw koptekst verschijnt.",
        "ru": "Что отображается в вашем заголовке.", "zh": "标题中显示的内容。", "ja": "ヘッダーに表示されます。", "ko": "헤더에 표시되는 내용입니다.", "tr": "Başlığınızda görünen.", "pl": "To, co pojawia się w nagłówku.",
        "id": "Yang muncul di header Anda.", "ar": "ما يظهر في رأس الصفحة.", "fa": "آنچه در هدر شما ظاهر می‌شود.", "el": "Αυτό που εμφανίζεται στην κεφαλίδα σας.", "hi": "आपके हेडर में जो दिखता है।", "bn": "আপনার হেডারে যা দেখায়।", "ur": "جو آپ کے ہیڈر میں ظاہر ہوتا ہے۔"
    },
    "settings.reset_desc": {
        "es": "Borra todo. Empezar de nuevo.", "fr": "Tout effacer. Recommencer.", "de": "Alles löschen. Neustart.", "it": "Cancella tutto. Ricomincia.", "pt": "Apaga tudo. Recomeçar.", "nl": "Alles wissen. Opnieuw beginnen.",
        "ru": "Удалить все. Начать заново.", "zh": "删除所有内容。重新开始。", "ja": "すべて削除。やり直す。", "ko": "모두 지우기. 새로 시작.", "tr": "Her şeyi sil. Yeniden başla.", "pl": "Wyczyść wszystko. Zacznij od nowa.",
        "id": "Hapus semuanya. Mulai lagi.", "ar": "احذف كل شيء. ابدأ من جديد.", "fa": "همه چیز را پاک کنید. شروع تازه.", "el": "Διαγραφή όλων. Ξεκινήστε από την αρχή.", "hi": "सब कुछ मिटाएं। नया आरंभ करें।", "bn": "সব মুছে ফেলুন। নতুন করে শুরু করুন।", "ur": "سب کچھ مٹائیں۔ نیا آغاز کریں۔"
    },
    "settings.role": {
        "es": "Rol", "fr": "Rôle", "de": "Rolle", "it": "Ruolo", "pt": "Função", "nl": "Rol",
        "ru": "Роль", "zh": "角色", "ja": "役割", "ko": "역할", "tr": "Rol", "pl": "Rola",
        "id": "Peran", "ar": "الدور", "fa": "نقش", "el": "Ρόλος", "hi": "भूमिका", "bn": "ভূমিকা", "ur": "کردار"
    },
    "settings.role_admin": {
        "es": "Admin", "fr": "Admin", "de": "Admin", "it": "Admin", "pt": "Admin", "nl": "Admin",
        "ru": "Админ", "zh": "管理员", "ja": "管理者", "ko": "관리자", "tr": "Yönetici", "pl": "Admin",
        "id": "Admin", "ar": "مسؤول", "fa": "ادمین", "el": "Διαχειριστής", "hi": "व्यवस्थापक", "bn": "অ্যাডমিন", "ur": "ایڈمن"
    },
    "settings.role_user": {
        "es": "Miembro", "fr": "Membre", "de": "Mitglied", "it": "Membro", "pt": "Membro", "nl": "Lid",
        "ru": "Участник", "zh": "成员", "ja": "メンバー", "ko": "회원", "tr": "Üye", "pl": "Członek",
        "id": "Anggota", "ar": "عضو", "fa": "عضو", "el": "Μέλος", "hi": "सदस्य", "bn": "সদস্য", "ur": "رکن"
    },
    "settings.studio_accent": {
        "es": "Color de acento", "fr": "Couleur d'accentuation", "de": "Akzentfarbe", "it": "Colore accento", "pt": "Cor de destaque", "nl": "Accentkleur",
        "ru": "Цвет акцента", "zh": "强调色", "ja": "アクセントカラー", "ko": "강조 색상", "tr": "Vurgu Rengi", "pl": "Kolor akcentu",
        "id": "Warna Aksen", "ar": "لون التمييز", "fa": "رنگ تاکیدی", "el": "Χρώμα τονισμού", "hi": "उच्चारण रंग", "bn": "উচ্চারণ রঙ", "ur": "تلفظ کا رنگ"
    },
    "settings.system_data": {
        "es": "Datos y copias", "fr": "Données et sauvegardes", "de": "Daten & Backup", "it": "Dati e backup", "pt": "Dados e cópias", "nl": "Gegevens & back-up",
        "ru": "Данные и резервные копии", "zh": "数据和备份", "ja": "データとバックアップ", "ko": "데이터 및 백업", "tr": "Veri ve Yedekleme", "pl": "Dane i kopie zapasowe",
        "id": "Data & Cadangan", "ar": "البيانات والنسخ الاحتياطي", "fa": "داده و پشتیبان", "el": "Δεδομένα & Αντίγραφα ασφαλείας", "hi": "डेटा और बैकअप", "bn": "ডেটা ও ব্যাকআপ", "ur": "ڈیٹا اور بیک اپ"
    },
    "settings.system_locale": {
        "es": "Idioma y hora", "fr": "Langue et heure", "de": "Sprache & Zeit", "it": "Lingua e ora", "pt": "Idioma e hora", "nl": "Taal & tijd",
        "ru": "Язык и время", "zh": "语言和时间", "ja": "言語と時刻", "ko": "언어 및 시간", "tr": "Dil ve Saat", "pl": "Język i czas",
        "id": "Bahasa & Waktu", "ar": "اللغة والوقت", "fa": "زبان و زمان", "el": "Γλώσσα & Ώρα", "hi": "भाषा और समय", "bn": "ভাষা ও সময়", "ur": "زبان اور وقت"
    },
    "settings.system_password": {
        "es": "Contraseña del sistema", "fr": "Mot de passe système", "de": "Systempasswort", "it": "Password di sistema", "pt": "Senha do sistema", "nl": "Systeemwachtwoord",
        "ru": "Системный пароль", "zh": "系统密码", "ja": "システムパスワード", "ko": "시스템 비밀번호", "tr": "Sistem Şifresi", "pl": "Hasło systemu",
        "id": "Kata Sandi Sistem", "ar": "كلمة مرور النظام", "fa": "رمز عبور سیستم", "el": "Κωδικός συστήματος", "hi": "सिस्टम पासवर्ड", "bn": "সিস্টেম পাসওয়ার্ড", "ur": "سسٹم پاس ورڈ"
    },
    "settings.theme": {
        "es": "Tema", "fr": "Thème", "de": "Thema", "it": "Tema", "pt": "Tema", "nl": "Thema",
        "ru": "Тема", "zh": "主题", "ja": "テーマ", "ko": "테마", "tr": "Tema", "pl": "Motyw",
        "id": "Tema", "ar": "السمة", "fa": "تم", "el": "Θέμα", "hi": "थीम", "bn": "থিম", "ur": "تھیم"
    },
    "settings.theme_mode": {
        "es": "Aspecto", "fr": "Apparence", "de": "Erscheinungsbild", "it": "Aspetto", "pt": "Aparência", "nl": "Uiterlijk",
        "ru": "Внешний вид", "zh": "外观", "ja": "外観", "ko": "외관", "tr": "Görünüm", "pl": "Wygląd",
        "id": "Tampilan", "ar": "المظهر", "fa": "ظاهر", "el": "Εμφάνιση", "hi": "रूप", "bn": "চেহারা", "ur": "ظاہری شکل"
    },
    "settings.title": {
        "es": "Configuración", "fr": "Paramètres", "de": "Einstellungen", "it": "Impostazioni", "pt": "Configurações", "nl": "Instellingen",
        "ru": "Настройки", "zh": "设置", "ja": "設定", "ko": "설정", "tr": "Ayarlar", "pl": "Ustawienia",
        "id": "Pengaturan", "ar": "الإعدادات", "fa": "تنظیمات", "el": "Ρυθμίσεις", "hi": "सेटिंग्स", "bn": "সেটিংস", "ur": "ترتیبات"
    },
    "settings.up_to_date": {
        "es": "Estás al día", "fr": "Vous êtes à jour", "de": "Alles aktuell", "it": "Sei aggiornato", "pt": "Está atualizado", "nl": "U bent up-to-date",
        "ru": "Все обновлено", "zh": "您已是最新", "ja": "最新の状態です", "ko": "최신 상태입니다", "tr": "Güncelsiniz", "pl": "Wszystko aktualne",
        "id": "Anda sudah terkini", "ar": "أنت محدث", "fa": "شما بروز هستید", "el": "Είστε ενημερωμένοι", "hi": "आप अप-टू-डेट हैं", "bn": "আপনি আপ-টু-ডেট", "ur": "آپ اپ ٹو ڈیٹ ہیں"
    },
    "settings.update_available": {
        "es": "¡Nueva actualización!", "fr": "Nouvelle mise à jour !", "de": "Neues Update!", "it": "Nuovo aggiornamento!", "pt": "Nova atualização!", "nl": "Nieuwe update!",
        "ru": "Новое обновление!", "zh": "新更新！", "ja": "新しい更新！", "ko": "새 업데이트!", "tr": "Yeni güncelleme!", "pl": "Nowa aktualizacja!",
        "id": "Pembaruan baru!", "ar": "تحديث جديد!", "fa": "به‌روزرسانی جدید!", "el": "Νέα ενημέρωση!", "hi": "नया अपडेट!", "bn": "নতুন আপডেট!", "ur": "نیا اپ ڈیٹ!"
    },
    "settings.user_management": {
        "es": "Equipo", "fr": "Équipe", "de": "Team", "it": "Team", "pt": "Equipa", "nl": "Team",
        "ru": "Команда", "zh": "团队", "ja": "チーム", "ko": "팀", "tr": "Ekip", "pl": "Zespół",
        "id": "Tim", "ar": "الفريق", "fa": "تیم", "el": "Ομάδα", "hi": "टीम", "bn": "দল", "ur": "ٹیم"
    },
    "settings.users": {
        "es": "Usuarios", "fr": "Utilisateurs", "de": "Benutzer", "it": "Utenti", "pt": "Utilizadores", "nl": "Gebruikers",
        "ru": "Пользователи", "zh": "用户", "ja": "ユーザー", "ko": "사용자", "tr": "Kullanıcılar", "pl": "Użytkownicy",
        "id": "Pengguna", "ar": "المستخدمون", "fa": "کاربران", "el": "Χρήστες", "hi": "उपयोगकर्ता", "bn": "ব্যবহারকারীরা", "ur": "صارفین"
    },
    "settings.type_delete": {
        "es": "Escribe <span style=\"font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;\">delete</span> para confirmar.", "fr": "Tapez <span style=\"font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;\">delete</span> pour confirmer.", "de": "Geben Sie <span style=\"font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;\">delete</span> ein, um zu bestätigen.", "it": "Digita <span style=\"font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;\">delete</span> per confermare.", "pt": "Digite <span style=\"font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;\">delete</span> para confirmar.", "nl": "Typ <span style=\"font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;\">delete</span> om te bevestigen.",
        "ru": "Введите <span style=\"font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;\">delete</span> для подтверждения.", "zh": "输入 <span style=\"font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;\">delete</span> 以确认。", "ja": "確認するには <span style=\"font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;\">delete</span> と入力してください。", "ko": "확인하려면 <span style=\"font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;\">delete</span> 를 입력하세요.", "tr": "Onaylamak için <span style=\"font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;\">delete</span> yazın.", "pl": "Wpisz <span style=\"font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;\">delete</span>, aby potwierdzić.",
        "id": "Ketik <span style=\"font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;\">delete</span> untuk mengonfirmasi.", "ar": "اكتب <span style=\"font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;\">delete</span> للتأكيد.", "fa": "برای تایید <span style=\"font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;\">delete</span> تایپ کنید.", "el": "Πληκτρολογήστε <span style=\"font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;\">delete</span> για επιβεβαίωση.", "hi": "पुष्टि करने के लिए <span style=\"font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;\">delete</span> टाइप करें।", "bn": "নিশ্চিত করতে <span style=\"font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;\">delete</span> লিখুন।", "ur": "تصدیق کے لیے <span style=\"font-family: monospace; color: #fa5252; background: rgba(250, 82, 82, 0.1); padding: 2px 6px; border-radius: 4px;\">delete</span> لکھیں۔"
    },
    "settings.type_delete_placeholder": {
        "es": "delete", "fr": "delete", "de": "delete", "it": "delete", "pt": "delete", "nl": "delete",
        "ru": "delete", "zh": "delete", "ja": "delete", "ko": "delete", "tr": "delete", "pl": "delete",
        "id": "delete", "ar": "delete", "fa": "delete", "el": "delete", "hi": "delete", "bn": "delete", "ur": "delete"
    },
    "settings.version": {
        "es": "Versión", "fr": "Version", "de": "Version", "it": "Versione", "pt": "Versão", "nl": "Versie",
        "ru": "Версия", "zh": "版本", "ja": "バージョン", "ko": "버전", "tr": "Sürüm", "pl": "Wersja",
        "id": "Versi", "ar": "الإصدار", "fa": "نسخه", "el": "Έκδοση", "hi": "संस्करण", "bn": "সংস্করণ", "ur": "ورژن"
    },

    // === Setup Keys ===
    "setup.create_admin": {
        "es": "Crear propietario", "fr": "Créer le propriétaire", "de": "Besitzer erstellen", "it": "Crea proprietario", "pt": "Criar proprietário", "nl": "Eigenaar maken",
        "ru": "Создать владельца", "zh": "创建所有者", "ja": "所有者を作成", "ko": "소유자 생성", "tr": "Sahip Oluştur", "pl": "Utwórz właściciela",
        "id": "Buat Pemilik", "ar": "إنشاء مالك", "fa": "ایجاد مالک", "el": "Δημιουργία κατόχου", "hi": "स्वामी बनाएं", "bn": "মালিক তৈরি করুন", "ur": "مالک بنائیں"
    },
    "setup.creating": {
        "es": "Configurando las cosas...", "fr": "Configuration en cours...", "de": "Dinge einrichten...", "it": "Configurazione in corso...", "pt": "A configurar...", "nl": "Dingen instellen...",
        "ru": "Настройка...", "zh": "正在设置...", "ja": "設定中...", "ko": "설정 중...", "tr": "Ayarlanıyor...", "pl": "Konfigurowanie...",
        "id": "Mengatur...", "ar": "إعداد الأشياء...", "fa": "در حال تنظیم...", "el": "Ρύθμιση...", "hi": "सेटअप हो रहा है...", "bn": "সেটআপ হচ্ছে...", "ur": "سیٹ اپ ہو رہا ہے..."
    },
    "setup.encryption_failed": {
        "es": "Problema de cifrado", "fr": "Problème de chiffrement", "de": "Verschlüsselungsproblem", "it": "Problema di crittografia", "pt": "Problema de encriptação", "nl": "Versleutelingsprobleem",
        "ru": "Проблема шифрования", "zh": "加密问题", "ja": "暗号化の問題", "ko": "암호화 문제", "tr": "Şifreleme sorunu", "pl": "Problem szyfrowania",
        "id": "Masalah enkripsi", "ar": "مشكلة في التشفير", "fa": "مشکل رمزگذاری", "el": "Πρόβλημα κρυπτογράφησης", "hi": "एन्क्रिप्शन समस्या", "bn": "এনক্রিপশন সমস্যা", "ur": "خفیہ کاری کا مسئلہ"
    },
    "setup.error_username": {
        "es": "Nombre de usuario demasiado corto", "fr": "Nom d'utilisateur trop court", "de": "Benutzername zu kurz", "it": "Nome utente troppo corto", "pt": "Nome de utilizador muito curto", "nl": "Gebruikersnaam te kort",
        "ru": "Имя пользователя слишком короткое", "zh": "用户名太短", "ja": "ユーザー名が短すぎます", "ko": "사용자 이름이 너무 짧습니다", "tr": "Kullanıcı adı çok kısa", "pl": "Nazwa użytkownika za krótka",
        "id": "Nama pengguna terlalu pendek", "ar": "اسم المستخدم قصير جدًا", "fa": "نام کاربری خیلی کوتاه است", "el": "Το όνομα χρήστη είναι πολύ μικρό", "hi": "उपयोगकर्ता नाम बहुत छोटा", "bn": "ব্যবহারকারীর নাম খুব ছোট", "ur": "صارف نام بہت مختصر ہے"
    },
    "setup.failed": {
        "es": "La configuración no funcionó", "fr": "La configuration n'a pas fonctionné", "de": "Setup hat nicht funktioniert", "it": "La configurazione non ha funzionato", "pt": "A configuração não funcionou", "nl": "Setup werkte niet",
        "ru": "Настройка не сработала", "zh": "设置不起作用", "ja": "セットアップが機能しませんでした", "ko": "설정이 작동하지 않았습니다", "tr": "Kurulum işe yaramadı", "pl": "Konfiguracja nie zadziałała",
        "id": "Pengaturan tidak berhasil", "ar": "لم ينجح الإعداد", "fa": "راه‌اندازی کار نکرد", "el": "Η ρύθμιση δεν λειτούργησε", "hi": "सेटअप काम नहीं किया", "bn": "সেটআপ কাজ করেনি", "ur": "سیٹ اپ کام نہیں کیا"
    },
    "setup.failed_create_user": {
        "es": "No se pudo crear el usuario", "fr": "Impossible de créer l'utilisateur", "de": "Benutzer konnte nicht erstellt werden", "it": "Impossibile creare l'utente", "pt": "Não foi possível criar o utilizador", "nl": "Kon gebruiker niet maken",
        "ru": "Не удалось создать пользователя", "zh": "无法创建用户", "ja": "ユーザーを作成できませんでした", "ko": "사용자를 만들 수 없습니다", "tr": "Kullanıcı oluşturulamadı", "pl": "Nie można utworzyć użytkownika",
        "id": "Tidak dapat membuat pengguna", "ar": "تعذر إنشاء المستخدم", "fa": "امکان ایجاد کاربر وجود ندارد", "el": "Αδυναμία δημιουργίας χρήστη", "hi": "उपयोगकर्ता नहीं बनाया जा सका", "bn": "ব্যবহারকারী তৈরি করা যায়নি", "ur": "صارف نہیں بنایا جا سکا"
    },
    "setup.passkey": {
        "es": "Clave secreta", "fr": "Clé secrète", "de": "Geheimschlüssel", "it": "Chiave segreta", "pt": "Chave secreta", "nl": "Geheime sleutel",
        "ru": "Секретный ключ", "zh": "密钥", "ja": "秘密鍵", "ko": "비밀 키", "tr": "Gizli Anahtar", "pl": "Tajny klucz",
        "id": "Kunci Rahasia", "ar": "المفتاح السري", "fa": "کلید مخفی", "el": "Μυστικό κλειδί", "hi": "गुप्त कुंजी", "bn": "গোপন চাবি", "ur": "خفیہ کلید"
    },
    "setup.root_user": {
        "es": "Propietario", "fr": "Propriétaire", "de": "Besitzer", "it": "Proprietario", "pt": "Proprietário", "nl": "Eigenaar",
        "ru": "Владелец", "zh": "所有者", "ja": "所有者", "ko": "소유자", "tr": "Sahip", "pl": "Właściciel",
        "id": "Pemilik", "ar": "المالك", "fa": "مالک", "el": "Κάτοχος", "hi": "स्वामी", "bn": "মালিক", "ur": "مالک"
    },
    "setup.subtitle": {
        "es": "Empecemos", "fr": "Commençons", "de": "Legen wir los", "it": "Iniziamo", "pt": "Vamos começar", "nl": "Laten we beginnen",
        "ru": "Давайте начнем", "zh": "让我们开始吧", "ja": "始めましょう", "ko": "시작하겠습니다", "tr": "Hadi başlayalım", "pl": "Zaczynajmy",
        "id": "Mari kita mulai", "ar": "لنبدأ", "fa": "بیایید شروع کنیم", "el": "Ας ξεκινήσουμε", "hi": "चलो शुरू करें", "bn": "চলুন শুরু করি", "ur": "آئیں شروع کریں"
    },
    "setup.welcome_admin": {
        "es": "¡Todo listo!", "fr": "Tout est prêt !", "de": "Alles bereit!", "it": "Tutto pronto!", "pt": "Tudo pronto!", "nl": "Alles klaar!",
        "ru": "Все готово!", "zh": "一切就绪！", "ja": "準備完了！", "ko": "모두 준비됐습니다!", "tr": "Her şey hazır!", "pl": "Wszystko gotowe!",
        "id": "Semua siap!", "ar": "كل شيء جاهز!", "fa": "همه چیز آماده!", "el": "Όλα έτοιμα!", "hi": "सब तैयार है!", "bn": "সব প্রস্তুত!", "ur": "سب تیار ہے!"
    },

    // === Status Keys ===
    "status.checking": {
        "es": "Comprobando...", "fr": "Vérification...", "de": "Überprüfung...", "it": "Controllo...", "pt": "A verificar...", "nl": "Controleren...",
        "ru": "Проверка...", "zh": "检查中...", "ja": "確認中...", "ko": "확인 중...", "tr": "Kontrol ediliyor...", "pl": "Sprawdzanie...",
        "id": "Memeriksa...", "ar": "جاري التحقق...", "fa": "در حال بررسی...", "el": "Έλεγχος...", "hi": "जांच रहा है...", "bn": "পরীক্ষা করা হচ্ছে...", "ur": "چیک ہو رہا ہے..."
    },
    "status.offline": {
        "es": "Desconectado", "fr": "Hors ligne", "de": "Offline", "it": "Offline", "pt": "Offline", "nl": "Offline",
        "ru": "Не в сети", "zh": "离线", "ja": "オフライン", "ko": "오프라인", "tr": "Çevrimdışı", "pl": "Offline",
        "id": "Offline", "ar": "غير متصل", "fa": "آفلاین", "el": "Εκτός σύνδεσης", "hi": "ऑफ़लाइन", "bn": "অফলাইন", "ur": "آف لائن"
    },
    "status.online": {
        "es": "En línea", "fr": "En ligne", "de": "Online", "it": "Online", "pt": "Online", "nl": "Online",
        "ru": "В сети", "zh": "在线", "ja": "オンライン", "ko": "온라인", "tr": "Çevrimiçi", "pl": "Online",
        "id": "Online", "ar": "متصل", "fa": "آنلاین", "el": "Σε σύνδεση", "hi": "ऑनलाइन", "bn": "অনলাইন", "ur": "آن لائن"
    },
    "status.unreachable": {
        "es": "Inalcanzable", "fr": "Injoignable", "de": "Nicht erreichbar", "it": "Non raggiungibile", "pt": "Inacessível", "nl": "Onbereikbaar",
        "ru": "Недоступен", "zh": "无法访问", "ja": "到達不能", "ko": "연결할 수 없음", "tr": "Erişilemiyor", "pl": "Niedostępny",
        "id": "Tidak dapat dijangkau", "ar": "لا يمكن الوصول إليه", "fa": "غیرقابل دسترس", "el": "Μη προσβάσιμο", "hi": "पहुंच योग्य नहीं", "bn": "পৌঁছানো যাচ্ছে না", "ur": "رسائی نہیں"
    },

    // === Topbar Keys ===
    "topbar.add_tooltip": {
        "es": "Agregar elemento", "fr": "Ajouter un élément", "de": "Element hinzufügen", "it": "Aggiungi elemento", "pt": "Adicionar item", "nl": "Item toevoegen",
        "ru": "Добавить элемент", "zh": "添加项目", "ja": "アイテムを追加", "ko": "항목 추가", "tr": "Öğe ekle", "pl": "Dodaj element",
        "id": "Tambah item", "ar": "إضافة عنصر", "fa": "افزودن مورد", "el": "Προσθήκη στοιχείου", "hi": "आइटम जोड़ें", "bn": "আইটেম যোগ করুন", "ur": "آئٹم شامل کریں"
    },
    "topbar.edit_tooltip": {
        "es": "Editar panel", "fr": "Modifier le tableau de bord", "de": "Dashboard bearbeiten", "it": "Modifica dashboard", "pt": "Editar painel", "nl": "Dashboard bewerken",
        "ru": "Редактировать панель", "zh": "编辑仪表板", "ja": "ダッシュボードを編集", "ko": "대시보드 편집", "tr": "Kontrol Panelini Düzenle", "pl": "Edytuj pulpit",
        "id": "Edit Dasbor", "ar": "تحرير لوحة التحكم", "fa": "ویرایش داشبورد", "el": "Επεξεργασία πίνακα ελέγχου", "hi": "डैशबोर्ड संपादित करें", "bn": "ড্যাশবোর্ড সম্পাদনা করুন", "ur": "ڈیش بورڈ میں ترمیم کریں"
    },

    // === Type Keys ===
    "type.bookmark": {
        "es": "Marcador", "fr": "Signet", "de": "Lesezeichen", "it": "Segnalibro", "pt": "Favorito", "nl": "Bladwijzer",
        "ru": "Закладка", "zh": "书签", "ja": "ブックマーク", "ko": "북마크", "tr": "Yer İmi", "pl": "Zakładka",
        "id": "Bookmark", "ar": "إشارة مرجعية", "fa": "نشانک", "el": "Σελιδοδείκτης", "hi": "बुकमार्क", "bn": "বুকমার্ক", "ur": "بک مارک"
    },
    "type.section": {
        "es": "Sección", "fr": "Section", "de": "Abschnitt", "it": "Sezione", "pt": "Seção", "nl": "Sectie",
        "ru": "Раздел", "zh": "部分", "ja": "セクション", "ko": "섹션", "tr": "Bölüm", "pl": "Sekcja",
        "id": "Bagian", "ar": "قسم", "fa": "بخش", "el": "Ενότητα", "hi": "अनुभाग", "bn": "বিভাগ", "ur": "سیکشن"
    },

    // === Widget Keys ===
    "widget.add_subtitle": {
        "es": "¿Qué quieres agregar?", "fr": "Que voulez-vous ajouter ?", "de": "Was möchten Sie hinzufügen?", "it": "Cosa vuoi aggiungere?", "pt": "O que deseja adicionar?", "nl": "Wat wil je toevoegen?",
        "ru": "Что вы хотите добавить?", "zh": "您想添加什么？", "ja": "何を追加しますか？", "ko": "무엇을 추가하시겠습니까?", "tr": "Ne eklemek istersiniz?", "pl": "Co chcesz dodać?",
        "id": "Apa yang ingin Anda tambahkan?", "ar": "ماذا تريد أن تضيف؟", "fa": "چه چیزی می‌خواهید اضافه کنید؟", "el": "Τι θέλετε να προσθέσετε;", "hi": "आप क्या जोड़ना चाहते हैं?", "bn": "আপনি কী যোগ করতে চান?", "ur": "آپ کیا شامل کرنا چاہتے ہیں؟"
    },
    "widget.add_title": {
        "es": "Nuevo elemento", "fr": "Nouvel élément", "de": "Neues Element", "it": "Nuovo elemento", "pt": "Novo item", "nl": "Nieuw item",
        "ru": "Новый элемент", "zh": "新项目", "ja": "新しいアイテム", "ko": "새 항목", "tr": "Yeni Öğe", "pl": "Nowy element",
        "id": "Item Baru", "ar": "عنصر جديد", "fa": "مورد جدید", "el": "Νέο στοιχείο", "hi": "नया आइटम", "bn": "নতুন আইটেম", "ur": "نیا آئٹم"
    },
    "widget.clock.city": {
        "es": "Ubicación", "fr": "Emplacement", "de": "Standort", "it": "Posizione", "pt": "Localização", "nl": "Locatie",
        "ru": "Местоположение", "zh": "位置", "ja": "場所", "ko": "위치", "tr": "Konum", "pl": "Lokalizacja",
        "id": "Lokasi", "ar": "الموقع", "fa": "مکان", "el": "Τοποθεσία", "hi": "स्थान", "bn": "অবস্থান", "ur": "مقام"
    },
    "widget.clock.city_placeholder": {
        "es": "ej. París", "fr": "ex. Paris", "de": "z.B. Paris", "it": "es. Parigi", "pt": "ex. Paris", "nl": "bijv. Parijs",
        "ru": "например, Париж", "zh": "例如 巴黎", "ja": "例: パリ", "ko": "예: 파리", "tr": "örneğin Paris", "pl": "np. Paryż",
        "id": "cth. Paris", "ar": "مثال باريس", "fa": "مانند پاریس", "el": "π.χ. Παρίσι", "hi": "उदाहरण पेरिस", "bn": "যেমন প্যারিস", "ur": "مثال پیرس"
    },
    "widget.clock.show_date": {
        "es": "Mostrar fecha", "fr": "Afficher la date", "de": "Datum anzeigen", "it": "Mostra data", "pt": "Mostrar data", "nl": "Datum weergeven",
        "ru": "Показать дату", "zh": "显示日期", "ja": "日付を表示", "ko": "날짜 표시", "tr": "Tarihi Göster", "pl": "Pokaż datę",
        "id": "Tampilkan tanggal", "ar": "عرض التاريخ", "fa": "نمایش تاریخ", "el": "Εμφάνιση ημερομηνίας", "hi": "तारीख दिखाएं", "bn": "তারিখ দেখান", "ur": "تاریخ دکھائیں"
    },
    "widget.clock.use_12h": {
        "es": "Reloj de 12 horas", "fr": "Horloge 12 heures", "de": "12-Stunden-Uhr", "it": "Orologio a 12 ore", "pt": "Relógio de 12 horas", "nl": "12-uurs klok",
        "ru": "12-часовой формат", "zh": "12小时制", "ja": "12時間表示", "ko": "12시간제", "tr": "12 Saatlik Saat", "pl": "Zegar 12-godzinny",
        "id": "Jam 12 jam", "ar": "ساعة 12 ساعة", "fa": "ساعت 12 ساعته", "el": "Ρολόι 12 ωρών", "hi": "12 घंटे की घड़ी", "bn": "১২ ঘন্টার ঘড়ি", "ur": "12 گھنٹے کی گھڑی"
    },
    "widget.config.title": {
        "es": "Configuración", "fr": "Paramètres", "de": "Einstellungen", "it": "Impostazioni", "pt": "Configurações", "nl": "Instellingen",
        "ru": "Настройки", "zh": "设置", "ja": "設定", "ko": "설정", "tr": "Ayarlar", "pl": "Ustawienia",
        "id": "Pengaturan", "ar": "الإعدادات", "fa": "تنظیمات", "el": "Ρυθμίσεις", "hi": "सेटिंग्स", "bn": "সেটিংস", "ur": "ترتیبات"
    },
    "widget.notepad.confirm_discard": {
        "es": "Cambios sin guardar. ¿Descartar?", "fr": "Modifications non enregistrées. Abandonner ?", "de": "Nicht gespeicherte Änderungen. Verwerfen?", "it": "Modifiche non salvate. Scartare?", "pt": "Alterações não guardadas. Descartar?", "nl": "Niet-opgeslagen wijzigingen. Verwijderen?",
        "ru": "Несохраненные изменения. Отменить?", "zh": "未保存的更改。放弃？", "ja": "未保存の変更。破棄しますか？", "ko": "저장되지 않은 변경사항. 삭제하시겠습니까?", "tr": "Kaydedilmemiş değişiklikler. At?", "pl": "Niezapisane zmiany. Odrzucić?",
        "id": "Perubahan belum disimpan. Buang?", "ar": "تغييرات غير محفوظة. تجاهل؟", "fa": "تغییرات ذخیره نشده. کنار گذاشتن؟", "el": "Μη αποθηκευμένες αλλαγές. Απόρριψη;", "hi": "अनसेव परिवर्तन। त्यागें?", "bn": "সংরক্ষিত নয় পরিবর্তন। বাতিল করবেন?", "ur": "محفوظ نہ کی گئی تبدیلیاں۔ ترک کریں؟"
    },
    "widget.notepad.error.render": {
        "es": "Error de renderizado", "fr": "Erreur de rendu", "de": "Rendering-Fehler", "it": "Errore di rendering", "pt": "Erro de renderização", "nl": "Renderfout",
        "ru": "Ошибка отображения", "zh": "渲染错误", "ja": "レンダリングエラー", "ko": "렌더링 오류", "tr": "İşleme hatası", "pl": "Błąd renderowania",
        "id": "Kesalahan render", "ar": "خطأ في العرض", "fa": "خطای رندر", "el": "Σφάλμα απόδοσης", "hi": "रेंडर त्रुटि", "bn": "রেন্ডার ত্রুটি", "ur": "رینڈر کی خرابی"
    },
    "widget.notepad.error.too_large": {
        "es": "Demasiado texto (máx. 50KB).", "fr": "Trop de texte (max. 50 Ko).", "de": "Zu viel Text (max. 50KB).", "it": "Troppo testo (max. 50KB).", "pt": "Texto demais (máx. 50KB).", "nl": "Te veel tekst (max. 50KB).",
        "ru": "Слишком много текста (макс. 50КБ).", "zh": "文本太多（最多 50KB）。", "ja": "テキストが多すぎます（最大50KB）。", "ko": "텍스트가 너무 많습니다 (최대 50KB).", "tr": "Çok fazla metin (maks. 50KB).", "pl": "Za dużo tekstu (maks. 50KB).",
        "id": "Terlalu banyak teks (maks. 50KB).", "ar": "نص كثير جدًا (الحد الأقصى 50 كيلوبايت).", "fa": "متن بیش از حد (حداکثر 50 کیلوبایت).", "el": "Πολύ κείμενο (μέγ. 50KB).", "hi": "बहुत अधिक पाठ (अधिकतम 50KB)।", "bn": "অনেক টেক্সট (সর্বোচ্চ 50KB)।", "ur": "بہت زیادہ متن (زیادہ سے زیادہ 50KB)۔"
    },
    "widget.notepad.status.saved": {
        "es": "Guardado", "fr": "Enregistré", "de": "Gespeichert", "it": "Salvato", "pt": "Guardado", "nl": "Opgeslagen",
        "ru": "Сохранено", "zh": "已保存", "ja": "保存済み", "ko": "저장됨", "tr": "Kaydedildi", "pl": "Zapisano",
        "id": "Tersimpan", "ar": "تم الحفظ", "fa": "ذخیره شد", "el": "Αποθηκεύτηκε", "hi": "सहेजा गया", "bn": "সংরক্ষিত", "ur": "محفوظ ہو گیا"
    },
    "widget.notepad.tool.edit": {
        "es": "Editar", "fr": "Modifier", "de": "Bearbeiten", "it": "Modifica", "pt": "Editar", "nl": "Bewerken",
        "ru": "Редактировать", "zh": "编辑", "ja": "編集", "ko": "편집", "tr": "Düzenle", "pl": "Edytuj",
        "id": "Edit", "ar": "تحرير", "fa": "ویرایش", "el": "Επεξεργασία", "hi": "संपादित करें", "bn": "সম্পাদনা", "ur": "ترمیم کریں"
    },
    "widget.notepad.tool.save": {
        "es": "Guardar", "fr": "Enregistrer", "de": "Speichern", "it": "Salva", "pt": "Guardar", "nl": "Opslaan",
        "ru": "Сохранить", "zh": "保存", "ja": "保存", "ko": "저장", "tr": "Kaydet", "pl": "Zapisz",
        "id": "Simpan", "ar": "حفظ", "fa": "ذخیره", "el": "Αποθήκευση", "hi": "सहेजें", "bn": "সংরক্ষণ", "ur": "محفوظ کریں"
    },
    "widget.notepad.status.saving": {
        "es": "Guardando...", "fr": "Enregistrement...", "de": "Speichern...", "it": "Salvataggio...", "pt": "A guardar...", "nl": "Opslaan...",
        "ru": "Сохранение...", "zh": "保存中...", "ja": "保存中...", "ko": "저장 중...", "tr": "Kaydediliyor...", "pl": "Zapisywanie...",
        "id": "Menyimpan...", "ar": "جاري الحفظ...", "fa": "در حال ذخیره...", "el": "Αποθήκευση...", "hi": "सहेज रहा है...", "bn": "সংরক্ষণ করা হচ্ছে...", "ur": "محفوظ ہو رہا ہے..."
    },
    "widget.telemetry.cpu": {
        "es": "CPU", "fr": "CPU", "de": "CPU", "it": "CPU", "pt": "CPU", "nl": "CPU",
        "ru": "ЦП", "zh": "CPU", "ja": "CPU", "ko": "CPU", "tr": "CPU", "pl": "CPU",
        "id": "CPU", "ar": "المعالج", "fa": "پردازنده", "el": "CPU", "hi": "CPU", "bn": "CPU", "ur": "CPU"
    },
    "widget.telemetry.ram": {
        "es": "RAM", "fr": "RAM", "de": "RAM", "it": "RAM", "pt": "RAM", "nl": "RAM",
        "ru": "ОЗУ", "zh": "内存", "ja": "RAM", "ko": "RAM", "tr": "RAM", "pl": "RAM",
        "id": "RAM", "ar": "الذاكرة", "fa": "رم", "el": "RAM", "hi": "RAM", "bn": "RAM", "ur": "RAM"
    },
    "widget.telemetry.temp": {
        "es": "CALOR", "fr": "CHALEUR", "de": "WÄRME", "it": "CALORE", "pt": "CALOR", "nl": "WARMTE",
        "ru": "ТЕПЛО", "zh": "温度", "ja": "温度", "ko": "온도", "tr": "ISI", "pl": "CIEPŁO",
        "id": "PANAS", "ar": "الحرارة", "fa": "گرما", "el": "ΘΕΡΜΟΤΗΤΑ", "hi": "ताप", "bn": "তাপ", "ur": "حرارت"
    },
    "widget.telemetry.update_interval": {
        "es": "Tasa de actualización", "fr": "Taux de rafraîchissement", "de": "Aktualisierungsrate", "it": "Frequenza aggiornamento", "pt": "Taxa de atualização", "nl": "Verversingssnelheid",
        "ru": "Частота обновления", "zh": "刷新率", "ja": "更新レート", "ko": "새로 고침 빈도", "tr": "Yenileme Hızı", "pl": "Częstotliwość odświeżania",
        "id": "Tingkat Penyegaran", "ar": "معدل التحديث", "fa": "نرخ بازخوانی", "el": "Ρυθμός ανανέωσης", "hi": "रीफ़्रेश दर", "bn": "রিফ্রেশ হার", "ur": "تازہ کاری کی شرح"
    },

    // === Weather Widget Weather Conditions ===
    "widget.weather.clear_sky": {
        "es": "Cielo despejado", "fr": "Ciel dégagé", "de": "Klarer Himmel", "it": "Cielo sereno", "pt": "Céu limpo", "nl": "Heldere lucht",
        "ru": "Ясное небо", "zh": "晴空", "ja": "晴天", "ko": "맑은 하늘", "tr": "Açık gökyüzü", "pl": "Czyste niebo",
        "id": "Langit cerah", "ar": "سماء صافية", "fa": "آسمان صاف", "el": "Καθαρός ουρανός", "hi": "साफ आकाश", "bn": "পরিষ্কার আকাশ", "ur": "صاف آسمان"
    },
    "widget.weather.description": {
        "es": "Pronóstico", "fr": "Prévisions", "de": "Vorhersage", "it": "Previsioni", "pt": "Previsão", "nl": "Voorspelling",
        "ru": "Прогноз", "zh": "预报", "ja": "予報", "ko": "예보", "tr": "Tahmin", "pl": "Prognoza",
        "id": "Prakiraan", "ar": "التوقعات", "fa": "پیش‌بینی", "el": "Πρόβλεψη", "hi": "पूर्वानुमान", "bn": "পূর্বাভাস", "ur": "پیشین گوئی"
    },
    "widget.weather.drizzle": {
        "es": "Llovizna", "fr": "Bruine", "de": "Nieselregen", "it": "Pioggerella", "pt": "Chuvisco", "nl": "Motregen",
        "ru": "Морось", "zh": "毛毛雨", "ja": "霧雨", "ko": "이슬비", "tr": "Çisinti", "pl": "Mżawka",
        "id": "Gerimis", "ar": "رذاذ", "fa": "نم‌نم باران", "el": "Ψιλόβροχο", "hi": "बूंदाबांदी", "bn": "গুঁড়ি গুঁড়ি বৃষ্টি", "ur": "بوندا باندی"
    },
    "widget.weather.fog": {
        "es": "Niebla", "fr": "Brouillard", "de": "Nebel", "it": "Nebbia", "pt": "Nevoeiro", "nl": "Mist",
        "ru": "Туман", "zh": "雾", "ja": "霧", "ko": "안개", "tr": "Sis", "pl": "Mgła",
        "id": "Kabut", "ar": "ضباب", "fa": "مه", "el": "Ομίχλη", "hi": "कोहरा", "bn": "কুয়াশা", "ur": "دھند"
    },
    "widget.weather.freezing_drizzle": {
        "es": "Llovizna helada", "fr": "Bruine verglaçante", "de": "Gefrierender Nieselregen", "it": "Pioggerella gelata", "pt": "Chuvisco congelante", "nl": "Ijzel",
        "ru": "Ледяной дождь", "zh": "冻雨", "ja": "凍る霧雨", "ko": "어는 이슬비", "tr": "Dondurucu çisinti", "pl": "Marznąca mżawka",
        "id": "Gerimis beku", "ar": "رذاذ متجمد", "fa": "نم‌نم باران یخ‌زده", "el": "Παγωμένο ψιλόβροχο", "hi": "जमी हुई बूंदाबांदी", "bn": "হিমায়িত গুঁড়ি বৃষ্টি", "ur": "منجمد بوندا باندی"
    },
    "widget.weather.freezing_rain": {
        "es": "Lluvia helada", "fr": "Pluie verglaçante", "de": "Gefrierender Regen", "it": "Pioggia gelata", "pt": "Chuva congelante", "nl": "IJsregen",
        "ru": "Ледяной дождь", "zh": "冻雨", "ja": "凍る雨", "ko": "어는 비", "tr": "Dondurucu yağmur", "pl": "Marznący deszcz",
        "id": "Hujan beku", "ar": "مطر متجمد", "fa": "باران یخ‌زده", "el": "Παγωμένη βροχή", "hi": "जमी हुई बारिश", "bn": "হিমায়িত বৃষ্টি", "ur": "منجمد بارش"
    },
    "widget.weather.heavy_drizzle": {
        "es": "Llovizna fuerte", "fr": "Bruine forte", "de": "Starker Nieselregen", "it": "Pioggerella intensa", "pt": "Chuvisco forte", "nl": "Zware motregen",
        "ru": "Сильная морось", "zh": "大毛毛雨", "ja": "強い霧雨", "ko": "심한 이슬비", "tr": "Yoğun çisinti", "pl": "Gęsta mżawka",
        "id": "Gerimis lebat", "ar": "رذاذ كثيف", "fa": "نم‌نم باران شدید", "el": "Έντονο ψιλόβροχο", "hi": "भारी बूंदाबांदी", "bn": "ভারী গুঁড়ি বৃষ্টি", "ur": "شدید بوندا باندی"
    },
    "widget.weather.heavy_rain": {
        "es": "Lluvia fuerte", "fr": "Forte pluie", "de": "Starker Regen", "it": "Pioggia intensa", "pt": "Chuva forte", "nl": "Zware regen",
        "ru": "Сильный дождь", "zh": "大雨", "ja": "大雨", "ko": "폭우", "tr": "Şiddetli yağmur", "pl": "Silny deszcz",
        "id": "Hujan lebat", "ar": "مطر غزير", "fa": "باران شدید", "el": "Έντονη βροχή", "hi": "भारी बारिश", "bn": "ভারী বৃষ্টি", "ur": "شدید بارش"
    },
    "widget.weather.heavy_showers": {
        "es": "Chaparrones fuertes", "fr": "Fortes averses", "de": "Starke Schauer", "it": "Forti rovesci", "pt": "Chuvas fortes", "nl": "Zware buien",
        "ru": "Сильные ливни", "zh": "强阵雨", "ja": "激しい降り", "ko": "강한 소나기", "tr": "Şiddetli sağanak", "pl": "Silne opady",
        "id": "Hujan deras", "ar": "زخات غزيرة", "fa": "بارش‌های شدید", "el": "Έντονες καταιγίδες", "hi": "भारी बौछारें", "bn": "ভারী ঝরনা", "ur": "شدید بارش"
    },
    "widget.weather.heavy_snow": {
        "es": "Nevada fuerte", "fr": "Forte neige", "de": "Starker Schneefall", "it": "Neve intensa", "pt": "Neve forte", "nl": "Zware sneeuw",
        "ru": "Сильный снег", "zh": "大雪", "ja": "大雪", "ko": "폭설", "tr": "Yoğun kar", "pl": "Silny śnieg",
        "id": "Salju lebat", "ar": "ثلوج كثيفة", "fa": "برف شدید", "el": "Πυκνή χιονόπτωση", "hi": "भारी बर्फ", "bn": "ভারী তুষারপাত", "ur": "شدید برفباری"
    },
    "widget.weather.heavy_snow_showers": {
        "es": "Nevadas fuertes", "fr": "Fortes chutes de neige", "de": "Starke Schneeschauer", "it": "Forti nevicate", "pt": "Nevões fortes", "nl": "Zware sneeuwbuien",
        "ru": "Сильные снегопады", "zh": "强降雪", "ja": "激しい降雪", "ko": "강한 눈보라", "tr": "Şiddetli kar yağışı", "pl": "Silne opady śniegu",
        "id": "Salju deras", "ar": "زخات ثلج كثيفة", "fa": "بارش برف شدید", "el": "Έντονες χιονοπτώσεις", "hi": "भारी बर्फबारी", "bn": "ভারী তুষার ঝরনা", "ur": "شدید برف باری"
    },
    "widget.weather.light_drizzle": {
        "es": "Llovizna ligera", "fr": "Bruine légère", "de": "Leichter Nieselregen", "it": "Pioggerella leggera", "pt": "Chuvisco leve", "nl": "Lichte motregen",
        "ru": "Легкая морось", "zh": "小毛毛雨", "ja": "軽い霧雨", "ko": "가벼운 이슬비", "tr": "Hafif çisinti", "pl": "Lekka mżawka",
        "id": "Gerimis ringan", "ar": "رذاذ خفيف", "fa": "نم‌نم باران خفیف", "el": "Ελαφρύ ψιλόβροχο", "hi": "हल्की बूंदाबांदी", "bn": "হালকা গুঁড়ি বৃষ্টি", "ur": "ہلکی بوندا باندی"
    },
    "widget.weather.light_rain": {
        "es": "Lluvia ligera", "fr": "Pluie légère", "de": "Leichter Regen", "it": "Pioggia leggera", "pt": "Chuva leve", "nl": "Lichte regen",
        "ru": "Легкий дождь", "zh": "小雨", "ja": "小雨", "ko": "가벼운 비", "tr": "Hafif yağmur", "pl": "Lekki deszcz",
        "id": "Hujan ringan", "ar": "مطر خفيف", "fa": "باران خفیف", "el": "Ελαφριά βροχή", "hi": "हल्की बारिश", "bn": "হালকা বৃষ্টি", "ur": "ہلکی بارش"
    },
    "widget.weather.light_showers": {
        "es": "Chaparrones ligeros", "fr": "Averses légères", "de": "Leichte Schauer", "it": "Leggeri rovesci", "pt": "Chuvas leves", "nl": "Lichte buien",
        "ru": "Легкие ливни", "zh": "小阵雨", "ja": "軽い降り", "ko": "가벼운 소나기", "tr": "Hafif sağanak", "pl": "Lekkie opady",
        "id": "Hujan ringan", "ar": "زخات خفيفة", "fa": "بارش‌های خفیف", "el": "Ελαφριές καταιγίδες", "hi": "हल्की बौछारें", "bn": "হালকা ঝরনা", "ur": "ہلکی بارش"
    },
    "widget.weather.light_snow": {
        "es": "Nevada ligera", "fr": "Neige légère", "de": "Leichter Schneefall", "it": "Neve leggera", "pt": "Neve leve", "nl": "Lichte sneeuw",
        "ru": "Легкий снег", "zh": "小雪", "ja": "小雪", "ko": "가벼운 눈", "tr": "Hafif kar", "pl": "Lekki śnieg",
        "id": "Salju ringan", "ar": "ثلوج خفيفة", "fa": "برف خفیف", "el": "Ελαφριά χιονόπτωση", "hi": "हल्की बर्फ", "bn": "হালকা তুষারপাত", "ur": "ہلکی برفباری"
    },
    "widget.weather.mainly_clear": {
        "es": "Mayormente despejado", "fr": "Principalement dégagé", "de": "Überwiegend klar", "it": "Principalmente sereno", "pt": "Maioritariamente limpo", "nl": "Overwegend helder",
        "ru": "В основном ясно", "zh": "大部分晴朗", "ja": "概ね晴れ", "ko": "대체로 맑음", "tr": "Genellikle açık", "pl": "Przeważnie bezchmurnie",
        "id": "Sebagian besar cerah", "ar": "صافٍ في الغالب", "fa": "عمدتاً صاف", "el": "Κυρίως αίθριο", "hi": "मुख्यतः साफ", "bn": "প্রধানত পরিষ্কার", "ur": "زیادہ تر صاف"
    },
    "widget.weather.name": {
        "es": "Clima", "fr": "Météo", "de": "Wetter", "it": "Meteo", "pt": "Tempo", "nl": "Weer",
        "ru": "Погода", "zh": "天气", "ja": "天気", "ko": "날씨", "tr": "Hava", "pl": "Pogoda",
        "id": "Cuaca", "ar": "الطقس", "fa": "آب و هوا", "el": "Καιρός", "hi": "मौसम", "bn": "আবহাওয়া", "ur": "موسم"
    },
    "widget.weather.overcast": {
        "es": "Nublado", "fr": "Couvert", "de": "Bewölkt", "it": "Nuvoloso", "pt": "Encoberto", "nl": "Bewolkt",
        "ru": "Пасмурно", "zh": "阴天", "ja": "曇り", "ko": "흐림", "tr": "Kapalı", "pl": "Pochmurno",
        "id": "Mendung", "ar": "ملبد بالغيوم", "fa": "ابری", "el": "Συννεφιασμένος", "hi": "बादल छाए", "bn": "মেঘাচ্ছন্ন", "ur": "ابر آلود"
    },
    "widget.weather.partly_cloudy": {
        "es": "Parcialmente nublado", "fr": "Partiellement nuageux", "de": "Teilweise bewölkt", "it": "Parzialmente nuvoloso", "pt": "Parcialmente nublado", "nl": "Gedeeltelijk bewolkt",
        "ru": "Переменная облачность", "zh": "部分多云", "ja": "部分的に曇り", "ko": "부분적으로 흐림", "tr": "Parçalı bulutlu", "pl": "Częściowo pochmurno",
        "id": "Sebagian berawan", "ar": "غائم جزئيًا", "fa": "تا حدی ابری", "el": "Μερικώς συννεφιασμένος", "hi": "आंशिक रूप से बादल", "bn": "আংশিক মেঘলা", "ur": "جزوی طور پر ابرآلود"
    },
    "widget.weather.rain": {
        "es": "Lluvia", "fr": "Pluie", "de": "Regen", "it": "Pioggia", "pt": "Chuva", "nl": "Regen",
        "ru": "Дождь", "zh": "雨", "ja": "雨", "ko": "비", "tr": "Yağmur", "pl": "Deszcz",
        "id": "Hujan", "ar": "مطر", "fa": "باران", "el": "Βροχή", "hi": "बारिश", "bn": "বৃষ্টি", "ur": "بارش"
    },
    "widget.weather.showers": {
        "es": "Chaparrones", "fr": "Averses", "de": "Schauer", "it": "Rovesci", "pt": "Chuvas", "nl": "Buien",
        "ru": "Ливни", "zh": "阵雨", "ja": "にわか雨", "ko": "소나기", "tr": "Sağanak", "pl": "Opady",
        "id": "Hujan deras", "ar": "زخات", "fa": "بارش‌ها", "el": "Καταιγίδες", "hi": "बौछारें", "bn": "ঝরনা", "ur": "بارش"
    },
    "widget.weather.snow": {
        "es": "Nieve", "fr": "Neige", "de": "Schnee", "it": "Neve", "pt": "Neve", "nl": "Sneeuw",
        "ru": "Снег", "zh": "雪", "ja": "雪", "ko": "눈", "tr": "Kar", "pl": "Śnieg",
        "id": "Salju", "ar": "ثلج", "fa": "برف", "el": "Χιόνι", "hi": "बर्फ", "bn": "তুষার", "ur": "برف"
    },
    "widget.weather.snow_grains": {
        "es": "Granos de nieve", "fr": "Grains de neige", "de": "Schneegriesel", "it": "Grani di neve", "pt": "Grãos de neve", "nl": "Sneeuwkorrels",
        "ru": "Снежная крупа", "zh": "雪粒", "ja": "雪の粒", "ko": "눈알갱이", "tr": "Kar taneleri", "pl": "Ziarna śniegu",
        "id": "Butir salju", "ar": "حبيبات ثلج", "fa": "دانه‌های برف", "el": "Κόκκοι χιονιού", "hi": "बर्फ के कण", "bn": "তুষার দানা", "ur": "برف کے دانے"
    },
    "widget.weather.snow_showers": {
        "es": "Nevadas", "fr": "Chutes de neige", "de": "Schneeschauer", "it": "Nevicate", "pt": "Nevões", "nl": "Sneeuwbuien",
        "ru": "Снегопады", "zh": "降雪", "ja": "降雪", "ko": "눈보라", "tr": "Kar yağışı", "pl": "Opady śniegu",
        "id": "Salju turun", "ar": "زخات ثلج", "fa": "بارش برف", "el": "Χιονοπτώσεις", "hi": "बर्फबारी", "bn": "তুষার ঝরনা", "ur": "برف باری"
    },
    "widget.weather.thunderstorm": {
        "es": "Tormenta", "fr": "Orage", "de": "Gewitter", "it": "Temporale", "pt": "Trovoada", "nl": "Onweer",
        "ru": "Гроза", "zh": "雷暴", "ja": "雷雨", "ko": "뇌우", "tr": "Fırtına", "pl": "Burza",
        "id": "Badai petir", "ar": "عاصفة رعدية", "fa": "طوفان تندری", "el": "Καταιγίδα", "hi": "आंधी", "bn": "বজ্রঝড়", "ur": "طوفان"
    },
    "widget.weather.thunderstorm_hail": {
        "es": "Tormenta de granizo", "fr": "Orage de grêle", "de": "Hagelgewitter", "it": "Temporale con grandine", "pt": "Trovoada com granizo", "nl": "Onweer met hagel",
        "ru": "Гроза с градом", "zh": "雷暴冰雹", "ja": "雹を伴う雷雨", "ko": "우박 뇌우", "tr": "Dolu fırtınası", "pl": "Burza gradowa",
        "id": "Badai hujan es", "ar": "عاصفة برد", "fa": "طوفان تگرگ", "el": "Καταιγίδα με χαλάζι", "hi": "ओलावृष्टि तूफान", "bn": "শিলাবৃষ্টি ঝড়", "ur": "اولوں کا طوفان"
    },
    "widget.weather.unknown": {
        "es": "Desconocido", "fr": "Inconnu", "de": "Unbekannt", "it": "Sconosciuto", "pt": "Desconhecido", "nl": "Onbekend",
        "ru": "Неизвестно", "zh": "未知", "ja": "不明", "ko": "알 수 없음", "tr": "Bilinmeyen", "pl": "Nieznany",
        "id": "Tidak diketahui", "ar": "غير معروف", "fa": "ناشناخته", "el": "Άγνωστο", "hi": "अज्ञात", "bn": "অজানা", "ur": "نامعلوم"
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
    if (content['type.group']) delete content['type.group'];
    if (content['bookmark.visible_mobile']) delete content['bookmark.visible_mobile'];
    if (content['bookmark.visible_tablet']) delete content['bookmark.visible_tablet'];
    updated++;

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
