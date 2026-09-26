import { Standard } from '@/features/content/schema';
import { crossStandardIssues, parseStandard, semanticIssues } from '@/features/content/validate';

type Json = Record<string, unknown>;
const mcq = (over: Json = {}) => ({ id: 'q1', type: 'mcq', prompt: 'Pick', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], answer: 'a', ...over });
const std = (questions: Json[], extra: Json = {}): Json => ({
  id: 'std9',
  level: 9,
  title: 'Standard 9',
  version: 1,
  subjects: [{ id: 'math', name: 'Maths', emoji: '🔢', topics: [{ id: 't1', title: 'T', quizzes: [{ id: 'quiz1', title: 'Q', questions }] }] }],
  ...extra,
});
const issues = (raw: Json) => semanticIssues(Standard.parse(raw));

describe('semantic validation', () => {
  it('accepts a well-formed standard', () => {
    expect(issues(std([mcq()]))).toEqual([]);
    expect(() => parseStandard(std([mcq()]))).not.toThrow();
  });

  it.each([
    ['mcq answer must be an option', mcq({ answer: 'z' }), /not an option id/],
    ['mcq option ids unique', mcq({ options: [{ id: 'a', text: 'A' }, { id: 'a', text: 'B' }] }), /duplicate option ids/],
    ['mcq options need text or emoji', mcq({ options: [{ id: 'a', text: 'A' }, { id: 'b' }] }), /needs text or an emoji/],
    ['mcq options must look different', mcq({ options: [{ id: 'a', text: 'Cat' }, { id: 'b', text: ' Cat ' }] }), /look the same/],
    ['match lefts unique', { id: 'q1', type: 'match', prompt: 'p', pairs: [{ left: 'a', right: '1' }, { left: 'a', right: '2' }] }, /duplicate left/],
    ['match rights unique', { id: 'q1', type: 'match', prompt: 'p', pairs: [{ left: 'a', right: '1' }, { left: 'b', right: '1' }] }, /duplicate right/],
    ['order distractor is not an answer token', { id: 'q1', type: 'order', prompt: 'p', tokens: ['I', 'run'], distractors: ['run'] }, /distractor/],
    [
      'sort buckets must exist',
      { id: 'q1', type: 'sort', prompt: 'p', buckets: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }], items: [{ text: 'a', bucket: 'x' }, { text: 'b', bucket: 'z' }] },
      /unknown bucket/,
    ],
    [
      'sort bucket ids unique',
      { id: 'q1', type: 'sort', prompt: 'p', buckets: [{ id: 'x', label: 'X' }, { id: 'x', label: 'Y' }], items: [{ text: 'a', bucket: 'x' }, { text: 'b', bucket: 'x' }] },
      /duplicate bucket/,
    ],
    [
      'sort item texts unique (they are the drag keys)',
      { id: 'q1', type: 'sort', prompt: 'p', buckets: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }], items: [{ text: 'Cat', bucket: 'x' }, { text: 'cat', bucket: 'y' }] },
      /duplicate item/,
    ],
    ['fillBlank blank count', { id: 'q1', type: 'fillBlank', prompt: 'p', text: 'I ___ to ___.', blanks: ['go'], bank: ['go'] }, /2 blanks but 1/],
    ['fillBlank answers in the bank', { id: 'q1', type: 'fillBlank', prompt: 'p', text: 'I ___.', blanks: ['go'], bank: ['went'] }, /missing from word bank/],
    ['fillBlank repeated answers need repeated bank words', { id: 'q1', type: 'fillBlank', prompt: 'p', text: '___ and ___', blanks: ['go', 'go'], bank: ['go', 'run'] }, /missing from word bank/],
    ['fillBlank blanks are exactly three underscores', { id: 'q1', type: 'fillBlank', prompt: 'p', text: 'I ____ home.', blanks: ['go'], bank: ['go'] }, /exactly "___"/],
    ['numpad numeric', { id: 'q1', type: 'numpad', prompt: 'p', answer: 'ten' }, /must be numeric/],
  ])('%s', (_, question, pattern) => {
    const out = issues(std([question as Json]));
    expect(out.join('\n')).toMatch(pattern);
    expect(() => parseStandard(std([question as Json]))).toThrow(pattern);
  });

  it('question ids must be unique within a quiz', () => {
    expect(issues(std([mcq(), mcq()])).join()).toMatch(/duplicate question id/);
  });

  it('a count bigger than the question pool is flagged', () => {
    const raw = std([mcq()]);
    (raw.subjects as Json[])[0].topics = [{ id: 't1', title: 'T', quizzes: [{ id: 'quiz1', title: 'Q', count: 5, questions: [mcq()] }] }];
    expect(issues(raw).join()).toMatch(/count 5 is more than its 1 questions/);
  });

  it('vocab generators need unique words and meanings', () => {
    const raw = std([]);
    (raw.subjects as Json[])[0].topics = [
      {
        id: 't1',
        title: 'T',
        quizzes: [{ id: 'quiz1', title: 'Q', generator: { kind: 'vocab', pairs: [['big', 'besar'], ['large', 'besar'], ['small', 'kecil'], ['hot', 'panas']] } }],
      },
    ];
    expect(issues(raw).join()).toMatch(/duplicate vocab meanings/);
  });

  it('topic, quiz and subject ids must be unique within a standard', () => {
    const raw = std([mcq()]);
    const subject = (raw.subjects as Json[])[0];
    (raw.subjects as Json[]).push({ ...subject });
    const out = issues(raw).join('\n');
    expect(out).toMatch(/duplicate topic id "t1"/);
    expect(out).toMatch(/duplicate quiz id "quiz1"/);
    expect(out).toMatch(/duplicate subject ids/);
  });

  it('arcade games must be time attacks for a known subject', () => {
    const raw = std([mcq()], {
      arcade: [
        { id: 'g1', title: 'G', emoji: '⚡', subjectId: 'nope', quiz: { id: 'g1-q', title: 'G', mode: 'practice', generator: { kind: 'addition', max: 20 } } },
        { id: 'g1', title: 'G2', emoji: '⚡', subjectId: 'math', quiz: { id: 'g2-q', title: 'G', mode: 'timeAttack', generator: { kind: 'addition', max: 20 } } },
      ],
    });
    const out = issues(raw).join('\n');
    expect(out).toMatch(/unknown subjectId "nope"/);
    expect(out).toMatch(/must be time attacks/);
    expect(out).toMatch(/duplicate arcade game ids/);
  });

  it('parseStandard reports schema errors readably', () => {
    expect(() => parseStandard({ id: 'Bad Id', level: 1 })).toThrow(/Invalid standard payload/);
    expect(() => parseStandard(std([{ id: 'q1', type: 'mystery', prompt: 'p' }]))).toThrow(/Invalid standard payload/);
  });

  it('rejects place-value generators beyond millions and lesson charts beyond 7 digits', () => {
    const raw = std([]);
    (raw.subjects as Json[])[0].topics = [{ id: 't1', title: 'T', quizzes: [{ id: 'quiz1', title: 'Q', generator: { kind: 'placeValue', max: 10_000_000 } }] }];
    expect(() => parseStandard(raw)).toThrow();
    (raw.subjects as Json[])[0].topics = [{ id: 't1', title: 'T', lesson: [{ type: 'placeValue', number: 12_345_678 }] }];
    expect(() => parseStandard(raw)).toThrow();
  });
});

describe('crossStandardIssues', () => {
  const a = Standard.parse(std([mcq()]));
  it('passes distinct standards', () => {
    const b = Standard.parse({ ...std([mcq()]), id: 'std10', level: 10, subjects: [{ id: 'math', name: 'M', emoji: 'x', topics: [{ id: 't2', title: 'T', quizzes: [{ id: 'quiz2', title: 'Q', questions: [mcq()] }] }] }] });
    expect(crossStandardIssues([a, b])).toEqual([]);
  });

  it('flags ids and levels shared between standards', () => {
    const b = Standard.parse({ ...std([mcq()]), id: 'std10' });
    const out = crossStandardIssues([a, b]).join('\n');
    expect(out).toMatch(/topic id "t1" is used by both std9 and std10/);
    expect(out).toMatch(/quiz id "quiz1"/);
    expect(out).toMatch(/level id "9"/);
  });

  it('flags a standard id listed twice', () => {
    expect(crossStandardIssues([a, { ...a, level: 11 }]).join()).toMatch(/standard id "std9"/);
  });
});
