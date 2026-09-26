/**
 * Semantic checks zod cannot express (cross references, blank counts, unique ids).
 * Used by `npm run validate-content` and before accepting remotely downloaded payloads.
 * Keep this file free of app imports so Node can run it directly.
 */
import { Standard } from './schema.ts';
import type { Question, Quiz } from './schema.ts';

export const BLANK = '___';

function questionIssues(q: Question, where: string): string[] {
  const out: string[] = [];
  switch (q.type) {
    case 'mcq':
      if (!q.options.some((o) => o.id === q.answer)) out.push(`${where}: answer "${q.answer}" is not an option id`);
      if (new Set(q.options.map((o) => o.id)).size !== q.options.length) out.push(`${where}: duplicate option ids`);
      break;
    case 'match':
      if (new Set(q.pairs.map((p) => p.left)).size !== q.pairs.length) out.push(`${where}: duplicate left items`);
      if (new Set(q.pairs.map((p) => p.right)).size !== q.pairs.length) out.push(`${where}: duplicate right items`);
      break;
    case 'sort': {
      const ids = new Set(q.buckets.map((b) => b.id));
      for (const it of q.items) if (!ids.has(it.bucket)) out.push(`${where}: item "${it.text}" uses unknown bucket "${it.bucket}"`);
      break;
    }
    case 'fillBlank': {
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

function quizIssues(quiz: Quiz, where: string): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const q of quiz.questions) {
    if (ids.has(q.id)) out.push(`${where}: duplicate question id "${q.id}"`);
    ids.add(q.id);
    out.push(...questionIssues(q, `${where}/${q.id}`));
  }
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
  for (const g of std.arcade) {
    trackQuiz(g.quiz.id, `${std.id}/arcade/${g.id}`);
    if (!subjectIds.has(g.subjectId)) out.push(`${std.id}/arcade/${g.id}: unknown subjectId "${g.subjectId}"`);
    out.push(...quizIssues(g.quiz, `${std.id}/arcade/${g.id}`));
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
