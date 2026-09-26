/**
 * Read-aloud that sounds like a person, not a robot.
 *
 * 1. The voice: phones ship several voices per language, from old "compact" and novelty
 *    voices to natural neural ones. We rank what the device has and use the best, and read
 *    Bahasa Melayu with an Indonesian voice where no Malay one exists (iPhones), since the
 *    two sound very close.
 * 2. The words: a speech engine reads "4 725" as "four, seven hundred and twenty-five",
 *    "RM18.50" as "R M eighteen point five zero" and "1/2" as a date. We rewrite what is
 *    said the way a teacher would read it aloud.
 */

import { translate, type MessageKey, type UiLang } from '@/i18n/core';

export type SpeechLang = 'en' | 'ms';

/** The fields of an installed voice we use (expo-speech `Voice`). */
export interface VoiceInfo {
  identifier: string;
  name: string;
  quality: string;
  language: string;
}

/** Tag used when no voice list is available yet. */
export const LANG_TAG: Record<SpeechLang, string> = { en: 'en-GB', ms: 'ms-MY' };

/** A touch slower than conversation for young readers; natural pitch (shifting it sounds synthetic). */
export const RATE = 0.95;
export const PITCH = 1;

/** Language families that can read each language, best first. */
const FAMILIES: Record<SpeechLang, string[]> = { en: ['en'], ms: ['ms', 'id'] };
/** Accents closest to how Malaysian children hear the language. */
const ACCENTS: Record<SpeechLang, string[]> = { en: ['en-gb', 'en-au', 'en-nz', 'en-ie', 'en-us'], ms: ['ms-my', 'ms'] };

/** Joke and legacy voices that are unmistakably robotic. */
const ROBOTIC_NAMES =
  /^(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|fred|good news|hysterical|jester|junior|kathy|organ|pipe organ|ralph|superstar|trinoids|whisper|wobble|zarvox)\b/i;
const ROBOTIC_ENGINES = /espeak|pico|eloquence/i;

const tagOf = (v: VoiceInfo) => v.language.toLowerCase().replace(/_/g, '-');

/** How good a voice is for `lang`; null if it can't read the language at all. */
export function voiceScore(v: VoiceInfo, lang: SpeechLang): number | null {
  const tag = tagOf(v);
  const family = FAMILIES[lang].indexOf(tag.split('-')[0]);
  if (family < 0) return null;
  const id = `${v.identifier} ${v.name}`;
  let score = (FAMILIES[lang].length - family) * 1000;
  const accent = ACCENTS[lang].indexOf(tag);
  if (accent >= 0) score += (ACCENTS[lang].length - accent) * 3;
  if (v.quality === 'Enhanced') score += 40;
  if (/premium/i.test(id)) score += 60;
  else if (/enhanced|neural|natural|wavenet|studio/i.test(id)) score += 40;
  if (/siri/i.test(id)) score += 30;
  // Browser voices from Google / Microsoft "Online" are neural.
  if (/^google\b|microsoft .*online/i.test(v.name)) score += 25;
  // Android network voices stop working offline; the local twin sounds the same.
  if (/network/i.test(v.identifier)) score -= 5;
  if (/compact/i.test(v.identifier)) score -= 20;
  if (ROBOTIC_ENGINES.test(id)) score -= 300;
  if (ROBOTIC_NAMES.test(v.name.trim())) score -= 500;
  return score;
}

/** Voices that can read `lang`, best first (ties broken by name, so the pick is stable). */
export function rankVoices(voices: readonly VoiceInfo[], lang: SpeechLang): VoiceInfo[] {
  return voices
    .map((v) => ({ v, score: voiceScore(v, lang) }))
    .filter((x): x is { v: VoiceInfo; score: number } => x.score !== null)
    .sort((a, b) => b.score - a.score || a.v.name.localeCompare(b.v.name) || a.v.identifier.localeCompare(b.v.identifier))
    .map((x) => x.v);
}

/** Keep only a voice id per known language (unset = automatic). */
export function cleanVoiceChoices(choices: unknown): Partial<Record<SpeechLang, string>> {
  const out: Partial<Record<SpeechLang, string>> = {};
  if (!choices || typeof choices !== 'object') return out;
  for (const lang of Object.keys(LANG_TAG) as SpeechLang[]) {
    const id = (choices as Record<string, unknown>)[lang];
    if (typeof id === 'string' && id.trim() && id.length <= 300) out[lang] = id;
  }
  return out;
}

/** The parent's chosen voice if the device still has it, else the best one (null if none). */
export function pickVoice(voices: readonly VoiceInfo[], lang: SpeechLang, preferred?: string): VoiceInfo | null {
  const chosen = preferred ? voices.find((v) => v.identifier === preferred) : undefined;
  if (chosen && voiceScore(chosen, lang) !== null) return chosen;
  return rankVoices(voices, lang)[0] ?? null;
}

