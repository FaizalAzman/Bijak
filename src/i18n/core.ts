/**
 * The translator, usable anywhere (stores, planners, share text). React screens use
 * `useT()` from `@/i18n`, which follows the app language setting.
 */
import type { Phrase, Text, UiLang } from './define';
import { child } from './messages/child';
import { common } from './messages/common';
import { notify } from './messages/notify';
import { parent } from './messages/parent';

export type { UiLang } from './define';

export const MESSAGES = { ...common, ...child, ...parent, ...notify };
/** Each area's messages, for the tests that check no key is defined twice. */
export const MESSAGE_GROUPS = { common, child, parent, notify };

export type MessageKey = keyof typeof MESSAGES;
type ArgsOf<K extends MessageKey> = (typeof MESSAGES)[K] extends Phrase<infer A> ? A : [];

export interface T {
  <K extends MessageKey>(key: K, ...args: ArgsOf<K>): string;
  lang: UiLang;
}

export const UI_LANGS: readonly UiLang[] = ['en', 'ms'];
export const isUiLang = (value: unknown): value is UiLang => value === 'en' || value === 'ms';

export function translate<K extends MessageKey>(lang: UiLang, key: K, ...args: ArgsOf<K>): string {
  const message = MESSAGES[key] as Text | Phrase<unknown[]>;
  const value = message[lang];
  return typeof value === 'function' ? value(...args) : value;
}

/** A `t()` bound to one language. */
export function translator(lang: UiLang): T {
  const t = (<K extends MessageKey>(key: K, ...args: ArgsOf<K>) => translate(lang, key, ...args)) as T;
  t.lang = lang;
  return t;
}

/** "Adam", "Adam and Aina", "Adam, Aina and Ali" (or "dan"). */
export function joinNames(names: readonly string[], lang: UiLang): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} ${translate(lang, 'common.and')} ${names.at(-1)}`;
}

/** "2026-03-02" → "2 Mar" / "2 Mac" (no Intl, so every phone writes it the same way). */
export function shortDate(day: string, lang: UiLang): string {
  const d = new Date(`${day}T12:00:00`);
  return `${d.getDate()} ${translate(lang, 'date.monthShort', d.getMonth())}`;
}

/** "17:00" → "5:00 pm" / "5:00 petang". */
export function timeLabel(time: string, lang: UiLang): string {
  const [h, m] = time.split(':').map(Number);
  return translate(lang, 'time.clock', h, m);
}
