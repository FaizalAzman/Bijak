/**
 * Answers any question through the accessible UI — the same buttons a child (or a
 * screen-reader user) would use. Shared by engine tests and the curriculum meta test.
 */
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { LABELS } from '@/components/quiz/types';
import type { Question } from '@/features/content/schema';

type Host = ReturnType<typeof screen.getByRole>;

const enabled = (el: Host) => !(el.props.accessibilityState?.disabled ?? false);

/** Screen-reader "activate" — how draggable tiles are operated without dragging. */
export async function activate(el: Host) {
  await fireEvent(el, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
}

export async function press(name: string | RegExp, nth = 0) {
  await fireEvent.press(screen.getAllByRole('button', { name })[nth]);
}

/** First enabled button with exactly this name (tiles can repeat, e.g. two "the"). */
function firstEnabled(name: string, root?: Host): Host {
  const scope = root ? within(root) : screen;
  const exact = scope.getAllByRole('button', { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) });
  const el = exact.find(enabled);
  if (!el) throw new Error(`no enabled "${name}" button`);
  return el;
}

async function flushTimers() {
  // Sort and Match report after a short celebratory pause.
  await act(async () => {
    jest.advanceTimersByTime(500);
  });
}

/** Returns false when the question has no way to be answered wrongly (e.g. a one-word bank). */
export async function answerThroughUi(q: Question, correct: boolean): Promise<boolean> {
  const L = LABELS[q.lang];
  switch (q.type) {
    case 'mcq': {
      const target = correct ? q.options.find((o) => o.id === q.answer)! : q.options.find((o) => o.id !== q.answer)!;
      const label = target.text ?? target.emoji!;
      const same = q.options.filter((o) => (o.text ?? o.emoji) === label);
      await fireEvent.press(firstEnabledOf(screen.getAllByRole('button', { name: label }), same.indexOf(target)));
      return true;
    }
    case 'trueFalse':
      await press(q.answer === correct ? L.true : L.false);
      return true;
    case 'numpad': {
      const value = correct ? q.answer : String(Number(q.answer) + 1);
      for (const ch of value) await press(ch === '.' ? '.' : ch);
      await press(L.check);
      return true;
    }
    case 'order': {
      const words = correct ? q.tokens : q.tokens.slice(0, 1);
      for (const w of words) await activate(firstEnabled(w));
      await press(L.check);
      return true;
    }
    case 'fillBlank': {
      let words = q.blanks;
      if (!correct) {
        const wrong = q.bank.find((w) => w !== q.blanks[0]);
        if (wrong == null) return false;
        const rest = [...q.bank];
        rest.splice(rest.indexOf(wrong), 1);
        words = [wrong, ...rest.slice(0, q.blanks.length - 1)];
      }
      for (const w of words) await activate(firstEnabled(w));
      await press(L.check);
      return true;
    }
    case 'sort': {
      const labelOf = (id: string) => q.buckets.find((b) => b.id === id)!.label;
      let items = q.items;
      if (!correct) {
        const first = q.items[0];
        const wrongBucket = q.buckets.find((b) => b.id !== first.bucket)!;
        await activate(firstEnabled(first.text));
        await press(`Bucket ${wrongBucket.label}`);
        // A wrong drop keeps the item selected, so the right bucket can be tapped straight away.
        await press(`Bucket ${labelOf(first.bucket)}`);
        items = q.items.slice(1);
      }
      for (const it of items) {
        await activate(firstEnabled(it.text));
        await press(`Bucket ${labelOf(it.bucket)}`);
      }
      await flushTimers();
      return true;
    }
    case 'match': {
      const left = screen.getByTestId('match-left');
      const right = screen.getByTestId('match-right');
      if (!correct) {
        await activate(firstEnabled(q.pairs[0].left, left));
        await activate(firstEnabled(q.pairs[1].right, right));
      }
      for (const p of q.pairs) {
        await activate(firstEnabled(p.left, left));
        await activate(firstEnabled(p.right, right));
      }
      await flushTimers();
      return true;
    }
  }
}

function firstEnabledOf(list: Host[], nth: number): Host {
  const el = list[nth];
  if (!el || !enabled(el)) throw new Error('option not pressable');
  return el;
}
