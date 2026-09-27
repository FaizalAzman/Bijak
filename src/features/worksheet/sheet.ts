/**
 * Printable practice sheets: questions from a topic (or a few weak topics) laid out for pencil
 * and paper, in the child's teaching language, with an answer key on its own last page.
 * Pure functions: the Parent Zone screen turns the HTML into a PDF (expo-print) to print or share.
 */
import { answerLines } from '@/components/quiz/types';
import type { ContentIndex } from '@/features/content/registry';
import { buildQuizQuestions, questionKey } from '@/features/content/registry';
import type { Lang, Question } from '@/features/content/schema';
import { standardName, subjectName } from '@/i18n/names';
import { shortDate } from '@/i18n/core';
import { seeded, shuffle, shuffleNotIdentity } from '@/lib/random';

export const SHEET_SIZES = [10, 15, 20] as const;
/**
 * A4 at 72 PPI, the paper Malaysian schools and homes use. The margins (16 mm × 14 mm) are for
 * iOS, which ignores the sheet's CSS page margins; Android and browsers use the CSS.
 */
export const A4 = { width: 595, height: 842, margins: { top: 45, right: 40, bottom: 45, left: 40 } } as const;

/** Words on the sheet itself follow the lesson's language, like the quiz engines. */
const TEXT = {
  en: {
    name: 'Name',
    date: 'Date',
    score: 'Score',
    answers: 'Answer key',
    wordBank: 'Word bank',
    sortThese: 'Sort these',
    true: 'True',
    false: 'False',
    madeWith: 'Made with Bijak',
    instruction: {
      mcq: 'Circle the answer.',
      trueFalse: 'Circle True or False.',
      match: 'Draw lines to match.',
      order: 'Write them in the right order.',
      sort: 'Write each one in its group.',
      fillBlank: 'Fill in the blanks.',
      numpad: 'Write the answer.',
    },
  },
  ms: {
    name: 'Nama',
    date: 'Tarikh',
    score: 'Markah',
    answers: 'Skema jawapan',
    wordBank: 'Kotak perkataan',
    sortThese: 'Susun ini',
    true: 'Betul',
    false: 'Salah',
    madeWith: 'Dibuat dengan Bijak',
    instruction: {
      mcq: 'Bulatkan jawapan.',
      trueFalse: 'Bulatkan Betul atau Salah.',
      match: 'Lukis garisan untuk padankan.',
      order: 'Tulis mengikut urutan yang betul.',
      sort: 'Tulis setiap satu dalam kumpulannya.',
      fillBlank: 'Isi tempat kosong.',
      numpad: 'Tulis jawapan.',
    },
  },
} as const satisfies Record<Lang, unknown>;

export interface Worksheet {
  /** Topic title(s), e.g. "Fractions" or "Time · Money". */
  title: string;
  /** "Standard 3 · Mathematics" (in the sheet's language). */
  subtitle: string;
  lang: Lang;
  child: string;
  /** "2026-03-02" */
  day: string;
  questions: Question[];
  /** How many different questions the topics have (the most a sheet can hold). */
  available: number;
  answers: boolean;
}

export interface SheetOptions {
  child: string;
  /** One topic, or a few (e.g. the report's weak spots). Unknown ids are skipped. */
  topicIds: string[];
  count: number;
  answers: boolean;
  seed: number;
  day: string;
}

/** The sheet sizes on offer for a topic with `available` questions: the ones it can fill, then "all". */
export function sheetSizes(available: number): number[] {
  const fits = SHEET_SIZES.filter((n) => n < available);
  return available <= SHEET_SIZES[SHEET_SIZES.length - 1] ? [...fits, available] : fits;
}

/** Picks `count` questions from the topics' quizzes (authored and generated), mixed and without repeats. */
export function buildWorksheet(index: ContentIndex, o: SheetOptions): Worksheet | null {
  const refs = o.topicIds.map((id) => index.topic(id)).filter((r) => r !== undefined);
  if (!refs.length) return null;
  const rng = seeded(o.seed);
  const seen = new Set<string>();
  const pool: Question[] = [];
  for (const { topic } of refs) {
    for (const quiz of topic.quizzes) {
      if (quiz.mode === 'timeAttack') continue;
      for (const q of buildQuizQuestions(quiz, rng)) {
        const key = questionKey(quiz.id, q);
        if (seen.has(key)) continue;
        seen.add(key);
        pool.push(q);
      }
    }
  }
  if (!pool.length) return null;
  const [first] = refs;
  const lang = first.subject.lang;
  const subjects = [...new Set(refs.map((r) => subjectName(r.subject, lang)))];
  return {
    title: refs.map((r) => r.topic.title).join(' · '),
    subtitle: [standardName(first.standard, lang), ...subjects].join(' · '),
    lang,
    child: o.child,
    day: o.day,
    questions: shuffle(pool, rng).slice(0, Math.max(1, Math.floor(o.count))),
    available: pool.length,
    answers: o.answers,
  };
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const label = (o: { emoji?: string; text?: string }) => escape([o.emoji, o.text].filter(Boolean).join(' '));
const LETTERS = 'abcdef';

/** A question's answer space; its words follow the question's own language (sheets can mix). */
function body(q: Question, n: number): string {
  const text = TEXT[q.lang];
  // Never print a scramble in its answer order.
  const rng = seeded(n * 7919 + q.prompt.length);
  const mix = <T>(items: readonly T[]) => shuffleNotIdentity(items, rng);
  switch (q.type) {
    case 'mcq':
      return `<div class="options">${q.options.map((o, i) => `<span class="option"><b>${LETTERS[i]})</b> ${label(o)}</span>`).join('')}</div>`;
    case 'trueFalse':
      return `<div class="options"><span class="option">${text.true}</span><span class="option">${text.false}</span></div>`;
    case 'numpad':
      return `<div class="answer-line">${q.unit === 'RM' ? 'RM ' : ''}<span class="line"></span>${q.unit && q.unit !== 'RM' ? ` ${escape(q.unit)}` : ''}</div>`;
    case 'fillBlank':
      return `<p class="sentence">${escape(q.text).replace(/_{3,}/g, '<span class="blank"></span>')}</p><div class="bank"><b>${text.wordBank}:</b> ${mix(q.bank).map(escape).join(' · ')}</div>`;
    case 'order':
      return `<div class="chips">${mix([...q.tokens, ...q.distractors])
        .map((t) => `<span class="chip">${escape(t)}</span>`)
        .join('')}</div><div class="answer-line wide"><span class="line"></span></div>`;
    case 'match': {
      const rights = mix(q.pairs.map((p) => p.right));
      return `<table class="match">${q.pairs.map((p, i) => `<tr><td>${escape(p.left)} ●</td><td></td><td>● ${escape(rights[i])}</td></tr>`).join('')}</table>`;
    }
    case 'sort':
      return `<div class="bank"><b>${text.sortThese}:</b> ${mix(q.items.map((i) => i.text))
        .map(escape)
        .join(' · ')}</div><table class="sort"><tr>${q.buckets.map((b) => `<th>${label({ emoji: b.emoji, text: b.label })}</th>`).join('')}</tr><tr>${q.buckets.map(() => '<td></td>').join('')}</tr></table>`;
  }
}