const REGION_KEY = {
  'en-gb': 'region.en-gb',
  'en-us': 'region.en-us',
  'en-au': 'region.en-au',
  'en-nz': 'region.en-nz',
  'en-ie': 'region.en-ie',
  'en-in': 'region.en-in',
  'en-za': 'region.en-za',
  'en-sg': 'region.en-sg',
  'ms-my': 'region.ms-my',
  'id-id': 'region.id-id',
} as const satisfies Record<string, MessageKey>;

/** A friendly name: "Daniel · British English", or for code-named Android voices "British English · gba". */
export function voiceLabel(v: VoiceInfo, lang: UiLang = 'en'): string {
  const tag = tagOf(v);
  const region = tag in REGION_KEY ? translate(lang, REGION_KEY[tag as keyof typeof REGION_KEY]) : v.language;
  const coded = v.name.match(/^[a-z]{2,3}-[a-z]{2,3}-x-([a-z0-9]+)/i);
  const base = coded ? `${region} · ${coded[1]}` : `${v.name.replace(/\s*\((enhanced|premium)\)\s*/i, '').trim()} · ${region}`;
  const quality = /premium/i.test(`${v.identifier} ${v.name}`) ? 'voice.premium' : v.quality === 'Enhanced' ? 'voice.enhanced' : null;
  const notes = [quality && translate(lang, quality), /network/i.test(v.identifier) && translate(lang, 'voice.online')].filter(Boolean);
  return notes.length ? `${base} (${notes.join(', ')})` : base;
}

/** Android lists most voices twice (on-device and online); keep the on-device one of each pair. */
export function withoutOnlineTwins(voices: readonly VoiceInfo[]): VoiceInfo[] {
  const ids = new Set(voices.map((v) => v.identifier));
  return voices.filter((v) => !(/-network$/.test(v.identifier) && ids.has(v.identifier.replace(/-network$/, '-local'))));
}

/* ---------------------------------------------------------------- words */

const SAY = {
  en: {
    times: 'times',
    divided: 'divided by',
    minus: 'minus',
    plus: 'plus',
    equals: 'equals',
    what: 'what',
    howManyRinggit: 'how many ringgit',
    lessThan: 'is less than',
    moreThan: 'is more than',
    blank: 'blank',
    and: 'and',
    percent: 'percent',
    ratio: 'to',
    picture: 'picture',
    thisMany: 'this many',
    compare: (a: string, b: string) => `Compare ${a} and ${b}.`,
  },
  ms: {
    times: 'darab',
    divided: 'bahagi',
    minus: 'tolak',
    plus: 'tambah',
    equals: 'sama dengan',
    what: 'berapa',
    howManyRinggit: 'berapa ringgit',
    lessThan: 'lebih kecil daripada',
    moreThan: 'lebih besar daripada',
    blank: 'tempat kosong',
    and: 'dan',
    percent: 'peratus',
    ratio: 'kepada',
    picture: 'gambar',
    thisMany: 'sebanyak ini',
    compare: (a: string, b: string) => `Bandingkan ${a} dengan ${b}.`,
  },
} as const;

const FRACTIONS_EN: Record<string, [string, string]> = {
  2: ['half', 'halves'],
  3: ['third', 'thirds'],
  4: ['quarter', 'quarters'],
  5: ['fifth', 'fifths'],
  6: ['sixth', 'sixths'],
  7: ['seventh', 'sevenths'],
  8: ['eighth', 'eighths'],
  9: ['ninth', 'ninths'],
  10: ['tenth', 'tenths'],
  12: ['twelfth', 'twelfths'],
  100: ['hundredth', 'hundredths'],
};

const UNITS: Record<string, { en: [string, string]; ms: string }> = {
  km: { en: ['kilometre', 'kilometres'], ms: 'kilometer' },
  m: { en: ['metre', 'metres'], ms: 'meter' },
  cm: { en: ['centimetre', 'centimetres'], ms: 'sentimeter' },
  mm: { en: ['millimetre', 'millimetres'], ms: 'milimeter' },
  'cm²': { en: ['square centimetre', 'square centimetres'], ms: 'sentimeter persegi' },
  'cm³': { en: ['cubic centimetre', 'cubic centimetres'], ms: 'sentimeter padu' },
  kg: { en: ['kilogram', 'kilograms'], ms: 'kilogram' },
  g: { en: ['gram', 'grams'], ms: 'gram' },
  l: { en: ['litre', 'litres'], ms: 'liter' },
  ml: { en: ['millilitre', 'millilitres'], ms: 'mililiter' },
};

