/**
 * Every message is written in both languages side by side, so a missing translation is a
 * type error: `s('Home', 'Utama')` for plain text, `f((n) => …, (n) => …)` when the words
 * depend on values (numbers, names), with the same parameters in both languages.
 */
export type UiLang = 'en' | 'ms';

export interface Text {
  en: string;
  ms: string;
}

export interface Phrase<A extends unknown[]> {
  en: (...args: A) => string;
  ms: (...args: A) => string;
}

export const s = (en: string, ms: string): Text => ({ en, ms });

export const f = <A extends unknown[]>(en: (...args: A) => string, ms: (...args: A) => string): Phrase<A> => ({ en, ms });
