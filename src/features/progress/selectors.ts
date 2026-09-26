import type { Standard, Subject, Topic } from '@/features/content/schema';
import type { Progress } from '@/store/types';

export interface TopicStatus {
  lessonDone: boolean;
  quizzesTotal: number;
  quizzesDone: number;
  /** Average best score across quizzes (0–100). */
  score: number;
  /** 0–3 stars: 1 = started, 2 = ≥60%, 3 = mastered (≥80% everywhere). */
  stars: number;
  mastered: boolean;
  /** 0..1 completion used for rings. */
  ratio: number;
}

export function topicStatus(topic: Topic, p: Progress): TopicStatus {
  const stat = p.topics[topic.id];
  const bests = topic.quizzes.map((q) => stat?.best[q.id] ?? 0);
  const quizzesDone = bests.filter((b) => b > 0).length;
  const score = bests.length ? Math.round(bests.reduce((a, b) => a + b, 0) / bests.length) : 0;
  const lessonDone = !!stat?.lessonDone || topic.lesson.length === 0;
  const mastered = bests.length > 0 && bests.every((b) => b >= 80);
  const started = lessonDone && topic.lesson.length > 0 ? true : quizzesDone > 0;
  const stars = mastered ? 3 : score >= 60 ? 2 : started ? 1 : 0;
  const ratio = (topic.lesson.length ? (stat?.lessonDone ? 0.2 : 0) : 0.2) + (bests.length ? (bests.reduce((a, b) => a + Math.min(b, 100), 0) / bests.length / 100) * 0.8 : 0.8);
  return { lessonDone, quizzesTotal: bests.length, quizzesDone, score, stars, mastered, ratio: Math.min(1, ratio) };
}

export function subjectProgress(subject: Subject, p: Progress): { ratio: number; mastered: number; total: number } {
  const statuses = subject.topics.map((t) => topicStatus(t, p));
  const total = statuses.length;
  return {
    ratio: total ? statuses.reduce((a, s) => a + s.ratio, 0) / total : 0,
    mastered: statuses.filter((s) => s.mastered).length,
    total,
  };
}

/** Suggest what to learn next: first unmastered topic, rotating across subjects. */
export function nextTopic(standard: Standard | undefined, p: Progress): { subject: Subject; topic: Topic } | null {
  if (!standard) return null;
  const candidates: { subject: Subject; topic: Topic; order: number }[] = [];
  standard.subjects.forEach((subject) => {
    subject.topics.forEach((topic, i) => {
      const st = topicStatus(topic, p);
      if (!st.mastered && topic.quizzes.length) candidates.push({ subject, topic, order: i });
    });
  });
  if (!candidates.length) return null;
  // Prefer a topic already in progress, else the earliest topic of the least-recently studied subject.
  const inProgress = candidates.find((c) => topicStatus(c.topic, p).stars > 0);
  if (inProgress) return inProgress;
  const lastStudied = (s: Subject) => Math.max(0, ...s.topics.map((t) => p.topics[t.id]?.lastAt ?? 0));
  candidates.sort((a, b) => a.order - b.order || lastStudied(a.subject) - lastStudied(b.subject));
  return candidates[0];
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Selamat pagi';
  if (h < 15) return 'Selamat tengah hari';
  if (h < 19) return 'Selamat petang';
  return 'Selamat malam';
}
