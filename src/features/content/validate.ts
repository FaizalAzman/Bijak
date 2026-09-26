/**
 * Semantic checks zod cannot express (cross references, blank counts, unique ids).
 * Used by `npm run validate-content` and before accepting remotely downloaded payloads.
 * Keep this file free of app imports so Node can run it directly.
 */
import { Standard } from './schema.ts';
import type { GeneratorSpec, Question, Quiz } from './schema.ts';

export const BLANK = '___';

const norm = (s: string) => s.trim().toLowerCase();
const hasDuplicates = (values: string[]) => new Set(values).size !== values.length;

export function questionIssues(q: Question, where: string): string[] {
  const out: string[] = [];
  switch (q.type) {
    case 'mcq':
      if (!q.options.some((o) => o.id === q.answer)) out.push(`${where}: answer "${q.answer}" is not an option id`);
      if (hasDuplicates(q.options.map((o) => o.id))) out.push(`${where}: duplicate option ids`);
      if (q.options.some((o) => !o.text?.trim() && !o.emoji)) out.push(`${where}: every option needs text or an emoji`);
      // Case-sensitive on purpose: "The cat" vs "the cat" is a real capital-letter question.
      if (hasDuplicates(q.options.map((o) => `${o.emoji ?? ''}|${(o.text ?? '').trim()}`))) out.push(`${where}: two options look the same`);
      break;
    case 'order':
      if (q.distractors.some((d) => q.tokens.includes(d))) out.push(`${where}: a distractor is also one of the answer tokens`);
      break;
    case 'match':
      if (new Set(q.pairs.map((p) => p.left)).size !== q.pairs.length) out.push(`${where}: duplicate left items`);
      if (new Set(q.pairs.map((p) => p.right)).size !== q.pairs.length) out.push(`${where}: duplicate right items`);
      break;
    case 'sort': {
      const ids = new Set(q.buckets.map((b) => b.id));
      if (ids.size !== q.buckets.length) out.push(`${where}: duplicate bucket ids`);
      if (hasDuplicates(q.items.map((it) => norm(it.text)))) out.push(`${where}: duplicate item texts`);
      for (const it of q.items) if (!ids.has(it.bucket)) out.push(`${where}: item "${it.text}" uses unknown bucket "${it.bucket}"`);
      break;
    }
    case 'fillBlank': {
      // The engine splits on exactly three underscores; "____" would leave a stray "_" on screen.
      if (/_{4,}/.test(q.text)) out.push(`${where}: blanks must be exactly "${BLANK}"`);
      const count = q.text.split(BLANK).length - 1;
      if (count !== q.blanks.length) out.push(`${where}: text has ${count} blanks but ${q.blanks.length} answers`);
      const bank = [...q.bank];
      for (const b of q.blanks) {
        const i = bank.indexOf(b);
        if (i < 0) out.push(`${where}: answer "${b}" missing from word bank`);
        else bank.splice(i, 1);
      }
      break;
    }
    case 'numpad':
      if (!/^-?\d+(\.\d+)?$/.test(q.answer)) out.push(`${where}: numpad answer must be numeric`);
      break;
    default:
      break;
  }
  return out;
}

export function generatorIssues(g: GeneratorSpec, where: string): string[] {
  const out: string[] = [];
  if (g.kind === 'vocab') {
    if (hasDuplicates(g.pairs.map(([w]) => norm(w)))) out.push(`${where}: duplicate vocab words`);
    // Two words with the same meaning would make the multiple-choice answer ambiguous.
    if (hasDuplicates(g.pairs.map(([, m]) => norm(m)))) out.push(`${where}: duplicate vocab meanings`);
  }
  return out;
}

function quizIssues(quiz: Quiz, where: string): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const q of quiz.questions) {
    if (ids.has(q.id)) out.push(`${where}: duplicate question id "${q.id}"`);
    ids.add(q.id);
    out.push(...questionIssues(q, `${where}/${q.id}`));
  }
  if (quiz.generator) out.push(...generatorIssues(quiz.generator, `${where}/generator`));
  else if (quiz.count && quiz.count > quiz.questions.length) out.push(`${where}: count ${quiz.count} is more than its ${quiz.questions.length} questions`);
  return out;
}

export function semanticIssues(std: Standard): string[] {
  const out: string[] = [];
  const topicIds = new Set<string>();
  const quizIds = new Set<string>();
  const trackQuiz = (id: string, where: string) => {
    if (quizIds.has(id)) out.push(`${where}: duplicate quiz id "${id}"`);
    quizIds.add(id);
  };
  for (const s of std.subjects) {
    for (const t of s.topics) {
      if (topicIds.has(t.id)) out.push(`${std.id}: duplicate topic id "${t.id}"`);
      topicIds.add(t.id);
      for (const qz of t.quizzes) {
        trackQuiz(qz.id, `${std.id}/${t.id}`);
        out.push(...quizIssues(qz, `${std.id}/${t.id}/${qz.id}`));
      }
    }
  }
  const subjectIds = new Set(std.subjects.map((s) => s.id));
  if (subjectIds.size !== std.subjects.length) out.push(`${std.id}: duplicate subject ids`);
  if (hasDuplicates(std.arcade.map((g) => g.id))) out.push(`${std.id}: duplicate arcade game ids`);
  for (const g of std.arcade) {
    trackQuiz(g.quiz.id, `${std.id}/arcade/${g.id}`);
    if (!subjectIds.has(g.subjectId)) out.push(`${std.id}/arcade/${g.id}: unknown subjectId "${g.subjectId}"`);
    if (g.quiz.mode !== 'timeAttack') out.push(`${std.id}/arcade/${g.id}: arcade quizzes must be time attacks`);
    out.push(...quizIssues(g.quiz, `${std.id}/arcade/${g.id}`));
  }
  return out;
}

/**
 * Ids must be unique across *all* standards: progress, SRS cards and the content index
 * are keyed by topic/quiz/arcade id, so a clash would mix two children's topics up.
 */
export function crossStandardIssues(standards: Standard[]): string[] {
  const out: string[] = [];
  const seen = new Map<string, string>();
  const claim = (kind: string, id: string, owner: string) => {
    const key = `${kind}:${id}`;
    const prev = seen.get(key);
    if (prev && prev !== owner) out.push(`${kind} id "${id}" is used by both ${prev} and ${owner}`);
    else seen.set(key, owner);
  };
  for (const std of standards) {
    claim('standard', std.id, `level ${std.level}`);
    claim('level', String(std.level), std.id);
    for (const s of std.subjects) for (const t of s.topics) {
      claim('topic', t.id, std.id);
      for (const q of t.quizzes) claim('quiz', q.id, std.id);
    }
    for (const g of std.arcade) {
      claim('arcade', g.id, std.id);
      claim('quiz', g.quiz.id, std.id);
    }
  }
  return out;
}

/** Parse + validate an unknown payload. Throws with a readable message on failure. */
export function parseStandard(raw: unknown): Standard {
  const res = Standard.safeParse(raw);
  if (!res.success) {
    const first = res.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid standard payload:\n${first.join('\n')}`);
  }
  const issues = semanticIssues(res.data);
  if (issues.length) throw new Error(`Invalid standard payload:\n${issues.slice(0, 5).join('\n')}`);
  return res.data;
}
