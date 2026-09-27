/** Module 20 analytics — derived from local progress only. */
import type { ContentIndex } from '@/features/content/registry';
import { translate, type UiLang } from '@/i18n/core';
import { subjectName } from '@/i18n/names';
import { lastNDays } from '@/lib/date';
import type { Progress } from '@/store/types';

export interface WeakTopic {
  topicId: string;
  title: string;
  subject: string;
  subjectEmoji: string;
  accuracy: number;
  answered: number;
  lapses: number;
  objectives: { code: string; text: string }[];
  activity?: string;
}

export function weakTopics(p: Progress, index: ContentIndex, limit = 5, lang: UiLang = 'en'): WeakTopic[] {
  const lapses = new Map<string, number>();
  for (const c of Object.values(p.srs)) if (c.topicId) lapses.set(c.topicId, (lapses.get(c.topicId) ?? 0) + c.lapses);
  const out: (WeakTopic & { score: number })[] = [];
  for (const [topicId, st] of Object.entries(p.topics)) {
    if (st.answered < 3) continue;
    const ref = index.topic(topicId);
    if (!ref) continue;
    const accuracy = st.correct / st.answered;
    const l = lapses.get(topicId) ?? 0;
    if (accuracy >= 0.8 && l === 0) continue;
    out.push({
      topicId,
      title: ref.topic.title,
      subject: subjectName(ref.subject, lang),
      subjectEmoji: ref.subject.emoji,
      accuracy: Math.round(accuracy * 100),
      answered: st.answered,
      lapses: l,
      objectives: ref.topic.objectives,
      activity: ref.topic.offlineActivity,
      score: 1 - accuracy + Math.min(l, 10) * 0.04,
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function minutesPerDay(p: Progress, lang: UiLang = 'en', n = 7) {
  return lastNDays(n).map((d) => {
    const secs = Object.values(p.days[d]?.seconds ?? {}).reduce((a, b) => a + b, 0);
    const label = translate(lang, 'date.weekdayShort', new Date(`${d}T12:00:00`).getDay());
    return { day: d, label, value: Math.round(secs / 60) };
  });
}

export function timePerSubject(p: Progress, index: ContentIndex, lang: UiLang = 'en', n = 7) {
  const totals = new Map<string, number>();
  for (const d of lastNDays(n)) {
    for (const [key, secs] of Object.entries(p.days[d]?.seconds ?? {})) totals.set(key, (totals.get(key) ?? 0) + secs);
  }
  return [...totals.entries()]
    .map(([key, secs]) => {
      const [stdId, subId] = key.split('/');
      const sub = index.subject(stdId, subId);
      const std = index.standard(stdId);
      const name = [sub?.emoji, sub ? subjectName(sub, lang) : subId].filter(Boolean).join(' ');
      return { label: std ? translate(lang, 'dash.subjectStd', name, std.level) : name, value: Math.round(secs / 60) };
    })
    .sort((a, b) => b.value - a.value);
}

export function accuracyPerSubject(p: Progress, index: ContentIndex, lang: UiLang = 'en') {
  const agg = new Map<string, { label: string; answered: number; correct: number }>();
  for (const [topicId, st] of Object.entries(p.topics)) {
    const ref = index.topic(topicId);
    if (!ref || !st.answered) continue;
    const key = ref.subject.name;
    const cur = agg.get(key) ?? { label: `${ref.subject.emoji} ${subjectName(ref.subject, lang)}`, answered: 0, correct: 0 };
    cur.answered += st.answered;
    cur.correct += st.correct;
    agg.set(key, cur);
  }
  return [...agg.values()].map((a) => ({ label: a.label, value: Math.round((a.correct / a.answered) * 100), hint: translate(lang, 'dash.qs', a.answered) }));
}