const GROUP_SPACE = '[ \\u00A0\\u2009\\u202F]';
const GROUPED = new RegExp(`(?<![\\d.])\\d{1,3}(?:${GROUP_SPACE}\\d{3})+(?![\\d])`, 'g');
const COMPARE = new RegExp(`^([\\d${GROUP_SPACE.slice(1, -1)}]+?)\\s{2,}\\?\\s{2,}([\\d${GROUP_SPACE.slice(1, -1)}]+)$`);
const UNIT = /(?<![\p{L}\d.'’])(?:(\d+(?:\.\d+)?)\s?)?(cm²|cm³|km|cm|mm|ml|kg|m|g|l)(?![\p{L}\d])/gu;
const EMOJI_CHAR = '[\\p{Extended_Pictographic}\\u{1F3FB}-\\u{1F3FF}\\u{1F1E6}-\\u{1F1FF}\\uFE0F\\u200D\\u20E3]';
const EMOJI = new RegExp(EMOJI_CHAR, 'gu');
/** A pictograph key: "Each 🍎 = 2 apples" → "Each picture = 2 apples". */
const KEY_PICTURE = new RegExp(`\\b(Each|each|Setiap|setiap)\\s+(?:${EMOJI_CHAR})+`, 'gu');
/** A row of the same picture to count mid-question: "has 🍎🍎🍎. How many…" → "has this many. How many…" (a trailing row is just dropped). */
const PICTURE_ROW = /(\p{Extended_Pictographic})\uFE0F?(?:\1\uFE0F?)+(?=[\s.,;:!?\p{Extended_Pictographic}\uFE0F\u200D]*[\p{L}\d])/gu;

const joinDigits = (s: string) => s.replace(GROUPED, (m) => m.replace(new RegExp(GROUP_SPACE, 'g'), ''));

/** "18", "50" → "18 ringgit 50 sen" (the same words in English and Malay). */
function ringgit(r: string, cents: string | undefined): string {
  const sen = cents ? Number(cents.padEnd(2, '0')) : 0;
  if (!sen) return `${r} ringgit`;
  return Number(r) === 0 ? `${sen} sen` : `${r} ringgit ${sen} sen`;
}

/** Rewrite text the way a teacher would read it aloud in `lang`. */
export function speakable(text: string, lang: SpeechLang = 'en'): string {
  const w = SAY[lang];
  let s = text.replace(/\*\*/g, '').trim();
  const cmp = s.match(COMPARE);
  if (cmp) s = w.compare(joinDigits(cmp[1].trim()), joinDigits(cmp[2].trim()));
  s = joinDigits(s);
  // Money: "RM18.50" → "18 ringgit 50 sen"; "= RM ?" → "equals how many ringgit?"
  s = s.replace(/RM\s?\?/g, `${w.howManyRinggit}?`);
  s = s.replace(/RM\s?(\d+)(?:\.(\d{1,2}))?/g, (_, r: string, c?: string) => ringgit(r, c));
  s = s.replace(/\bRM\b/g, 'ringgit');
  s = s.replace(/=\s*\?/g, `${w.equals} ${w.what}?`);
  // Fractions: "3/4" → "3 quarters" / "3 per 4" (engines may read "1/2" as a date).
  s = s.replace(/(?<![\d/])(\d+)\/(\d+)(?![\d/])/g, (_, n: string, d: string) => {
    if (lang === 'ms') return `${n} per ${d}`;
    const word = FRACTIONS_EN[d];
    return word ? `${n} ${Number(n) === 1 ? word[0] : word[1]}` : `${n} over ${d}`;
  });
  s = s.replace(/(\d)\s?%/g, `$1 ${w.percent}`);
  if (lang === 'ms') {
    // Malay reads the decimal point as "perpuluhan", then each digit; times as "7 30".
    s = s.replace(/(\d{1,2}):(\d{2})(?!\d)/g, (_, h: string, m: string) => (m === '00' ? h : `${h} ${Number(m)}`));
    s = s.replace(/(\d+)\.(\d+)/g, (_, a: string, b: string) => `${a} perpuluhan ${b.split('').join(' ')}`);
  }
  s = s.replace(UNIT, (_, n: string | undefined, unit: string) => {
    const u = UNITS[unit];
    const word = lang === 'ms' ? u.ms : u.en[n !== undefined && Number(n) === 1 ? 0 : 1];
    return n !== undefined ? `${n} ${word}` : word;
  });
  s = s
    .replace(/×/g, ` ${w.times} `)
    .replace(/÷/g, ` ${w.divided} `)
    .replace(/−|(?<=\d\s?)-(?=\s?\d)/g, ` ${w.minus} `)
    .replace(/(?<=[\d\s])\+(?=[\s\d])/g, ` ${w.plus} `)
    .replace(/(?<=\s)<(?=\s)/g, w.lessThan)
    .replace(/(?<=\s)>(?=\s)/g, w.moreThan)
    .replace(/=/g, ` ${w.equals} `)
    .replace(/_{3,}/g, ` ${w.blank} `)
    .replace(/\s&\s/g, ` ${w.and} `)
    .replace(/\s:\s/g, ` ${w.ratio} `)
    .replace(/[→·•]/g, ', ')
    .replace(KEY_PICTURE, (_, each: string) => `${each} ${w.picture}`)
    .replace(PICTURE_ROW, ` ${w.thisMany}`)
    .replace(EMOJI, ' ');
  return s
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:…])/g, '$1')
    .replace(/([,;:])(?:\s*[,;:])+/g, '$1')
    .replace(/^[\s,.;:]+/, '')
    .trim();
}
