/**
 * Practice sheets: the right questions, laid out for paper in the lesson's language, with an
 * answer key on its own page.
 */
import { answerLines } from '@/components/quiz/types';
import { buildIndex, getContentIndex } from '@/features/content/registry';
import { Standard, type Question } from '@/features/content/schema';
import { A4, buildWorksheet, SHEET_SIZES, sheetSizes, worksheetHtml, type SheetOptions } from '@/features/worksheet/sheet';

const opts = (over: Partial<SheetOptions> = {}): SheetOptions => ({ child: 'Adam', topicIds: ['s3-math-numbers'], count: 10, answers: true, seed: 7, day: '2026-03-02', ...over });

describe('picking questions', () => {
  const index = getContentIndex();

  it('takes the asked number of questions from the topic’s quizzes, without repeats', () => {
    for (const count of SHEET_SIZES) {
      const sheet = buildWorksheet(index, opts({ count }))!;
      expect(sheet.questions).toHaveLength(count);
      expect(new Set(sheet.questions.map((q) => `${q.id}|${q.prompt}`)).size).toBe(count);
    }
  });

  it('is the same for the same seed, and a new seed draws new questions', () => {
    const a = buildWorksheet(index, opts())!.questions.map((q) => q.prompt);
    expect(buildWorksheet(index, opts())!.questions.map((q) => q.prompt)).toEqual(a);
    expect(buildWorksheet(index, opts({ seed: 8 }))!.questions.map((q) => q.prompt)).not.toEqual(a);
  });

  it('names the topic, standard and subject, and can mix several topics', () => {
    const one = buildWorksheet(index, opts())!;
    expect(one).toMatchObject({ title: 'Numbers up to 10 000', subtitle: 'Standard 3 · Mathematics', lang: 'en', child: 'Adam', answers: true });
    const two = buildWorksheet(index, opts({ topicIds: ['s3-math-money', 'ghost', 's3-sci-teeth'], count: 20 }))!;
    expect(two.title).toBe('Money up to RM1000 · Humans: Our Teeth');
    expect(two.subtitle).toBe('Standard 3 · Mathematics · Science');
  });

  it('follows the child’s teaching language (Bahasa Melayu build)', () => {
    const sheet = buildWorksheet(getContentIndex('ms'), opts())!;
    expect(sheet).toMatchObject({ lang: 'ms', title: 'Nombor Bulat hingga 10 000', subtitle: 'Tahun 3 · Matematik' });
    expect(sheet.questions.every((q) => q.lang === 'ms')).toBe(true);
  });

  it('never uses time-attack quizzes, and gives up on topics with nothing to print', () => {
    const std = Standard.parse({
      id: 'stdz',
      level: 9,
      title: 'Standard 9',
      version: 1,
      subjects: [
        {
          id: 'math',
          name: 'Maths',
          emoji: '🔢',
          topics: [
            { id: 'fast', title: 'Fast', quizzes: [{ id: 'fq', title: 'F', mode: 'timeAttack', seconds: 60, generator: { kind: 'addition', max: 9 } }] },
            { id: 'empty', title: 'Empty', quizzes: [] },
          ],
        },
      ],
    });
    const idx = buildIndex([std]);
    expect(buildWorksheet(idx, opts({ topicIds: ['fast'] }))).toBeNull();
    expect(buildWorksheet(idx, opts({ topicIds: ['empty'] }))).toBeNull();
    expect(buildWorksheet(idx, opts({ topicIds: ['nope'] }))).toBeNull();
  });

  it('knows how many questions the topic has, and offers the sizes it can fill', () => {
    expect(buildWorksheet(index, opts({ count: Number.POSITIVE_INFINITY }))!.questions).toHaveLength(24);
    expect(buildWorksheet(index, opts())!.available).toBe(24);
    expect([sheetSizes(24), sheetSizes(20), sheetSizes(13), sheetSizes(10), sheetSizes(6), sheetSizes(0)]).toEqual([[10, 15, 20], [10, 15, 20], [10, 13], [10], [6], [0]]);
  });

  it('asks for at least one question', () => {
    expect(buildWorksheet(index, opts({ count: 0.2 }))!.questions).toHaveLength(1);
  });
});

