/**
 * Schema → renderer completeness: every lesson block type, question type, shop item,
 * mascot mood and badge that data can describe has a renderer that actually draws it.
 */
import { render, screen } from '@testing-library/react-native';
import { Avatar } from '@/components/avatar/Avatar';
import { LessonBlockView, toSlides } from '@/components/lesson/LessonBlocks';
import { Kancil, type KancilMood } from '@/components/mascot/Kancil';
import { QuestionView } from '@/components/quiz/QuestionView';
import { correctAnswerText, LABELS } from '@/components/quiz/types';
import { getContentIndex } from '@/features/content/registry';
import { LessonBlock, Question } from '@/features/content/schema';
import { allBadges } from '@/features/gamify/badges';
import { DEFAULT_AVATAR, SHOP } from '@/features/gamify/shop';
import Trophies from '@/app/trophies';
import { resetStores, setupChild } from '../helpers';

type BlockType = LessonBlock['type'];
type QuestionType = Question['type'];
const literal = (o: { shape: { type: { value?: unknown; values?: Set<unknown> } } }) => o.shape.type.value ?? [...(o.shape.type.values ?? [])][0];

/** One example per block type. `Record<BlockType, …>` makes TypeScript demand a new entry for every new type. */
const BLOCKS: Record<BlockType, unknown> = {
  heading: { type: 'heading', text: 'Heading' },
  text: { type: 'text', text: 'Some **bold** and ==highlight== text' },
  callout: { type: 'callout', text: 'Remember this', tone: 'remember' },
  list: { type: 'list', items: ['one', 'two'], ordered: true },
  math: { type: 'math', expr: '3 × 4 = 12', caption: 'times' },
  fraction: { type: 'fraction', numerator: 3, denominator: 4, caption: 'three quarters' },
  example: { type: 'example', title: 'Try', lines: ['1 + 1 = 2'] },
  vocab: { type: 'vocab', lang: 'ms', items: [{ word: 'kucing', meaning: 'cat', emoji: '🐱' }] },
  table: { type: 'table', headers: ['A', 'B'], rows: [['1', '2']] },
  placeValue: { type: 'placeValue', number: 7654321 },
  numberLine: { type: 'numberLine', from: 0, to: 10, step: 2, highlight: [4] },
  image: { type: 'image', emoji: '🌳', caption: 'A tree' },
  emojiGrid: { type: 'emojiGrid', emoji: '🍎', rows: 3, cols: 4, caption: '3 × 4' },
  say: { type: 'say', text: 'Selamat pagi', lang: 'ms' },
};

const QUESTIONS: Record<QuestionType, unknown> = {
  mcq: { id: 'a', type: 'mcq', prompt: 'Pick', options: [{ id: 'x', text: 'X' }, { id: 'y', emoji: '🐟' }], answer: 'x' },
  trueFalse: { id: 'b', type: 'trueFalse', prompt: 'True?', answer: true },
  match: { id: 'c', type: 'match', prompt: 'Match', pairs: [{ left: 'a', right: '1' }, { left: 'b', right: '2' }] },
  order: { id: 'd', type: 'order', prompt: 'Order', tokens: ['I', 'run'] },
  sort: { id: 'e', type: 'sort', prompt: 'Sort', buckets: [{ id: 'p', label: 'P' }, { id: 'q', label: 'Q' }], items: [{ text: 'i', bucket: 'p' }, { text: 'j', bucket: 'q' }] },
  fillBlank: { id: 'f', type: 'fillBlank', prompt: 'Fill', text: 'I ___ home.', blanks: ['go'], bank: ['go', 'went'] },
  numpad: { id: 'g', type: 'numpad', prompt: '2 + 2', answer: '4' },
};

describe('lesson blocks', () => {
  it('the example list covers exactly the block types in the schema', () => {
    expect(LessonBlock.options.map(literal).sort()).toEqual(Object.keys(BLOCKS).sort());
  });

  it.each(Object.entries(BLOCKS))('%s renders visible content', async (_, raw) => {
    const block = LessonBlock.parse(raw);
    await render(<LessonBlockView block={block} lang="en" />);
    expect(screen.toJSON()).not.toBeNull();
  });

  const lessons = getContentIndex().standards.flatMap((std) => std.subjects.flatMap((s) => s.topics.filter((t) => t.lesson.length).map((t) => [`${std.id}/${t.id}`, t, s.lang] as const)));
  it.each(lessons)('lesson %s renders every slide', async (_, topic, lang) => {
    const slides = toSlides(topic.lesson);
    expect(slides.flat()).toHaveLength(topic.lesson.length);
    for (const slide of slides) {
      const view = await render(
        <>
          {slide.map((b, i) => (
            <LessonBlockView key={i} block={b} lang={lang} />
          ))}
        </>,
      );
      expect(screen.toJSON()).not.toBeNull();
      await view.unmount();
    }
  });
});

describe('question types', () => {
  it('the example list covers exactly the question types in the schema', () => {
    expect(Question.options.map(literal).sort()).toEqual(Object.keys(QUESTIONS).sort());
  });

  it.each(Object.entries(QUESTIONS))('%s has an engine, an instruction in both languages, and feedback text rules', async (_, raw) => {
    for (const lang of ['en', 'ms'] as const) {
      const q = Question.parse({ ...(raw as object), lang });
      const view = await render(<QuestionView q={q} onAnswer={jest.fn()} locked={false} />);
      expect(screen.getByText(q.prompt)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: LABELS[lang].readAloud })).toBeOnTheScreen();
      await view.unmount();
      const text = correctAnswerText(q);
      expect(text === null || text.trim().length > 0).toBe(true);
    }
  });
});

describe('avatar and mascot', () => {
  const draw = async (config = DEFAULT_AVATAR) => {
    const view = await render(<Avatar config={config} size={120} />);
    const json = JSON.stringify(screen.toJSON());
    await view.unmount();
    return json;
  };

  it.each(SHOP.filter((i) => i.slot !== 'outfit' || i.id !== DEFAULT_AVATAR.outfit).filter((i) => i.id !== DEFAULT_AVATAR.bg).map((i) => [i.id, i] as const))(
    '%s visibly changes the avatar',
    async (_, item) => {
      const base = await draw();
      expect(await draw({ ...DEFAULT_AVATAR, [item.slot]: item.id })).not.toBe(base);
    },
  );

  it.each(['excited', 'happy', 'sleepy'] as const)('avatar mood %s renders', async (mood) => {
    await render(<Avatar config={DEFAULT_AVATAR} mood={mood} />);
    expect(screen.toJSON()).not.toBeNull();
  });

  it.each(['idle', 'happy', 'cheer', 'sad', 'think', 'sleepy', 'wow', 'wave'] satisfies KancilMood[])('Sang Kancil mood %s renders', async (mood) => {
    await render(<Kancil mood={mood} size={120} />);
    expect(screen.toJSON()).not.toBeNull();
  });
});

describe('trophy room', () => {
  it('shows every badge the app can award, earned or not', async () => {
    resetStores();
    setupChild();
    await render(<Trophies />);
    const badges = allBadges(getContentIndex());
    expect(badges.length).toBeGreaterThan(15);
    for (const b of badges) expect(screen.getAllByText(b.title).length).toBeGreaterThan(0);
    expect(screen.getByText(`🏆 0 / ${badges.length}`)).toBeOnTheScreen();
  });
});
