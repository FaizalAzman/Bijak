/**
 * The bilingual UI: every message exists in English and Bahasa Melayu, the Malay really is
 * Malay, and screens follow the family's language setting as soon as it changes.
 */
import { act, renderHook } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { getContentIndex } from '@/features/content/registry';
import { currentT, isUiLang, joinNames, shortDate, standardName, subjectName, timeLabel, translate, translator, UI_LANGS, useT, useUiLang } from '@/i18n';
import { MESSAGE_GROUPS, MESSAGES } from '@/i18n/core';
import { deviceLang } from '@/i18n/detect';
import { useApp } from '@/store/app';
import { resetStores } from '../helpers';

type AnyMessage = { en: string | ((...a: unknown[]) => string); ms: string | ((...a: unknown[]) => string) };
const ENTRIES = Object.entries(MESSAGES) as [keyof typeof MESSAGES, AnyMessage][];
/** An argument that works as a word and as a number, to call any message. */
const sample = (fn: (...a: unknown[]) => string) => fn(...Array.from({ length: fn.length }, () => new String('2')));
const text = (m: AnyMessage, lang: 'en' | 'ms') => (typeof m[lang] === 'function' ? sample(m[lang]) : (m[lang] as string));

/** The same in both languages, and rightly so. */
const SAME = new Set(['common.minutes', 'time.duration', 'hair.tudung', 'medium.ms', 'voice.lang.ms', 'voice.premium', 'region.ms-my', 'region.id-id']);

beforeEach(() => resetStores());

describe('messages', () => {
  it('no key is defined in two places', () => {
    const keys = Object.values(MESSAGE_GROUPS).flatMap((group) => Object.keys(group));
    expect(keys.length).toBe(new Set(keys).size);
    expect(keys.length).toBe(ENTRIES.length);
  });

  it.each(ENTRIES)('%s has English and Malay of the same shape', (_, m) => {
    expect(typeof m.en).toBe(typeof m.ms);
    if (typeof m.en === 'function' && typeof m.ms === 'function') expect(m.ms.length).toBe(m.en.length);
    for (const lang of UI_LANGS) {
      const value = text(m, lang);
      expect(value.trim()).not.toBe('');
      expect(value).not.toMatch(/undefined|NaN|\[object/);
    }
  });

  it('the Malay is really Malay (only names and shared words are the same)', () => {
    const same = ENTRIES.filter(([, m]) => text(m, 'en') === text(m, 'ms')).map(([key]) => key);
    expect(same.sort()).toEqual([...SAME].sort());
  });

  it('Malay messages avoid English filler words', () => {
    const english = /\b(the|your|you|and|with|this|that|yet|to|of|is|are)\b/i;
    const leaks = ENTRIES.filter(([, m]) => english.test(text(m, 'ms'))).map(([key, m]) => `${key}: ${text(m, 'ms')}`);
    expect(leaks).toEqual([]);
  });
});

describe('translate', () => {
  it('reads plain and filled-in messages in either language', () => {
    expect(translate('en', 'tabs.home')).toBe('Home');
    expect(translate('ms', 'tabs.home')).toBe('Utama');
    expect(translate('en', 'common.days', 1)).toBe('1 day');
    expect(translate('en', 'common.days', 3)).toBe('3 days');
    expect(translate('ms', 'common.days', 3)).toBe('3 hari');
    expect(translate('ms', 'report.streak', 4, 9)).toBe('🔥 Rentetan 4 hari (terbaik 9)');
  });

  it('a translator remembers its language', () => {
    const t = translator('ms');
    expect(t.lang).toBe('ms');
    expect(t('common.standard', 3)).toBe('Tahun 3');
    expect(translator('en')('common.standard', 3)).toBe('Standard 3');
  });

  it('knows its two languages', () => {
    expect(UI_LANGS).toEqual(['en', 'ms']);
    expect([isUiLang('en'), isUiLang('ms'), isUiLang('fr'), isUiLang(undefined), isUiLang(1)]).toEqual([true, true, false, false, false]);
  });

  it('joins names, times and dates the way each language does', () => {
    expect(joinNames(['Adam', 'Aina', 'Ali'], 'ms')).toBe('Adam, Aina dan Ali');
    expect(timeLabel('20:00', 'ms')).toBe('8:00 malam');
    expect(timeLabel('08:15', 'en')).toBe('8:15 am');
    expect(shortDate('2026-03-02', 'en')).toBe('2 Mar');
    expect(shortDate('2026-03-02', 'ms')).toBe('2 Mac');
    expect(shortDate('2026-05-31', 'ms')).toBe('31 Mei');
  });
});

describe('names from the syllabus', () => {
  const std3 = getContentIndex().standardByLevel(3)!;
  const bm = getContentIndex('ms').standardByLevel(3)!;
  const subject = (std: typeof std3, id: string) => std.subjects.find((s) => s.id === id)!;

  it('standards are "Standard" in English and "Tahun" in Malay', () => {
    expect(standardName(std3, 'en')).toBe('Standard 3');
    expect(standardName(std3, 'ms')).toBe('Tahun 3');
    expect(standardName({ title: 'Standard 9', level: 9 }, 'ms')).toBe('Tahun 9');
  });

  it('subjects take their Malay name in the Malay app, and keep their own name otherwise', () => {
    expect(subjectName(subject(std3, 'math'), 'ms')).toBe('Matematik');
    expect(subjectName(subject(std3, 'math'), 'en')).toBe('Mathematics');
    expect(subjectName(subject(bm, 'math'), 'ms')).toBe('Matematik');
    // Bahasa Melayu is called Bahasa Melayu in English too.
    expect(subjectName(subject(std3, 'bm'), 'en')).toBe('Bahasa Melayu');
    expect(subjectName({ name: 'Art', lang: 'en' }, 'ms')).toBe('Art');
  });
});

describe('the app language', () => {
  it('starts as the phone’s language when the phone is in Malay, else English', () => {
    const locales = getLocales as jest.Mock;
    expect(deviceLang()).toBe('en');
    locales.mockReturnValueOnce([{ languageCode: 'ms', languageTag: 'ms-MY', regionCode: 'MY' }]);
    expect(deviceLang()).toBe('ms');
    locales.mockReturnValueOnce([{ languageCode: 'zh', languageTag: 'zh-MY' }, { languageCode: 'ms', languageTag: 'ms-MY' }]);
    expect(deviceLang()).toBe('en');
    locales.mockReturnValueOnce([]);
    expect(deviceLang()).toBe('en');
    locales.mockImplementationOnce(() => {
      throw new Error('no locales');
    });
    expect(deviceLang()).toBe('en');
  });

  it('screens re-render in the new language as soon as it changes', async () => {
    const { result } = await renderHook(() => ({ lang: useUiLang(), t: useT() }));
    expect(result.current.t('tabs.learn')).toBe('Learn');
    const first = result.current.t;
    await act(async () => {
      useApp.getState().updateSettings({ sound: false });
    });
    expect(result.current.t).toBe(first);
    await act(async () => {
      useApp.getState().updateSettings({ uiLang: 'ms' });
    });
    expect(result.current.lang).toBe('ms');
    expect(result.current.t('tabs.learn')).toBe('Belajar');
    expect(currentT()('tabs.learn')).toBe('Belajar');
  });
});
