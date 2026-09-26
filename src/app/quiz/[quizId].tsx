/**
 * Quiz player — hosts every question engine (Modules 10–13) in practice mode and the
 * Time-Attack wrapper (Module 14). `quizId = "review"` runs a Spaced-Repetition session.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { LevelUpModal } from '@/components/gamify/LevelUp';
import { toast } from '@/components/gamify/Toaster';
import { Kancil } from '@/components/mascot/Kancil';
import { FeedbackSheet } from '@/components/quiz/FeedbackSheet';
import { QuestionView } from '@/components/quiz/QuestionView';
import { Results, type ResultsData } from '@/components/quiz/Results';
import { TimerBar } from '@/components/quiz/TimerBar';
import { BackButton, Button, FrameRow, ProgressBar, Screen, Txt } from '@/components/ui';
import { buildQuizQuestions, getContentIndex, questionKey } from '@/features/content/registry';
import type { Lang, Question } from '@/features/content/schema';
import { questText } from '@/features/gamify/quests';
import { levelFromXp, REWARDS } from '@/features/gamify/xp';
import { dueCards, type SrsContext } from '@/features/srs/srs';
import { currentT, useT } from '@/i18n';
import { fx, playSfx, speak, stopSpeaking } from '@/lib/feedback';
import { telemetry } from '@/lib/telemetry';
import { REVIEW_QUIZ_ID, useApp } from '@/store/app';
import { colors } from '@/theme';

interface Item {
  q: Question;
  ctx: SrsContext;
}

interface Session {
  title: string;
  mode: 'practice' | 'timeAttack' | 'review';
  seconds: number;
  items: Item[];
  quizId: string;
  standardId: string;
  subjectId: string;
  topicId?: string;
}

function buildSession(quizId: string, fixed = false, medium?: Lang): Session | null {
  const index = getContentIndex(medium);
  if (quizId === REVIEW_QUIZ_ID) {
    const p = useApp.getState();
    const prog = p.activeProfileId ? p.progress[p.activeProfileId] : undefined;
    // Authored questions are shown as they read today (the child's language, any fixes);
    // generated ones keep the wording they were saved with.
    const current = (fromQuiz: string, q: Question) => index.quiz(fromQuiz)?.quiz.questions.find((x) => x.id === q.id) ?? q;
    const cards = (prog ? dueCards(prog.srs, Date.now(), 10) : []).map((c) => ({ ...c, q: current(c.quizId, c.q) }));
    if (!cards.length) return null;
    const first = cards[0];
    return {
      title: currentT()('quiz.tricky'),
      mode: 'review',
      seconds: 0,
      quizId: REVIEW_QUIZ_ID,
      standardId: first.standardId,
      subjectId: first.subjectId,
      items: cards.map((c) => ({ q: c.q, ctx: { key: c.key, quizId: c.quizId, standardId: c.standardId, subjectId: c.subjectId, topicId: c.topicId, q: c.q } })),
    };
  }
  const ref = index.quiz(quizId);
  if (!ref) return null;
  const qs = buildQuizQuestions(fixed ? { ...ref.quiz, shuffle: false } : ref.quiz);
  return {
    title: ref.quiz.title,
    mode: ref.quiz.mode,
    seconds: ref.quiz.seconds,
    quizId: ref.quiz.id,
    standardId: ref.standard.id,
    subjectId: ref.subject.id,
    topicId: ref.topic?.id,
    items: qs.map((q) => ({
      q,
      ctx: { key: questionKey(ref.quiz.id, q), quizId: ref.quiz.id, standardId: ref.standard.id, subjectId: ref.subject.id, topicId: ref.topic?.id, q },
    })),
  };
}

function QuizRun({ session, onRetry }: { session: Session; onRetry: () => void }) {
  const timeAttack = session.mode === 'timeAttack';
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<'ready' | 'play' | 'feedback' | 'done'>(timeAttack ? 'ready' : 'play');
  const [last, setLast] = useState<{ correct: boolean; xp: number }>({ correct: false, xp: 0 });
  const [combo, setCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [flash, setFlash] = useState<null | boolean>(null);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(session.seconds);
  const sessionXp = useRef(0);
  const startXp = useRef(0);
  const started = useRef(0);
  const autoRead = useApp((s) => s.settings.autoRead);
  const t = useT();

  const item = session.items[Math.min(i, session.items.length - 1)];

  useEffect(() => {
    started.current = Date.now();
    const s = useApp.getState();
    startXp.current = s.activeProfileId ? (s.progress[s.activeProfileId]?.xp ?? 0) : 0;
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    telemetry.setContext(`quiz:${timeAttack ? 'timeAttack' : item.q.type}`);
    if (autoRead && !timeAttack && phase === 'play') speak(item.q.prompt, item.q.lang);
  }, [i, item, timeAttack, autoRead, phase]);

  const finish = (finalCorrect: number, finalAnswered: number) => {
    stopSpeaking();
    const seconds = Math.round((Date.now() - started.current) / 1000);
    const s = useApp.getState();
    const reward = s.finishQuiz({
      quizId: session.quizId,
      topicId: session.topicId,
      standardId: session.standardId,
      subjectId: session.subjectId,
      title: session.title,
      mode: session.mode,
      correct: finalCorrect,
      total: timeAttack ? finalAnswered : session.items.length,
      seconds,
    });
    const after = useApp.getState();
    const xpNow = after.activeProfileId ? (after.progress[after.activeProfileId]?.xp ?? 0) : 0;
    const lvlBefore = levelFromXp(startXp.current);
    const lvlAfter = levelFromXp(xpNow);
    reward.questsDone.forEach((q) => toast({ emoji: q.emoji, title: t('quest.complete'), subtitle: t('quest.claim', questText(q, t.lang), q.reward), bg: colors.sun }));
    setResults({
      title: session.title,
      timeAttack,
      correct: finalCorrect,
      total: timeAttack ? finalAnswered : session.items.length,
      xp: sessionXp.current + reward.xp,
      coins: finalCorrect * REWARDS.coinPerCorrect + reward.coins,
      seconds,
      streak: reward.streak,
      shieldEarned: reward.shieldEarned,
      newBest: reward.newBest,
      badges: reward.badges,
    });
    setPhase('done');
    if (lvlAfter > lvlBefore) {
      setTimeout(() => {
        fx.levelUp();
        setLevelUp(lvlAfter);
      }, 700);
    } else {
      fx.coin();
    }
  };

  // Time-attack clock
  useEffect(() => {
    if (!timeAttack || phase === 'ready' || phase === 'done') return;
    const deadline = started.current + session.seconds * 1000;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft((prev) => {
        if (left !== prev && left <= 5 && left > 0) playSfx('tick');
        return left;
      });
      if (left <= 0) clearInterval(id);
    }, 200);
    return () => clearInterval(id);
  }, [timeAttack, phase, session.seconds]);

  useEffect(() => {
    if (timeAttack && secondsLeft <= 0 && phase !== 'done' && phase !== 'ready') finish(correctCount, answered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const onAnswer = (correct: boolean) => {
    if (phase !== 'play') return;
    const nextCombo = correct ? combo + 1 : 0;
    const xp = useApp.getState().answer({ ctx: item.ctx, correct, combo: nextCombo, difficulty: item.q.difficulty, review: session.mode === 'review', fast: timeAttack });
    sessionXp.current += xp;
    setCombo(nextCombo);
    setAnswered((n) => n + 1);
    if (correct) setCorrectCount((n) => n + 1);
    setLast({ correct, xp });
    if (timeAttack) {
      setFlash(correct);
      setTimeout(
        () => {
          setFlash(null);
          setI((n) => (n + 1) % session.items.length);
        },
        correct ? 260 : 520,
      );
    } else {
      setPhase('feedback');
    }
  };

  const next = () => {
    if (i + 1 >= session.items.length) finish(correctCount, answered);
    else {
      setI(i + 1);
      setPhase('play');
    }
  };

  if (phase === 'done' && results) {
    return (
      <Screen scroll={false}>
        <Results data={results} onDone={() => router.back()} onRetry={onRetry} />
        <LevelUpModal level={levelUp} onClose={() => setLevelUp(null)} />
      </Screen>
    );
  }

  if (phase === 'ready') {
    return (
      <Screen
        scroll={false}
        header={
          <FrameRow style={{ paddingTop: 8 }}>
            <BackButton close />
          </FrameRow>
        }
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Kancil mood="wow" size={160} />
          <Txt variant="label">{t('quiz.timeAttack')}</Txt>
          <Txt variant="hero" style={{ textAlign: 'center' }}>
            {session.title}
          </Txt>
          <Txt variant="subtitle" style={{ color: colors.muted, textAlign: 'center' }}>
            {t('quiz.answerMany', session.seconds)}
          </Txt>
          <View style={{ width: '100%', marginTop: 12 }}>
            <Button
              label={t('quiz.start')}
              tone="lime"
              size="lg"
              full
              testID="start-timeattack"
              onPress={() => {
                started.current = Date.now();
                setSecondsLeft(session.seconds);
                setPhase('play');
                fx.levelUp();
              }}
            />
          </View>
        </View>
      </Screen>
    );
  }

  const dragType = ['match', 'sort', 'order', 'fillBlank'].includes(item.q.type);
  const questionEl = <QuestionView key={`${i}-${item.q.id}`} q={item.q} onAnswer={onAnswer} locked={phase !== 'play'} fast={timeAttack} />;

  return (
    <Screen
      scroll={false}
      header={
        <FrameRow style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
          <BackButton close />
          <View style={{ flex: 1 }}>
            {timeAttack ? (
              <TimerBar seconds={session.seconds} running={phase === 'play'} />
            ) : (
              <ProgressBar value={(i + (phase === 'feedback' ? 1 : 0)) / session.items.length} height={16} />
            )}
          </View>
          {timeAttack ? (
            <View style={{ minWidth: 64, alignItems: 'flex-end' }}>
              <Txt variant="number" testID="ta-score">
                ⚡ {correctCount}
              </Txt>
              <Txt variant="mono" style={{ fontSize: 11, color: secondsLeft <= 10 ? colors.berry : colors.muted }}>
                {secondsLeft}s
              </Txt>
            </View>
          ) : combo >= 2 ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors['tangerine-soft'],
                borderRadius: 999,
                borderWidth: 2,
                borderColor: colors.ink,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Txt variant="number" style={{ fontSize: 16 }}>
                🔥{combo}
              </Txt>
            </View>
          ) : (
            <Txt variant="mono">
              {i + 1}/{session.items.length}
            </Txt>
          )}
        </FrameRow>
      }
    >
      {dragType ? (
        <View style={{ flex: 1, paddingTop: 12, paddingBottom: 220 }}>{questionEl}</View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 240 }} showsVerticalScrollIndicator={false}>
          {questionEl}
        </ScrollView>
      )}

      {flash != null && (
        <Animated.View
          entering={FadeIn.duration(80)}
          exiting={FadeOut.duration(200)}
          pointerEvents="none"
          style={{ position: 'absolute', left: -18, right: -18, top: 0, bottom: 0, backgroundColor: flash ? 'rgba(74,222,128,0.22)' : 'rgba(240,80,122,0.22)' }}
        />
      )}
      {phase === 'feedback' && <FeedbackSheet q={item.q} correct={last.correct} xp={last.xp} combo={combo} onContinue={next} />}
    </Screen>
  );
}

export default function QuizScreen() {
  const { quizId, fixed } = useLocalSearchParams<{ quizId: string; fixed?: string }>();
  const [run, setRun] = useState(0);
  const medium = useApp((s) => s.profiles.find((p) => p.id === s.activeProfileId)?.medium);
  const session = useMemo(() => buildSession(quizId, fixed === '1', medium), [quizId, fixed, medium, run]); // eslint-disable-line react-hooks/exhaustive-deps
  const t = useT();

  if (!session || session.items.length === 0) {
    return (
      <Screen
        scroll={false}
        header={
          <FrameRow style={{ paddingTop: 8 }}>
            <BackButton close />
          </FrameRow>
        }
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <Kancil mood={quizId === 'review' ? 'cheer' : 'think'} size={150} />
          <Txt variant="display" style={{ textAlign: 'center' }}>
            {quizId === 'review' ? t('quiz.nothingToReview') : t('quiz.notFound')}
          </Txt>
          <Txt variant="body" style={{ textAlign: 'center', color: colors.muted }}>
            {quizId === 'review' ? t('quiz.allFixed') : t('quiz.maybeUpdated')}
          </Txt>
          <Button label={t('common.back')} tone="lime" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }
  return <QuizRun key={run} session={session} onRetry={() => setRun((r) => r + 1)} />;
}
