import { applyQuestEvent, generateDailyQuests, questText, type Quest, type QuestEvent } from '@/features/gamify/quests';

const SUBJECTS = [
  { id: 'math', name: 'Mathematics', emoji: '🔢' },
  { id: 'sci', name: 'Science', emoji: '🔬' },
];

const quest = (over: Partial<Quest>): Quest => ({ id: 'q', kind: 'correct', title: 't', emoji: 'e', target: 3, progress: 0, reward: 10, claimed: false, ...over });

describe('generateDailyQuests', () => {
  it('makes three distinct, unclaimed quests with day-scoped ids', () => {
    const qs = generateDailyQuests('child-1', '2026-03-02', SUBJECTS, 0);
    expect(qs).toHaveLength(3);
    expect(qs.map((q) => q.id)).toEqual(['2026-03-02-0', '2026-03-02-1', '2026-03-02-2']);
    expect(new Set(qs.map((q) => q.kind)).size).toBe(3);
    for (const q of qs) {
      expect(q.progress).toBe(0);
      expect(q.claimed).toBe(false);
      expect(q.target).toBeGreaterThan(0);
      expect(q.reward).toBeGreaterThan(0);
      expect(q.title.length).toBeGreaterThan(0);
    }
  });

  it('is stable for the same child and day (restarts do not reshuffle)', () => {
    expect(generateDailyQuests('c', '2026-03-02', SUBJECTS, 5)).toEqual(generateDailyQuests('c', '2026-03-02', SUBJECTS, 5));
  });

  it('varies across days and across children', () => {
    const days = new Set<string>();
    const kids = new Set<string>();
    for (let d = 1; d <= 28; d++) days.add(JSON.stringify(generateDailyQuests('c', `2026-02-${String(d).padStart(2, '0')}`, SUBJECTS, 5).map((q) => q.title)));
    for (let k = 0; k < 28; k++) kids.add(JSON.stringify(generateDailyQuests(`kid-${k}`, '2026-02-01', SUBJECTS, 5).map((q) => q.title)));
    expect(days.size).toBeGreaterThan(10);
    expect(kids.size).toBeGreaterThan(10);
  });

  it('only offers a review quest when there are at least 3 tricky questions waiting', () => {
    let offered = 0;
    for (let d = 0; d < 200; d++) {
      const day = `2026-${String((d % 12) + 1).padStart(2, '0')}-${String((d % 28) + 1).padStart(2, '0')}`;
      expect(generateDailyQuests(`k${d}`, day, SUBJECTS, 2).some((q) => q.kind === 'review')).toBe(false);
      if (generateDailyQuests(`k${d}`, day, SUBJECTS, 3).some((q) => q.kind === 'review')) offered++;
    }
    expect(offered).toBeGreaterThan(0);
  });

  it('subject quests always name one of the given subjects', () => {
    for (let d = 0; d < 300; d++) {
      for (const q of generateDailyQuests(`k${d}`, '2026-05-05', SUBJECTS, 0)) {
        if (q.kind === 'quizzesInSubject') {
          expect(SUBJECTS.map((s) => s.id)).toContain(q.subjectId);
          expect(q.title).toMatch(/Mathematics|Science/);
        }
      }
    }
  });

  it('falls back to maths when a standard has no quiz subjects yet', () => {
    for (let d = 0; d < 100; d++) {
      for (const q of generateDailyQuests(`k${d}`, '2026-05-05', [], 0)) if (q.kind === 'quizzesInSubject') expect(q.subjectId).toBe('math');
    }
  });
});

describe('questText', () => {
  const quest = (over: Partial<Quest>): Quest => ({ id: 'd-0', kind: 'lesson', title: 'Saved title', emoji: '📖', target: 1, reward: 20, progress: 0, claimed: false, ...over });

  it.each<[Partial<Quest>, string, string]>([
    [{ kind: 'quizzesInSubject', target: 2, subjectName: 'Mathematics' }, 'Complete 2 Mathematics quizzes', 'Siapkan 2 kuiz Mathematics'],
    [{ kind: 'quizzesInSubject', target: 1, subjectName: 'Mathematics', subjectNameAlt: 'Matematik', subjectLang: 'en' }, 'Complete 1 Mathematics quiz', 'Siapkan 1 kuiz Matematik'],
    [{ kind: 'quizzesInSubject', target: 2, subjectName: 'Matematik', subjectNameAlt: 'Mathematics', subjectLang: 'ms' }, 'Complete 2 Matematik quizzes', 'Siapkan 2 kuiz Matematik'],
    [{ kind: 'correct', target: 15 }, 'Get 15 answers right', 'Jawab 15 soalan dengan betul'],
    [{ kind: 'combo', target: 5 }, 'Get 5 right in a row', 'Betul 5 kali berturut-turut'],
    [{ kind: 'lesson' }, 'Read a lesson', 'Baca satu pelajaran'],
    [{ kind: 'timeAttack' }, 'Play a time-attack game', 'Main satu permainan lawan masa'],
    [{ kind: 'perfect' }, 'Finish a quiz with no mistakes', 'Siapkan satu kuiz tanpa salah'],
    [{ kind: 'xp', target: 150 }, 'Earn 150 XP', 'Kumpul 150 XP'],
    [{ kind: 'review', target: 3 }, 'Fix 3 tricky questions', 'Betulkan 3 soalan mencabar'],
  ])('%j reads "%s" / "%s"', (over, en, ms) => {
    expect(questText(quest(over), 'en')).toBe(en);
    expect(questText(quest(over), 'ms')).toBe(ms);
  });

  it('quests saved before names were stored keep their saved title', () => {
    expect(questText(quest({ kind: 'quizzesInSubject', target: 2 }), 'ms')).toBe('Saved title');
  });

  it('every generated quest reads in both languages', () => {
    for (let d = 1; d <= 28; d++) {
      for (const q of generateDailyQuests('kid', `2026-02-${String(d).padStart(2, '0')}`, [{ id: 'math', name: 'Mathematics', nameAlt: 'Matematik', lang: 'en', emoji: '🔢' }], 5)) {
        expect(questText(q, 'en')).toBe(q.title);
        expect(questText(q, 'ms')).not.toBe(q.title);
      }
    }
  });
});

