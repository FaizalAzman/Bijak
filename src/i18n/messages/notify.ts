/** Reminder notifications, the shared weekly report, times and durations, lesson labels and voices. */
import { f, s } from '../define';

const twelve = (h: number) => h % 12 || 12;
const mm = (m: number) => String(m).padStart(2, '0');
/** Malaysian times of day: pagi, tengah hari, petang, malam. */
const bahagian = (h: number) => (h < 12 ? 'pagi' : h < 14 ? 'tengah hari' : h < 19 ? 'petang' : 'malam');

export const notify = {
  // Times and durations
  'time.clock': f(
    (h: number, m: number) => `${twelve(h)}:${mm(m)} ${h < 12 ? 'am' : 'pm'}`,
    (h: number, m: number) => `${twelve(h)}:${mm(m)} ${bahagian(h)}`,
  ),
  'time.duration': f(
    (minutes: number) => (minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`),
    (minutes: number) => (minutes >= 60 ? `${Math.floor(minutes / 60)} j ${minutes % 60} min` : `${minutes} min`),
  ),

  // Reminders
  'notify.daily.title': s('Time for Bijak 📚', 'Masa untuk Bijak 📚'),
  'notify.daily.one': f(
    (name: string) => `${name}’s quests are ready. Ten minutes is plenty!`,
    (name: string) => `Misi ${name} sudah sedia. Sepuluh minit pun cukup!`,
  ),
  'notify.daily.oneStreak': f(
    (name: string, days: number) => `${name}’s quests are ready, and a ${days}-day streak to keep going!`,
    (name: string, days: number) => `Misi ${name} sudah sedia, dan ada rentetan ${days} hari untuk diteruskan!`,
  ),
  'notify.daily.many': f(
    (names: string, streaks: boolean) => `Quests are ready for ${names}.${streaks ? ' Keep those streaks going!' : ' Ten minutes each is plenty!'}`,
    (names: string, streaks: boolean) => `Misi sudah sedia untuk ${names}.${streaks ? ' Teruskan rentetan itu!' : ' Sepuluh minit seorang pun cukup!'}`,
  ),
  'notify.streak.oneTitle': f(
    (name: string, days: number) => `🔥 Keep ${name}’s ${days}-day streak`,
    (name: string, days: number) => `🔥 Kekalkan rentetan ${days} hari ${name}`,
  ),
  'notify.streak.oneBody': s('One quick quiz before bed keeps it going.', 'Satu kuiz ringkas sebelum tidur akan mengekalkannya.'),
  'notify.streak.manyTitle': s('🔥 Keep the streaks going', '🔥 Kekalkan rentetan itu'),
  'notify.streak.manyBody': f(
    (list: string) => `${list} haven’t played today. One quick quiz each keeps them going.`,
    (list: string) => `${list} belum bermain hari ini. Satu kuiz ringkas seorang akan mengekalkannya.`,
  ),
  'notify.streak.childDays': f(
    (name: string, days: number) => `${name} (${days} days)`,
    (name: string, days: number) => `${name} (${days} hari)`,
  ),
  'notify.weekly.title': s('📊 Your weekly Bijak report', '📊 Laporan mingguan Bijak anda'),
  'notify.weekly.body': f(
    (names: string) => `See what ${names} learned this week, and what to practise next.`,
    (names: string) => `Lihat apa yang ${names} pelajari minggu ini, dan apa yang perlu dilatih seterusnya.`,
  ),

  // The weekly report as a WhatsApp message
  'share.heading': f(
    (name: string, range: string) => `📊 *${name}’s week on Bijak* (${range})`,
    (name: string, range: string) => `📊 *Minggu ${name} di Bijak* (${range})`,
  ),
  'share.quiet': s('No learning yet this week. A few minutes a day is all it takes!', 'Belum ada pembelajaran minggu ini. Beberapa minit sehari pun sudah memadai!'),
  'share.time': f(
    (time: string, days: number, before: string) => `⏱️ ${time} over ${days} day${days === 1 ? '' : 's'} (last week: ${before})`,
    (time: string, days: number, before: string) => `⏱️ ${time} dalam ${days} hari (minggu lepas: ${before})`,
  ),
  'share.quizzes': f(
    (n: number, accuracy: number | null, before: number | null) =>
      `✅ ${n} quiz${n === 1 ? '' : 'zes'}${accuracy !== null ? ` · ${accuracy}% correct` : ''}${before !== null ? ` (last week: ${before}%)` : ''}`,
    (n: number, accuracy: number | null, before: number | null) =>
      `✅ ${n} kuiz${accuracy !== null ? ` · ${accuracy}% betul` : ''}${before !== null ? ` (minggu lepas: ${before}%)` : ''}`,
  ),
  'share.streak': f(
    (n: number, best: number) => `🔥 Streak: ${n} day${n === 1 ? '' : 's'} (best ${best})`,
    (n: number, best: number) => `🔥 Rentetan: ${n} hari (terbaik ${best})`,
  ),
  'share.mastered': f(
    (list: string) => `🏆 Mastered: ${list}`,
    (list: string) => `🏆 Dikuasai: ${list}`,
  ),
  'share.badges': f(
    (list: string) => `🎖️ New badges: ${list}`,
    (list: string) => `🎖️ Lencana baharu: ${list}`,
  ),
  'share.atSchool': f(
    (subject: string, title: string, status: string) => `🏫 At school: ${subject} – ${title} ${status}`,
    (subject: string, title: string, status: string) => `🏫 Di sekolah: ${subject} – ${title} ${status}`,
  ),
  'share.masteredTick': s('(mastered ✓)', '(dikuasai ✓)'),
  'share.practise': f(
    (title: string, subject: string, accuracy: number) => `💡 Practise next: ${title} (${subject}, ${accuracy}% correct)`,
    (title: string, subject: string, accuracy: number) => `💡 Latih seterusnya: ${title} (${subject}, ${accuracy}% betul)`,
  ),
  'share.tryAtHome': f(
    (activity: string) => `   Try at home: ${activity}`,
    (activity: string) => `   Cuba di rumah: ${activity}`,
  ),
  'share.footer': s('_Sent from Bijak_', '_Dihantar dari Bijak_'),

  // Lesson cards (in the lesson's own language)
  'lesson.tip': s('Tip', 'Petua'),
  'lesson.remember': s('Remember', 'Ingat'),
  'lesson.funFact': s('Fun fact', 'Fakta menarik'),
  'lesson.example': s('Example', 'Contoh'),
  'lesson.exampleOf': f(
    (title: string) => `Example · ${title}`,
    (title: string) => `Contoh · ${title}`,
  ),
  'lesson.listen': f(
    (text: string) => `Listen: ${text}`,
    (text: string) => `Dengar: ${text}`,
  ),
  'lesson.place': f(
    (i: number) => ['Ones', 'Tens', 'Hundreds', 'Thousands', 'Ten thousands', 'Hundred thousands', 'Millions'][i],
    (i: number) => ['Sa', 'Puluh', 'Ratus', 'Ribu', 'Puluh ribu', 'Ratus ribu', 'Juta'][i],
  ),

  // Voice accents, for the parent's voice picker
  'region.en-gb': s('British English', 'Bahasa Inggeris British'),
  'region.en-us': s('American English', 'Bahasa Inggeris Amerika'),
  'region.en-au': s('Australian English', 'Bahasa Inggeris Australia'),
  'region.en-nz': s('New Zealand English', 'Bahasa Inggeris New Zealand'),
  'region.en-ie': s('Irish English', 'Bahasa Inggeris Ireland'),
  'region.en-in': s('Indian English', 'Bahasa Inggeris India'),
  'region.en-za': s('South African English', 'Bahasa Inggeris Afrika Selatan'),
  'region.en-sg': s('Singapore English', 'Bahasa Inggeris Singapura'),
  'region.ms-my': s('Bahasa Melayu', 'Bahasa Melayu'),
  'region.id-id': s('Bahasa Indonesia', 'Bahasa Indonesia'),
};
