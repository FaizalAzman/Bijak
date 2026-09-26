import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { toast } from '@/components/gamify/Toaster';
import { LessonBlockView, toSlides } from '@/components/lesson/LessonBlocks';
import { MascotSays } from '@/components/mascot/MascotSays';
import { BackButton, Button, FrameRow, ProgressBar, Screen, Tag, Txt } from '@/components/ui';
import { useContentIndex } from '@/features/content/registry';
import { fx, stopSpeaking } from '@/lib/feedback';
import { useApp } from '@/store/app';
import { accent, colors } from '@/theme';
import { swapIn } from '@/theme/motion';

export default function LessonScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const ref = useContentIndex().topic(topicId);
  const slides = useMemo(() => (ref ? toSlides(ref.topic.lesson) : []), [ref]);
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const [earned, setEarned] = useState({ xp: 0, coins: 0 });
  const started = useRef(0);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    started.current = Date.now();
    return () => stopSpeaking();
  }, []);

  if (!ref) return null;
  const { topic, subject } = ref;
  const a = accent(subject.color);
  const last = i === slides.length - 1;

  const next = () => {
    if (!last) {
      fx.tap();
      setI(i + 1);
      scroll.current?.scrollTo({ y: 0, animated: false });
      return;
    }
    const reward = useApp
      .getState()
      .finishLesson({ topicId: topic.id, seconds: Math.round((Date.now() - started.current) / 1000) });
    fx.coin();
    setDone(true);
    if (reward) {
      setEarned({ xp: reward.xp, coins: reward.coins });
      reward.badges.forEach((b) => toast({ emoji: b.emoji, title: `Badge unlocked: ${b.title}`, subtitle: b.description }));
      reward.questsDone.forEach((q) => toast({ emoji: q.emoji, title: 'Quest complete!', subtitle: q.title, bg: colors.sun }));
    }
  };

  return (
    <Screen
      scroll={false}
      header={
        <FrameRow style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
          <BackButton close />
          <View style={{ flex: 1 }}>
            <ProgressBar value={done ? 1 : (i + 1) / Math.max(1, slides.length)} color={a.strong} />
          </View>
          <Txt variant="mono">
            {Math.min(i + 1, slides.length)}/{slides.length}
          </Txt>
        </FrameRow>
      }
      footer={
        <FrameRow style={{ paddingTop: 10, paddingBottom: 12, gap: 10 }}>
          {done ? (
            <>
              {topic.quizzes[0] && <Button label="Take the quiz!" tone="lime" size="lg" full onPress={() => router.replace(`/quiz/${topic.quizzes[0].id}`)} />}
              <Button label="Back to topic" tone="paper" full onPress={() => router.back()} />
            </>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {i > 0 && <Button label="Back" tone="paper" size="lg" onPress={() => setI(i - 1)} />}
              <View style={{ flex: 1 }}>
                <Button label={last ? 'Finish lesson' : 'Next'} tone={last ? 'lime' : 'ink'} size="lg" full onPress={next} testID="lesson-next" />
              </View>
            </View>
          )}
        </FrameRow>
      }
    >
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12, gap: 16 }}>
        {done ? (
          <Animated.View entering={swapIn} style={{ gap: 20, paddingTop: 40 }}>
            <MascotSays text={`Lesson complete! You're ready for the ${topic.title} quiz.`} mood="cheer" size={120} />
            {earned.xp + earned.coins > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }} testID="lesson-reward">
                {earned.xp > 0 && <Tag label={`+${earned.xp} XP`} bg={colors.lime} />}
                {earned.coins > 0 && <Tag label={`+${earned.coins} 🪙`} bg={colors['sun-soft']} />}
              </View>
            )}
          </Animated.View>
        ) : (
          <Animated.View key={i} entering={swapIn} style={{ gap: 16 }}>
            {i === 0 && (
              <View style={{ gap: 4 }}>
                <Txt variant="label">
                  {subject.name} · {topic.emoji}
                </Txt>
                <Txt variant="hero" style={{ fontSize: 30, lineHeight: 36 }}>
                  {topic.title}
                </Txt>
              </View>
            )}
            {slides[i]?.map((b, k) => (
              <LessonBlockView key={k} block={b} lang={subject.lang} />
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </Screen>
  );
}