describe('applyQuestEvent', () => {
  const run = (q: Quest, ...events: QuestEvent[]) => events.reduce((qs, e) => applyQuestEvent(qs, e).quests, [q])[0];

  it('counts correct answers only', () => {
    const q = run(quest({ kind: 'correct', target: 2 }), { type: 'answer', correct: false, combo: 0 }, { type: 'answer', correct: true, combo: 1 });
    expect(q.progress).toBe(1);
  });

  it('tracks the best combo, never the sum', () => {
    const q = run(
      quest({ kind: 'combo', target: 5 }),
      { type: 'answer', correct: true, combo: 1 },
      { type: 'answer', correct: true, combo: 2 },
      { type: 'answer', correct: false, combo: 0 },
      { type: 'answer', correct: true, combo: 1 },
    );
    expect(q.progress).toBe(2);
  });

  it('subject quiz quests ignore other subjects, time attacks and review sessions', () => {
    const base = quest({ kind: 'quizzesInSubject', subjectId: 'math', target: 5 });
    const q = run(
      base,
      { type: 'quizComplete', subjectId: 'sci', perfect: false, timeAttack: false },
      { type: 'quizComplete', subjectId: 'math', perfect: false, timeAttack: true },
      { type: 'quizComplete', subjectId: 'math', perfect: false, timeAttack: false, review: true },
      { type: 'quizComplete', subjectId: 'math', perfect: false, timeAttack: false },
    );
    expect(q.progress).toBe(1);
  });

  it('perfect quests need a perfect, non-time-attack quiz', () => {
    const base = quest({ kind: 'perfect', target: 1 });
    expect(run(base, { type: 'quizComplete', subjectId: 'm', perfect: false, timeAttack: false }).progress).toBe(0);
    expect(run(base, { type: 'quizComplete', subjectId: 'm', perfect: true, timeAttack: true }).progress).toBe(0);
    expect(run(base, { type: 'quizComplete', subjectId: 'm', perfect: true, timeAttack: false }).progress).toBe(1);
  });

  it('time-attack, lesson, review and xp quests count their own events', () => {
    expect(run(quest({ kind: 'timeAttack', target: 1 }), { type: 'quizComplete', subjectId: 'm', perfect: false, timeAttack: true }).progress).toBe(1);
    expect(run(quest({ kind: 'lesson', target: 1 }), { type: 'lesson' }).progress).toBe(1);
    expect(run(quest({ kind: 'review', target: 3 }), { type: 'review', correct: true }, { type: 'review', correct: false }).progress).toBe(1);
    expect(run(quest({ kind: 'xp', target: 100 }), { type: 'xp', amount: 30 }, { type: 'xp', amount: 45 }).progress).toBe(75);
  });

  it('caps progress at the target and reports completion exactly once', () => {
    const q = quest({ kind: 'xp', target: 50 });
    const first = applyQuestEvent([q], { type: 'xp', amount: 80 });
    expect(first.quests[0].progress).toBe(50);
    expect(first.completed).toEqual(['q']);
    const again = applyQuestEvent(first.quests, { type: 'xp', amount: 10 });
    expect(again.completed).toEqual([]);
    expect(again.quests[0]).toBe(first.quests[0]);
  });

  it('never mutates its input', () => {
    const qs = [quest({ kind: 'correct', target: 2 })];
    const snapshot = JSON.stringify(qs);
    applyQuestEvent(qs, { type: 'answer', correct: true, combo: 1 });
    expect(JSON.stringify(qs)).toBe(snapshot);
  });

  it('ignores unrelated events without creating new objects', () => {
    const qs = [quest({ kind: 'lesson', target: 1 })];
    const out = applyQuestEvent(qs, { type: 'answer', correct: true, combo: 9 });
    expect(out.quests[0]).toBe(qs[0]);
  });
});
