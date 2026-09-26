/** Content names in the app language (pure helpers, safe to use from the store and features). */
import type { Standard, Subject } from '@/features/content/schema';
import type { UiLang } from './define';

/** "Standard 3" / "Tahun 3". */
export function standardName(std: Pick<Standard, 'title' | 'titleAlt' | 'level'>, lang: UiLang): string {
  return lang === 'ms' ? (std.titleAlt ?? `Tahun ${std.level}`) : std.title;
}

/** A subject's name in the app language when it has one ("Matematik" for Mathematics). */
export function subjectName(subject: Pick<Subject, 'name' | 'nameAlt' | 'lang'>, lang: UiLang): string {
  if (subject.lang === lang) return subject.name;
  return lang === 'ms' ? (subject.nameAlt ?? subject.name) : subject.name;
}
