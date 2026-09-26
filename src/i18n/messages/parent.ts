/** The Parent Zone: PIN gate, dashboard, children, school topics, settings, report, content and health. */
import { f, s } from '../define';

export const parent = {
  'gate.title': s('Parent zone', 'Zon ibu bapa'),
  'gate.mascot': s('Grown-ups only! Enter your 4-digit parent PIN.', 'Orang dewasa sahaja! Masukkan PIN ibu bapa 4 digit.'),
  'gate.locked': f(
    (seconds: number) => `Too many tries. Wait ${seconds} seconds.`,
    (seconds: number) => `Terlalu banyak cubaan. Tunggu ${seconds} saat.`,
  ),
  'gate.wrong': s('Wrong PIN, try again.', 'PIN salah, cuba lagi.'),

  // Dashboard
  'dash.hi': f(
    (name: string) => `Hi, ${name}`,
    (name: string) => `Hai, ${name}`,
  ),
  'dash.thisWeek': s('This week', 'Minggu ini'),
  'dash.learningTime': s('learning time', 'masa belajar'),
  'dash.accuracy': s('Accuracy', 'Ketepatan'),
  'dash.streak': s('Streak', 'Rentetan'),
  'dash.best': f(
    (days: string) => `best ${days}`,
    (days: string) => `terbaik ${days}`,
  ),
  'dash.toReview': s('To review', 'Untuk diulang kaji'),
  'dash.tricky': s('tricky questions', 'soalan mencabar'),
  'dash.minutes': s('Minutes learning · last 7 days', 'Minit belajar · 7 hari lepas'),
  'dash.tapBar': s('Tap a bar to see minutes.', 'Ketik bar untuk melihat minit.'),
  'dash.timePerSubject': s('Time per subject · this week', 'Masa setiap subjek · minggu ini'),
  'dash.noTime': s('No learning time recorded this week yet.', 'Belum ada masa belajar direkodkan minggu ini.'),
  'dash.accuracyBySubject': s('Accuracy by subject', 'Ketepatan mengikut subjek'),
  'dash.noAnswers': s('No answers yet.', 'Belum ada jawapan.'),
  'dash.needsAttention': s('Needs attention · KSSR topics', 'Perlu perhatian · topik KSSR'),
  'dash.noWeak': s('No weak topics yet 🎉', 'Belum ada topik lemah 🎉'),
  'dash.noWeakHint': s(
    'Topics appear here when accuracy drops below 80% or questions keep coming back in review.',
    'Topik akan muncul di sini apabila ketepatan kurang daripada 80% atau soalan kerap muncul semula dalam ulang kaji.',
  ),
  'dash.weakMeta': f(
    (subject: string, answers: number, lapses: number) => `${subject} · ${answers} answers${lapses ? ` · ${lapses} repeat mistakes` : ''}`,
    (subject: string, answers: number, lapses: number) => `${subject} · ${answers} jawapan${lapses ? ` · ${lapses} kesilapan berulang` : ''}`,
  ),
  'dash.tryAtHome': s('Try at home', 'Cuba di rumah'),
  'dash.recent': s('Recent activity', 'Aktiviti terkini'),
  'dash.noQuizzes': s('No quizzes yet.', 'Belum ada kuiz.'),
  'dash.manage': s('Manage', 'Urus'),
  'dash.report': s('Weekly report', 'Laporan mingguan'),
  'dash.report.sub': f(
    (name: string) => `${name}'s week, ready to share on WhatsApp`,
    (name: string) => `Minggu ${name}, sedia untuk dikongsi di WhatsApp`,
  ),
  'dash.school': s('At school now', 'Di sekolah sekarang'),
  'dash.school.sub': f(
    (name: string) => `Topics ${name}'s class is on this week`,
    (name: string) => `Topik kelas ${name} minggu ini`,
  ),
  'dash.sheets': s('Practice sheets', 'Lembaran latihan'),
  'dash.sheets.sub': s('Print questions to practise on paper', 'Cetak soalan untuk berlatih di atas kertas'),
  'dash.children': s('Children', 'Anak-anak'),
  'dash.children.sub': s('Add, edit standard, language, reset', 'Tambah, tukar tahun, bahasa, set semula'),
  'dash.content': s('Content & sync', 'Kandungan & segerak'),
  'dash.content.sub': s('Syllabus updates, cloud backup', 'Kemas kini sukatan, sandaran awan'),
  'dash.health': s('App health', 'Kesihatan aplikasi'),
  'dash.health.sub': s('Crashes & performance', 'Ranap & prestasi'),
  'dash.settings': s('Settings', 'Tetapan'),
  'dash.settings.sub': s('Language, reminders, voice, rest days, PIN', 'Bahasa, peringatan, suara, hari rehat, PIN'),
  'dash.subjectStd': f(
    (subject: string, level: number) => `${subject} · Std ${level}`,
    (subject: string, level: number) => `${subject} · Thn ${level}`,
  ),
  'dash.qs': f(
    (n: number) => `(${n} Qs)`,
    (n: number) => `(${n} soalan)`,
  ),

  // Children & school topics
  'children.nameA11y': f(
    (name: string) => `${name}'s name`,
    (name: string) => `Nama ${name}`,
  ),
  'children.standard': s('Standard', 'Tahun'),
  'children.atSchool': s('At school now', 'Di sekolah sekarang'),
  'children.notSet': s('Not set yet — tell Bijak which topics the class is on.', 'Belum ditetapkan — beritahu Bijak topik yang sedang dipelajari di kelas.'),
  'children.setTopics': s('Set school topics', 'Tetapkan topik sekolah'),
  'children.reset': s('Reset progress', 'Set semula kemajuan'),
  'children.remove': s('Remove', 'Buang'),
  'children.resetQ': s('Reset progress?', 'Set semula kemajuan?'),
  'children.resetMsg': f(
    (name: string) => `All of ${name}'s XP, coins, badges and history will be cleared.`,
    (name: string) => `Semua XP, syiling, lencana dan sejarah ${name} akan dipadam.`,
  ),
  'children.removeQ': s('Remove learner?', 'Buang pelajar?'),
  'children.removeMsg': f(
    (name: string) => `${name} and all progress will be deleted from this device.`,
    (name: string) => `${name} dan semua kemajuan akan dipadam daripada peranti ini.`,
  ),
  'children.add': s('Add', 'Tambah'),
  'children.addLearner': s('Add a learner', 'Tambah pelajar'),
  'medium.label': s('Maths & Science at school are taught in', 'Matematik & Sains di sekolah diajar dalam'),
  'medium.en': s('English (DLP)', 'Bahasa Inggeris (DLP)'),
  'medium.ms': s('Bahasa Melayu', 'Bahasa Melayu'),
  'school.intro': f(
    (name: string, std: string) =>
      `Which topic is ${name}’s class on in ${std}? Bijak will practise it first and set quests for it. Check the textbook or homework, and update it when the class moves on.`,
    (name: string, std: string) =>
      `Topik apakah yang sedang dipelajari oleh kelas ${name} dalam ${std}? Bijak akan berlatih topik itu dahulu dan menetapkan misi untuknya. Semak buku teks atau kerja rumah, dan kemas kini apabila kelas beralih ke topik lain.`,
  ),
  'school.notSure': s('Not sure', 'Tidak pasti'),
  'school.noLearner': s('No learner to set up yet.', 'Belum ada pelajar untuk ditetapkan.'),

  // Settings
  'settings.language': s('App language', 'Bahasa aplikasi'),
  'settings.reminders': s('Reminders', 'Peringatan'),
  'settings.restDays': s('Streak rest days', 'Hari rehat rentetan'),
  'settings.restDaysHint': s(
    'Days that never break a streak (playing on them still counts). Pick your family’s weekend.',
    'Hari yang tidak memutuskan rentetan (bermain pada hari itu tetap dikira). Pilih hujung minggu keluarga anda.',
  ),
  'settings.rest.none': s('None', 'Tiada'),
  'settings.rest.satSun': s('Sat & Sun', 'Sabtu & Ahad'),
  'settings.rest.friSat': s('Fri & Sat', 'Jumaat & Sabtu'),
  'settings.voice': s('Read-aloud voice', 'Suara bacaan'),
  'settings.pin': s('Parent PIN', 'PIN ibu bapa'),
  'settings.newPin': s('Enter a new 4-digit PIN', 'Masukkan PIN baharu 4 digit'),
  'settings.againPin': s('Type the new PIN again', 'Taip PIN baharu sekali lagi'),
  'settings.pinMismatch': s('PINs don’t match. Type the new PIN again.', 'PIN tidak sepadan. Taip PIN baharu sekali lagi.'),
  'settings.changePin': s('Change PIN', 'Tukar PIN'),
  'settings.pinUpdated': s('PIN updated', 'PIN dikemas kini'),
  'settings.family': s('Family', 'Keluarga'),
  'settings.familyId': f(
    (id: string) => `Family ID ${id}`,
    (id: string) => `ID keluarga ${id}`,
  ),
  'settings.lock': s('Lock parent zone', 'Kunci zon ibu bapa'),

  // Reminders
  'rem.webOnly': s('Reminders work in the Bijak app on a phone or tablet.', 'Peringatan berfungsi dalam aplikasi Bijak pada telefon atau tablet.'),
  'rem.daily': s('Daily reminder', 'Peringatan harian'),
  'rem.daily.hint': f(
    (time: string) => `School days at ${time}, skipped once everyone has played`,
    (time: string) => `Hari sekolah pada ${time}, dilangkau jika semua sudah bermain`,
  ),
  'rem.streak': s('Save-the-streak nudge', 'Peringatan selamatkan rentetan'),
  'rem.streak.hint': f(
    (time: string) => `${time}, only when a streak would end tonight`,
    (time: string) => `${time}, hanya jika rentetan akan terputus malam ini`,
  ),
  'rem.weekly': s('Weekly report', 'Laporan mingguan'),
  'rem.weekly.hint': s('The evening before the school week', 'Petang sebelum minggu persekolahan'),
  'rem.blocked': s(
    'Notifications are turned off for Bijak. Allow them in your phone’s Settings, then try again.',
    'Pemberitahuan untuk Bijak dimatikan. Benarkan dalam Tetapan telefon anda, kemudian cuba lagi.',
  ),
  /** The Android notification channel's description (in the phone's app settings). */
  'rem.channel': s('Gentle study reminders and the weekly report', 'Peringatan belajar yang lembut dan laporan mingguan'),
  'rem.next': f(
    (when: string, title: string) => `Next: ${when} · ${title}`,
    (when: string, title: string) => `Seterusnya: ${when} · ${title}`,
  ),

  // Voices
  'voice.looking': s('Looking for voices…', 'Mencari suara…'),
  'voice.none': f(
    (language: string) => `No ${language} voice on this device yet. Bijak will use the system default.`,
    (language: string) => `Belum ada suara ${language} pada peranti ini. Bijak akan menggunakan suara lalai sistem.`,
  ),
  'voice.auto': s('Automatic (best)', 'Automatik (terbaik)'),
  'voice.standIn': s(
    'This device has no Malay voice, so Bijak reads Bahasa Melayu with an Indonesian voice, which sounds very close.',
    'Peranti ini tiada suara Bahasa Melayu, jadi Bijak membaca Bahasa Melayu dengan suara Bahasa Indonesia yang bunyinya sangat hampir.',
  ),
  'voice.tip': s(
    'Tap a voice to hear it. Voices come from this device: for the most natural sound, download an “Enhanced” or “Premium” voice (iPhone/iPad: Settings › Accessibility › Spoken Content › Voices) or Google voice data (Android: Settings › Accessibility › Text-to-speech), then tap Refresh.',
    'Ketik suara untuk mendengarnya. Suara datang daripada peranti ini: untuk bunyi yang paling semula jadi, muat turun suara “Enhanced” atau “Premium” (iPhone/iPad: Tetapan › Kebolehcapaian › Kandungan Lisan › Suara) atau data suara Google (Android: Tetapan › Kebolehcapaian › Teks ke pertuturan), kemudian ketik Muat semula.',
  ),
  'voice.refresh': s('Refresh voices', 'Muat semula suara'),
  'voice.lang.en': s('English', 'Bahasa Inggeris'),
  'voice.lang.ms': s('Bahasa Melayu', 'Bahasa Melayu'),
  'voice.premium': s('premium', 'premium'),
  'voice.enhanced': s('enhanced', 'dipertingkat'),
  'voice.online': s('needs internet', 'perlu internet'),

  // Weekly report
  'report.title': s('Weekly report', 'Laporan mingguan'),
  'report.addLearner': s('Add a learner to see their weekly report.', 'Tambah pelajar untuk melihat laporan mingguannya.'),
  'report.week': f(
    (name: string) => `${name}’s week`,
    (name: string) => `Minggu ${name}`,
  ),
  'report.time': s('Learning time', 'Masa belajar'),
  'report.days': s('Days active', 'Hari aktif'),
  'report.quizzes': s('Quizzes', 'Kuiz'),
  'report.correct': s('Correct', 'Betul'),
  'report.lastWeek': f(
    (value: string) => `last week ${value}`,
    (value: string) => `minggu lepas ${value}`,
  ),
  'report.streak': f(
    (n: number, best: number) => `🔥 ${n}-day streak (best ${best})`,
    (n: number, best: number) => `🔥 Rentetan ${n} hari (terbaik ${best})`,
  ),
  'report.bestSoFar': f(
    (best: number) => `Best streak so far: ${best} days`,
    (best: number) => `Rentetan terbaik setakat ini: ${best} hari`,
  ),
  'report.mastered': s('Mastered this week', 'Dikuasai minggu ini'),
  'report.noMastered': s(
    'No new topics mastered this week. Three stars on every quiz in a topic masters it.',
    'Tiada topik baharu dikuasai minggu ini. Tiga bintang dalam setiap kuiz sesuatu topik bermakna topik itu dikuasai.',
  ),
  'report.newBadges': f(
    (list: string) => `New badges: ${list}`,
    (list: string) => `Lencana baharu: ${list}`,
  ),
  'report.atSchool': s('At school now', 'Di sekolah sekarang'),
  'report.tellBijak': s(
    'Tell Bijak which topics the class is on, and it will practise them first.',
    'Beritahu Bijak topik yang dipelajari di kelas, dan Bijak akan berlatih topik itu dahulu.',
  ),
  'report.timeBySubject': s('Time by subject', 'Masa mengikut subjek'),
  'report.practise': s('Practise next', 'Latih seterusnya'),
  'report.nothing': s('Nothing stands out — keep going! 🎉', 'Tiada yang menonjol — teruskan! 🎉'),
  'report.pctCorrect': f(
    (n: number) => `${n}% correct`,
    (n: number) => `${n}% betul`,
  ),
  'report.tryAtHome': f(
    (activity: string) => `Try at home: ${activity}`,
    (activity: string) => `Cuba di rumah: ${activity}`,
  ),
  'report.printSheet': s('Print a practice sheet', 'Cetak lembaran latihan'),
  'report.share': s('Share', 'Kongsi'),
  'report.whatsapp': s('Share on WhatsApp', 'Kongsi di WhatsApp'),
  'report.shareOther': s('Share…', 'Kongsi…'),

  // Practice sheets
  'sheet.title': s('Practice sheet', 'Lembaran latihan'),
  'sheet.intro': s(
    'Print questions from any topic to practise away from the screen. The sheet is in the child’s school language, with the answers on the last page.',
    'Cetak soalan daripada mana-mana topik untuk berlatih tanpa skrin. Lembaran ini dalam bahasa sekolah anak, dengan jawapan di halaman terakhir.',
  ),
  'sheet.topic': s('Topic', 'Topik'),
  'sheet.practiseNext': s('Practise next (weak spots)', 'Latih seterusnya (titik lemah)'),
  'sheet.count': s('Questions', 'Bilangan soalan'),
  'sheet.all': f(
    (n: number) => `All ${n}`,
    (n: number) => `Semua ${n}`,
  ),
  'sheet.answers': s('Answer key on the last page', 'Skema jawapan di halaman terakhir'),
  'sheet.preview': s('Preview', 'Pratonton'),
  'sheet.more': f(
    (n: number) => `…and ${n} more`,
    (n: number) => `…dan ${n} lagi`,
  ),
  'sheet.shuffle': s('New questions', 'Soalan baharu'),
  'sheet.print': s('Print', 'Cetak'),
  'sheet.share': s('Share PDF', 'Kongsi PDF'),
  'sheet.empty': s('This topic has no questions yet.', 'Topik ini belum ada soalan.'),
  'sheet.failed': s('Couldn’t make the sheet. Please try again.', 'Tidak dapat menyediakan lembaran. Sila cuba lagi.'),

  // Content & sync
  'content.installed': s('Installed syllabus', 'Sukatan yang dipasang'),
  'content.counts': f(
    (subjects: number, topics: number) => `${subjects} subjects · ${topics} topics`,
    (subjects: number, topics: number) => `${subjects} subjek · ${topics} topik`,
  ),
  'content.downloaded': s('downloaded', 'dimuat turun'),
  'content.updates': s('Syllabus updates', 'Kemas kini sukatan'),
  'content.help': s(
    'Point Bijak at a folder containing manifest.json and standards/*.json (e.g. a GitHub raw URL, Supabase Storage or any static host). New or updated standards download in the background — no app store update needed.',
    'Halakan Bijak ke folder yang mengandungi manifest.json dan standards/*.json (cth. URL GitHub raw, Supabase Storage atau mana-mana hos statik). Tahun baharu atau yang dikemas kini dimuat turun di latar belakang — tidak perlu kemas kini di gedung aplikasi.',
  ),
  'content.url': s('Content URL', 'URL kandungan'),
  'content.check': s('Save & check now', 'Simpan & semak sekarang'),
  'content.updated': f(
    (list: string) => `Updated: ${list}`,
    (list: string) => `Dikemas kini: ${list}`,
  ),
  'content.upToDate': s('Syllabus is up to date', 'Sukatan sudah terkini'),
  'content.builtIn': s('Use built-in only', 'Guna yang terbina sahaja'),
  'content.lastChecked': f(
    (when: string) => `Last checked ${when}`,
    (when: string) => `Kali terakhir disemak ${when}`,
  ),
  'content.ota': s('Check for app update (OTA)', 'Semak kemas kini aplikasi (OTA)'),
  'content.ota.none': s('App is up to date.', 'Aplikasi sudah terkini.'),
  'content.ota.downloaded': s('Update downloaded — it applies next launch.', 'Kemas kini dimuat turun — ia akan digunakan apabila aplikasi dibuka semula.'),
  'content.ota.disabled': s('OTA updates are off in this build (enable with EAS Update).', 'Kemas kini OTA dimatikan dalam binaan ini (aktifkan dengan EAS Update).'),
  'content.backup': s('Cloud backup', 'Sandaran awan'),
  'content.backupHelp': s(
    'Progress is saved on this device first and backed up to your Supabase project whenever you’re online.',
    'Kemajuan disimpan pada peranti ini dahulu dan disandarkan ke projek Supabase anda apabila dalam talian.',
  ),
  'content.lastBackup': f(
    (when: string) => `Last backup: ${when}`,
    (when: string) => `Sandaran terakhir: ${when}`,
  ),
  'content.notBackedUp': s('Not backed up yet', 'Belum disandarkan'),
  'content.backupNow': s('Back up now', 'Sandarkan sekarang'),
  'content.offlineOnly': s(
    'Everything is stored offline on this device. To enable cloud backup, set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (see docs/SETUP.md).',
    'Semua data disimpan secara luar talian pada peranti ini. Untuk mengaktifkan sandaran awan, tetapkan EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_ANON_KEY (lihat docs/SETUP.md).',
  ),
  'sync.notConfigured': s('Cloud sync is not configured', 'Segerak awan belum ditetapkan'),
  'sync.noFamily': s('No family yet', 'Belum ada keluarga'),
  'sync.upToDate': s('Already up to date', 'Sudah terkini'),
  'sync.busy': s('Sync in progress', 'Segerak sedang berjalan'),
  'sync.offline': s('Offline — will sync later', 'Luar talian — akan disegerakkan kemudian'),
  'sync.synced': s('Synced', 'Sudah disegerakkan'),
  'sync.failed': f(
    (detail: string) => `Sync failed: ${detail}`,
    (detail: string) => `Segerak gagal: ${detail}`,
  ),

  // App health
  'health.note': s(
    'Collected on this device only. Nothing is sent anywhere unless you add a telemetry sink.',
    'Dikumpul pada peranti ini sahaja. Tiada apa-apa dihantar ke mana-mana melainkan anda menambah penerima telemetri.',
  ),
  'health.slowest': s('Slowest screens · avg load', 'Skrin paling perlahan · purata masa muat'),
  'health.noData': s('No data yet.', 'Belum ada data.'),
  'health.jank': s('Dropped frames by feature', 'Bingkai tercicir mengikut ciri'),
  'health.longFrames': f(
    (n: number) => `${n} long frames`,
    (n: number) => `${n} bingkai panjang`,
  ),
  'health.smooth': s('Smooth so far — no jank bursts recorded. 🎉', 'Lancar setakat ini — tiada gangguan direkodkan. 🎉'),
  'health.errors': f(
    (n: number) => `Errors (${n})`,
    (n: number) => `Ralat (${n})`,
  ),
  'health.noCrashes': s('No crashes recorded ✅', 'Tiada ranap direkodkan ✅'),
  'health.clear': s('Clear report', 'Kosongkan laporan'),
};
