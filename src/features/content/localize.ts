/**
 * Applies a translation (schema `Translation`) to a standard: the same topics, quizzes and
 * answers, in the child's teaching language. Keep this file free of app imports so Node can
 * run it from `npm run validate-content`.
 */
import type { Lang, Question, QuestionText, Quiz, Standard, Subject, Topic, TopicText, Translation } from './schema.ts';

function localizeQuestion(q: Question, t: QuestionText | undefined, lang: Lang): Question {
  if (!t) return q;
  const common = { prompt: t.prompt ?? q.prompt, explain: t.explain ?? q.explain, lang };
  switch (q.type) {
    case 'mcq':
      return { ...q, ...common, options: q.options.map((o) => (t.options?.[o.id] != null ? { ...o, text: t.options[o.id] } : o)) };
    case 'match':
      return { ...q, ...common, pairs: t.pairs?.length === q.pairs.length ? t.pairs : q.pairs };
    case 'order':
      return { ...q, ...common, tokens: t.tokens ?? q.tokens, distractors: t.distractors ?? q.distractors };
    case 'sort':
      return {
        ...q,
        ...common,
        buckets: q.buckets.map((b) => (t.buckets?.[b.id] != null ? { ...b, label: t.buckets[b.id] } : b)),
        items: q.items.map((it, i) => (t.items?.[i] != null && t.items.length === q.items.length ? { ...it, text: t.items[i] } : it)),
      };
    case 'fillBlank':
      return { ...q, ...common, text: t.text ?? q.text, blanks: t.blanks ?? q.blanks, bank: t.bank ?? q.bank };
    case 'numpad':
      return { ...q, ...common, unit: t.unit ?? q.unit };
    case 'trueFalse':
      return { ...q, ...common };
  }
}

function localizeQuiz(quiz: Quiz, t: TopicText['quizzes'][string] | undefined, lang: Lang): Quiz {
  return {
    ...quiz,
    title: t?.title ?? quiz.title,
    questions: quiz.questions.map((q) => localizeQuestion(q, t?.questions[q.id], lang)),
    // Generated questions follow the subject's language (vocab keeps its own).
    generator: quiz.generator && quiz.generator.kind !== 'vocab' ? { ...quiz.generator, lang } : quiz.generator,
  };
}

function localizeTopic(topic: Topic, t: TopicText | undefined, lang: Lang): Topic {
  return {
    ...topic,
    // The original title stays searchable as the alternative title.
    title: t?.title ?? topic.title,
    titleAlt: t?.title ? topic.title : topic.titleAlt,
    objectives: t?.objectives ?? topic.objectives,
    lesson: t?.lesson ?? topic.lesson,
    offlineActivity: t?.offlineActivity ?? topic.offlineActivity,
    quizzes: topic.quizzes.map((q) => localizeQuiz(q, t?.quizzes[q.id], lang)),
  };
}

function localizeSubject(subject: Subject, t: Translation['subjects'][string], lang: Lang): Subject {
  return {
    ...subject,
    name: t.name ?? subject.name,
    nameAlt: t.name ? subject.name : subject.nameAlt,
    lang,
    topics: subject.topics.map((topic) => localizeTopic(topic, t.topics[topic.id], lang)),
  };
}

/** Subjects of `std` that have a `lang` translation and aren't already in that language. */
export function translatedSubjects(std: Standard, lang: Lang): string[] {
  const t = std.translations?.[lang];
  return t ? std.subjects.filter((s) => s.lang !== lang && t.subjects[s.id]).map((s) => s.id) : [];
}

/** `std` with every subject that has a `lang` translation switched to that language. */
export function localizeStandard(std: Standard, lang: Lang): Standard {
  const t = std.translations?.[lang];
  const ids = new Set(translatedSubjects(std, lang));
  if (!t || ids.size === 0) return std;
  return {
    ...std,
    subjects: std.subjects.map((s) => (ids.has(s.id) ? localizeSubject(s, t.subjects[s.id], lang) : s)),
    arcade: std.arcade.map((g) => (ids.has(g.subjectId) ? { ...g, title: t.arcade[g.id] ?? g.title, quiz: localizeQuiz(g.quiz, undefined, lang) } : g)),
  };
}
