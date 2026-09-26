import type { Question } from '@/features/content/schema';

export interface QuestionProps<T extends Question['type'] = Question['type']> {
  q: Extract<Question, { type: T }>;
  /** Report the result exactly once per question. */
  onAnswer: (correct: boolean) => void;
  /** True once answered (inputs frozen while feedback shows). */
  locked: boolean;
  /** Time-attack: instant tap-to-answer, no Check buttons. */
  fast?: boolean;
}

export const LABELS = {
  en: { check: 'Check', true: 'True', false: 'False', tapOrDrag: 'Tap or drag the words' },
  ms: { check: 'Semak', true: 'Betul', false: 'Salah', tapOrDrag: 'Ketik atau seret perkataan' },
} as const;

/** Human-readable correct answer for the feedback sheet. */
export function correctAnswerText(q: Question): string | null {
  switch (q.type) {
    case 'mcq': {
      const o = q.options.find((x) => x.id === q.answer);
      return [o?.emoji, o?.text].filter(Boolean).join(' ');
    }
    case 'trueFalse':
      return q.answer ? LABELS[q.lang].true : LABELS[q.lang].false;
    case 'numpad':
      return q.unit === 'RM' ? `RM${q.answer}` : `${q.answer}${q.unit ? ` ${q.unit}` : ''}`;
    case 'fillBlank': {
      let i = 0;
      return q.text.replace(/_{3,}/g, () => q.blanks[i++] ?? '___');
    }
    case 'order':
      return q.tokens.join(' ');
    default:
      return null;
  }
}

export function numericEqual(a: string, b: string): boolean {
  const x = Number(a);
  const y = Number(b);
  return a.trim() !== '' && Number.isFinite(x) && Math.abs(x - y) < 1e-9;
}
