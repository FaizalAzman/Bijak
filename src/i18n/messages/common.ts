/** Words used all over the app, plus the tab bar, errors and small shared components. */
import { f, s } from '../define';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const common = {
  'common.back': s('Back', 'Kembali'),
  'common.close': s('Close', 'Tutup'),
  'common.continue': s('Continue', 'Teruskan'),
  'common.cancel': s('Cancel', 'Batal'),
  'common.delete': s('Delete', 'Padam'),
  'common.yes': s('Yes', 'Ya'),
  'common.none': s('None', 'Tiada'),
  'common.new': s('New', 'Baharu'),
  'common.mastered': s('Mastered', 'Dikuasai'),
  'common.masteredTick': s('Mastered ✓', 'Dikuasai ✓'),
  'common.inProgress': s('In progress', 'Sedang belajar'),
  'common.comingSoon': s('Coming soon ✨', 'Akan datang ✨'),
  'common.notFound': s('Not found', 'Tidak dijumpai'),
  'common.standard': f(
    (n: number) => `Standard ${n}`,
    (n: number) => `Tahun ${n}`,
  ),
  'common.level': f(
    (n: number) => `Level ${n}`,
    (n: number) => `Tahap ${n}`,
  ),
  'common.days': f(
    (n: number) => plural(n, 'day'),
    (n: number) => `${n} hari`,
  ),
  'common.questions': f(
    (n: number) => plural(n, 'question'),
    (n: number) => `${n} soalan`,
  ),
  'common.quizzes': f(
    (n: number) => plural(n, 'quiz', 'quizzes'),
    (n: number) => `${n} kuiz`,
  ),
  'common.answers': f(
    (n: number) => plural(n, 'answer'),
    (n: number) => `${n} jawapan`,
  ),
  'common.minutes': f(
    (n: number) => `${n} min`,
    (n: number) => `${n} min`,
  ),
  'common.buyFor': f(
    (price: number) => `Buy · ${price} 🪙`,
    (price: number) => `Beli · ${price} 🪙`,
  ),
  /** "4h 12m" until midnight. */
  'common.hoursMinutes': f(
    (h: number, m: number) => `${h}h ${m}m`,
    (h: number, m: number) => `${h}j ${m}m`,
  ),
  'common.and': s('and', 'dan'),

  /** Locale for dates and numbers. */
  'date.locale': s('en-MY', 'ms-MY'),
  'date.weekday': f(
    (d: number) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d],
    (d: number) => ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'][d],
  ),
  'date.weekdayShort': f(
    (d: number) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d],
    (d: number) => ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'][d],
  ),
  'date.monthShort': f(
    (m: number) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m],
    (m: number) => ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'][m],
  ),
  'date.weekdayInitial': f(
    (d: number) => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d],
    (d: number) => ['A', 'I', 'S', 'R', 'K', 'J', 'S'][d],
  ),

  'tabs.home': s('Home', 'Utama'),
  'tabs.learn': s('Learn', 'Belajar'),
  'tabs.quests': s('Quests', 'Misi'),
  'tabs.shop': s('Shop', 'Kedai'),
  'tabs.me': s('Me', 'Saya'),

  'lang.pickerTitle': s('Language', 'Bahasa'),
  'lang.hint': s(
    'For buttons, messages and reports. Lessons follow each child’s school language.',
    'Untuk butang, mesej dan laporan. Pelajaran mengikut bahasa sekolah setiap anak.',
  ),

  'error.title': s('Oops! Something tripped.', 'Alamak! Ada sesuatu yang tersilap.'),
  'error.body': s('Sang Kancil has told the grown-ups. Let’s try again.', 'Sang Kancil sudah beritahu orang dewasa. Jom cuba lagi.'),
  'error.retry': s('Try again', 'Cuba lagi'),
  'notFound.title': s('Hmm, I’m lost!', 'Alamak, saya sesat!'),
  'notFound.home': s('Go home', 'Balik ke Utama'),

  'tier.rookie': s('Rookie', 'Pemula'),
  'tier.explorer': s('Explorer', 'Penjelajah'),
  'tier.scholar': s('Scholar', 'Cendekia'),
  'tier.champion': s('Champion', 'Juara'),
  'tier.legend': s('Legend', 'Lagenda'),
};
