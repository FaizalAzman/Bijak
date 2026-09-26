import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { KidHeader } from '@/components/gamify/KidHeader';
import { QuestRow } from '@/components/gamify/QuestRow';
import { TAB_BAR_SPACE } from '@/components/gamify/TabBar';
import { MascotSays } from '@/components/mascot/MascotSays';
import { Button, Chunky, Screen, SectionLabel, Txt } from '@/components/ui';
import { dayKey, lastNDays } from '@/lib/date';
import { fx } from '@/lib/feedback';
import { liveStreak, useApp, useProgress } from '@/store/app';
import { colors } from '@/theme';

function useCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const mins = Math.max(0, Math.round((midnight.getTime() - now) / 60000));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function Quests() {
  const p = useProgress();
  const claim = useApp((s) => s.claimQuest);
  const streak = liveStreak(p);
  const countdown = useCountdown();
  const days = lastNDays(7);
  const today = dayKey();
  // Lit days are exactly the streak days: a quiz or lesson was finished (which records time).
  const active = new Set(Object.keys(p.days).filter((d) => Object.keys(p.days[d]?.seconds ?? {}).length > 0));
  const done = p.quests.list.filter((q) => q.claimed).length;

  return (
    <Screen header={<KidHeader title="Quests" />} bottomInset={TAB_BAR_SPACE}>
      <View>
        <Chunky bg={colors.tangerine} innerStyle={{ padding: 16, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Txt style={{ fontSize: 50 }}>🔥</Txt>
            <View style={{ flex: 1 }}>
              <Txt variant="hero" style={{ color: colors.paper, fontSize: 36, lineHeight: 42 }}>
                {streak} day{streak === 1 ? '' : 's'}
              </Txt>
              <Txt variant="subtitle" style={{ color: colors.paper }}>
                {p.streak.lastDay === today ? 'Streak safe today! 🎉' : streak > 0 ? 'Finish a quiz today to keep it!' : 'Finish a quiz to start a streak'}
              </Txt>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {days.map((d) => {
              const on = active.has(d);
              const isToday = d === today;
              const weekday = new Date(`${d}T12:00:00`).getDay();
              const label = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][weekday];
              const name = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][weekday];
              return (
                <View
                  key={d}
                  style={{ alignItems: 'center', gap: 4 }}
                  accessible
                  accessibilityLabel={`${name}: ${on ? 'streak day' : isToday ? 'today, not done yet' : 'no streak'}`}
                  testID={`day-${d}`}
                >
                  <Txt style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: colors.paper }}>{label}</Txt>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      borderWidth: 2,
                      borderColor: colors.ink,
                      backgroundColor: on ? colors.sun : isToday ? colors.paper : colors['tangerine-soft'],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Txt style={{ fontSize: 16 }}>{on ? '🔥' : isToday ? '•' : ''}</Txt>
                  </View>
                </View>
              );
            })}
          </View>
          <Txt variant="small" style={{ color: colors.paper }}>
            Best streak: {p.streak.best} day{p.streak.best === 1 ? '' : 's'}
          </Txt>
        </Chunky>
      </View>

      <SectionLabel right={<Txt variant="small">Resets in {countdown}</Txt>}>{`Today's quests · ${done}/${p.quests.list.length}`}</SectionLabel>
      <View style={{ gap: 12 }}>
        {p.quests.list.map((q) => (
          <View key={q.id}>
            <QuestRow
              quest={q}
              onClaim={() => {
                const got = claim(q.id);
                if (got) fx.coin();
              }}
            />
          </View>
        ))}
      </View>

      <View style={{ marginTop: 24 }}>
        <MascotSays
          mood={done === p.quests.list.length && done > 0 ? 'cheer' : 'happy'}
          text={done === p.quests.list.length && done > 0 ? 'Every quest done! New ones arrive at midnight.' : 'Finish quests to earn coins for cool stuff in the shop!'}
          size={80}
        />
      </View>
      <View style={{ marginTop: 16, flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button label="🏆 Trophies" tone="paper" full onPress={() => router.push('/trophies')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="🛍️ Shop" tone="sun" full onPress={() => router.push('/shop')} />
        </View>
      </View>
    </Screen>
  );
}
