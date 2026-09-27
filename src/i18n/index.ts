/**
 * Bilingual UI: every word on screen comes from `src/i18n/messages`, written in English and
 * Bahasa Melayu side by side. The app language is a family setting (it starts as the phone's
 * language); lesson and quiz content keeps following each child's teaching language.
 */
import { useMemo } from 'react';
import { useApp } from '@/store/app';
import { translator, type T, type UiLang } from './core';

export { isUiLang, joinNames, shortDate, timeLabel, translate, translator, UI_LANGS, type MessageKey, type T, type UiLang } from './core';
export { standardName, subjectName } from './names';

/** The app language, for React screens. */
export function useUiLang(): UiLang {
  return useApp((s) => s.settings.uiLang);
}

/** `t('home.continue')`, `t('common.days', 3)` — re-renders when the language changes. */
export function useT(): T {
  const lang = useUiLang();
  return useMemo(() => translator(lang), [lang]);
}

/** `t` in the current app language, outside React. */
export const currentT = (): T => translator(useApp.getState().settings.uiLang);
