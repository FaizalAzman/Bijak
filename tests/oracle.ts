/**
 * An independent answer key for generated questions: it re-derives the answer from the
 * prompt text alone, so a generator bug can't also hide in the check.
 */
import { PLACES } from '@/features/content/generators';
import type { Question } from '@/features/content/schema';

export const num = (s: string) => Number(s.replace(/[\s ]/g, ''));

/** The numeric answer a child should give, worked out from the prompt only. */
export function oracle(q: Question): number | string {
  const p = q.prompt;
  let m: RegExpMatchArray | null;
  if ((m = p.match(/^([\d ]+) × ([\d ]+) = \?$/))) return num(m[1]) * num(m[2]);
  if ((m = p.match(/^([\d ]+) ÷ ([\d ]+) = \?$/))) return num(m[1]) / num(m[2]);
  if ((m = p.match(/^([\d ]+(?: \+ [\d ]+)+) = \?$/))) return m[1].split(' + ').reduce((a, b) => a + num(b), 0);
  if ((m = p.match(/^([\d ]+) − ([\d ]+) = \?$/))) return num(m[1]) - num(m[2]);
  if ((m = p.match(/^RM([\d .]+) \+ RM([\d .]+) = RM \?$/))) return Math.round((num(m[1]) + num(m[2])) * 100) / 100;
  if ((m = p.match(/^You have RM([\d .]+)\. You spend RM([\d .]+)\. How much is left\?$/))) return Math.round((num(m[1]) - num(m[2])) * 100) / 100;
  if ((m = p.match(/^([\d ]+) {2}\? {2}([\d ]+)$/))) {
    const [a, b] = [num(m[1]), num(m[2])];
    return a > b ? 'gt' : a < b ? 'lt' : 'eq';
  }
  if ((m = p.match(/^What is the (place|digit) value of the digit (\d) in ([\d ]+)\?$/) ?? p.match(/^What is the (digit) value of (\d) in ([\d ]+)\?$/))) {
    const digits = String(num(m[3])).split('').reverse();
    expect(digits.filter((d) => d === m![2])).toHaveLength(1); // unambiguous
    const pos = digits.indexOf(m[2]);
    return m[1] === 'place' ? PLACES[pos] : Number(m[2]) * 10 ** pos;
  }
  throw new Error(`oracle cannot read prompt: ${p}`);
}

export function answerOf(q: Question): number | string {
  if (q.type === 'numpad') return Number(q.answer);
  if (q.type === 'mcq') {
    const opt = q.options.find((o) => o.id === q.answer)!;
    if (/^(lt|eq|gt)$/.test(q.answer) && q.options.length === 3) return q.answer;
    return /^[\d ]+$/.test(opt.text ?? '') ? num(opt.text!) : opt.text!;
  }
  throw new Error(`unexpected type ${q.type}`);
}