describe('the printed page', () => {
  const q = (over: object) => ({ id: 'x', prompt: 'P', lang: 'en', difficulty: 1, ...over }) as Question;
  const sheet = (questions: Question[], over = {}) => ({
    title: 'Test <sheet>',
    subtitle: 'Standard 3 · Science',
    lang: 'en' as const,
    child: 'Aina',
    day: '2026-03-02',
    questions,
    available: questions.length,
    answers: true,
    ...over,
  });

  it('lays out every question type for pencil and paper, with its instruction', () => {
    const html = worksheetHtml(
      sheet([
        q({ type: 'mcq', prompt: 'Pick', visual: '🐟', options: [{ id: 'a', text: 'Fish' }, { id: 'b', emoji: '🐱', text: 'Cat' }], answer: 'a' }),
        q({ type: 'trueFalse', prompt: 'Fish swim', answer: true }),
        q({ type: 'numpad', prompt: 'Price?', answer: '12.50', unit: 'RM' }),
        q({ type: 'numpad', prompt: 'Length?', answer: '5', unit: 'cm' }),
        q({ type: 'fillBlank', prompt: 'Fill', text: 'A ___ says moo.', blanks: ['cow'], bank: ['cow', 'cat'] }),
        q({ type: 'order', prompt: 'Order', tokens: ['I', 'like', 'rice'], distractors: ['you'] }),
        q({ type: 'match', prompt: 'Match', pairs: [{ left: '🐟', right: 'Water' }, { left: '🐦', right: 'Air' }] }),
        q({ type: 'sort', prompt: 'Sort', buckets: [{ id: 'l', label: 'Living', emoji: '🌱' }, { id: 'n', label: 'Non-living' }], items: [{ text: 'Cat', bucket: 'l' }, { text: 'Rock', bucket: 'n' }] }),
      ]),
    );
    for (const how of ['Circle the answer.', 'Circle True or False.', 'Write the answer.', 'Fill in the blanks.', 'Write them in the right order.', 'Draw lines to match.', 'Write each one in its group.']) {
      expect(html).toContain(how);
    }
    expect(html).toContain('<b>a)</b> Fish');
    expect(html).toContain('<b>b)</b> 🐱 Cat');
    expect(html).toContain('<span class="visual">🐟</span>');
    expect(html).toContain('RM <span class="line"></span>');
    expect(html).toContain('<span class="line"></span> cm');
    expect(html).toContain('A <span class="blank"></span> says moo.');
    expect(html).toMatch(/Word bank:<\/b> (cow · cat|cat · cow)/);
    expect(html).toContain('<span class="chip">you</span>');
    expect(html).toContain('🐟 ●');
    expect(html).toContain('<th>🌱 Living</th>');
    expect(html).toMatch(/Sort these:<\/b> (Cat · Rock|Rock · Cat)/);
    expect(html).toContain('Score: ____ / 8');
    expect(html).toContain('Name: Aina');
    expect(html).toContain('Date: 2 Mar 2026');
  });

  it('a sheet that mixes languages gives each question its own language’s instructions', () => {
    const html = worksheetHtml(
      sheet([
        q({ type: 'match', lang: 'ms', prompt: 'Padankan', pairs: [{ left: 'baca', right: 'membaca' }, { left: 'tulis', right: 'menulis' }] }),
        q({ type: 'fillBlank', lang: 'ms', prompt: 'Isi', text: 'Kami ___ bola.', blanks: ['bermain'], bank: ['bermain', 'main'] }),
      ]),
    );
    expect(html).toContain('Lukis garisan untuk padankan.');
    expect(html).toContain('Kotak perkataan:');
    expect(html).not.toContain('Draw lines to match.');
    expect(html).toContain('Name: Aina');
  });

  it('never prints a puzzle already solved: scrambles and match columns are always mixed', () => {
    for (let n = 0; n < 30; n++) {
      const tokens = ['I', 'like', 'to', 'eat', `mangoes${n}`];
      const html = worksheetHtml(sheet([q({ id: `o${n}`, type: 'order', prompt: `Order ${n}`, tokens, distractors: [] }), q({ id: `m${n}`, type: 'match', prompt: `Match ${n}`, pairs: [{ left: 'A', right: '1' }, { left: 'B', right: '2' }] })]));
      const chips = [...html.matchAll(/<span class="chip">([^<]*)<\/span>/g)].map((m) => m[1]);
      expect(chips.sort()).toEqual([...tokens].sort());
      expect([...html.matchAll(/<span class="chip">([^<]*)<\/span>/g)].map((m) => m[1])).not.toEqual(tokens);
      expect(html).toContain('<tr><td>A ●</td><td></td><td>● 2</td></tr>');
    }
  });

  it('ends with the answer key on its own page, in question order', () => {
    const qs = [q({ id: 'a', type: 'numpad', answer: '42' }), q({ id: 'b', type: 'match', pairs: [{ left: 'A', right: '1' }, { left: 'B', right: '2' }] })];
    const html = worksheetHtml(sheet(qs));
    const key = html.slice(html.indexOf('<section class="key">'));
    expect(key).toContain('Answer key · Test &lt;sheet&gt;');
    expect(key).toContain(`<li>${answerLines(qs[0]).join('; ')}</li><li>A → 1; B → 2</li>`);
    expect(html).toContain('.key { page-break-before: always; }');
    expect(worksheetHtml(sheet(qs, { answers: false }))).not.toContain('<section class="key">');
  });

  it('escapes everything that comes from the syllabus', () => {
    const html = worksheetHtml(sheet([q({ type: 'numpad', prompt: '3 < 5 & 7 > "2" \'ok\'', answer: '1' })], { child: '<b>Ali</b>' }));
    expect(html).toContain('3 &lt; 5 &amp; 7 &gt; &quot;2&quot; &#39;ok&#39;');
    expect(html).toContain('Name: &lt;b&gt;Ali&lt;/b&gt;');
    expect(html).not.toContain('<b>Ali</b>');
  });

  it('writes the sheet’s own words in Bahasa Melayu for a Bahasa Melayu lesson', () => {
    const html = worksheetHtml(sheet([q({ type: 'trueFalse', lang: 'ms', prompt: 'Ikan berenang', answer: true })], { lang: 'ms' }));
    for (const word of ['Nama:', 'Tarikh: 2 Mac 2026', 'Markah:', 'Bulatkan Betul atau Salah.', 'Skema jawapan', 'Dibuat dengan Bijak', '<html lang="ms">']) expect(html).toContain(word);
    expect(html).not.toMatch(/\b(Name|Score|Answer key)\b/);
  });

  it('is sized for A4 paper', () => {
    expect(A4).toMatchObject({ width: 595, height: 842 });
    expect(Object.values(A4.margins).every((m) => m >= 36)).toBe(true);
    expect(worksheetHtml(sheet([q({ type: 'numpad', answer: '1' })]))).toContain('@page { size: A4;');
  });
});
