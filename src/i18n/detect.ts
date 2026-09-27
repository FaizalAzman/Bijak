import { getLocales } from 'expo-localization';
import type { UiLang } from './define';

/** The phone's language, if the app speaks it: Malay phones get Bahasa Melayu, everyone else English. */
export function deviceLang(): UiLang {
  try {
    return getLocales()[0]?.languageCode === 'ms' ? 'ms' : 'en';
  } catch {
    return 'en';
  }
}