const STYLE = `
@page { size: A4; margin: 16mm 14mm; }
* { box-sizing: border-box; }
body { font-family: -apple-system, Roboto, 'Segoe UI', 'Noto Sans', sans-serif; color: #16140F; font-size: 13pt; line-height: 1.4; margin: 0; }
header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #16140F; padding-bottom: 6px; margin-bottom: 10px; }
.brand { font-weight: 800; font-size: 20pt; letter-spacing: -0.5px; }
.brand span { color: #F26B3A; }
h1 { font-size: 16pt; margin: 0; text-align: right; }
.sub { font-size: 10pt; color: #5C574D; text-align: right; }
.fields { display: flex; gap: 18px; font-size: 11pt; margin: 8px 0 14px; }
.fields span { flex: 1; border-bottom: 1px solid #16140F; padding-bottom: 2px; }
ol { padding-left: 30px; margin: 0; }
li { margin: 0 0 14px; page-break-inside: avoid; }
.how { font-size: 9pt; color: #5C574D; text-transform: uppercase; letter-spacing: 0.6px; }
.prompt { font-weight: 700; }
.visual { font-size: 22pt; margin-right: 6px; }
.options { display: flex; flex-wrap: wrap; gap: 8px 22px; margin-top: 4px; }
.option { border: 1.5px solid #16140F; border-radius: 999px; padding: 2px 12px; }
.answer-line { margin-top: 8px; }
.line { display: inline-block; width: 140px; border-bottom: 1.5px solid #16140F; height: 18px; vertical-align: bottom; }
.answer-line.wide .line { width: 100%; }
.blank { display: inline-block; width: 90px; border-bottom: 1.5px solid #16140F; height: 16px; vertical-align: bottom; margin: 0 3px; }
.sentence { margin: 4px 0; }
.bank { font-size: 11pt; border: 1px dashed #16140F; border-radius: 8px; padding: 4px 10px; margin-top: 6px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.chip { border: 1.5px solid #16140F; border-radius: 8px; padding: 1px 8px; }
table { border-collapse: collapse; margin-top: 6px; }
table.match td { padding: 4px 6px; }
table.match td:nth-child(2) { width: 90px; }
table.sort { width: 100%; }
table.sort th, table.sort td { border: 1.5px solid #16140F; padding: 4px 8px; text-align: left; width: 33%; }
table.sort td { height: 60px; }
.key { page-break-before: always; }
.key h2 { font-size: 14pt; margin: 0 0 8px; }
.key li { margin-bottom: 4px; }
footer { margin-top: 18px; font-size: 9pt; color: #5C574D; text-align: center; }
`;

/** The sheet as a self-contained HTML page, ready for expo-print. */
export function worksheetHtml(s: Worksheet): string {
  const text = TEXT[s.lang];
  const d = new Date(`${s.day}T12:00:00`);
  const date = `${shortDate(s.day, s.lang)} ${d.getFullYear()}`;
  const items = s.questions
    .map(
      (q, i) =>
        `<li><div class="how">${TEXT[q.lang].instruction[q.type]}</div><div class="prompt">${q.visual ? `<span class="visual">${escape(q.visual)}</span>` : ''}${escape(q.prompt)}</div>${body(q, i)}</li>`,
    )
    .join('');
  const key = s.answers ? `<section class="key"><h2>${text.answers} · ${escape(s.title)}</h2><ol>${s.questions.map((q) => `<li>${answerLines(q).map(escape).join('; ')}</li>`).join('')}</ol></section>` : '';
  return `<!DOCTYPE html><html lang="${s.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(s.title)}</title><style>${STYLE}</style></head><body>
<header><div class="brand">bijak<span>.</span></div><div><h1>${escape(s.title)}</h1><div class="sub">${escape(s.subtitle)}</div></div></header>
<div class="fields"><span>${text.name}: ${escape(s.child)}</span><span>${text.date}: ${date}</span><span>${text.score}: ____ / ${s.questions.length}</span></div>
<ol>${items}</ol>
<footer>${text.madeWith}</footer>
${key}
</body></html>`;
}
