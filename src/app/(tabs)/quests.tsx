import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { KidHeader } from '@/components/gamify/KidHeader';
import { QuestRow } from '@/components/gamify/QuestRow';
import { TAB_BAR_SPACE } from '@/components/gamify/TabBar';
import { toast } from '@/components/gamify/Toaster';
import { MascotSays } from '@/components/mascot/MascotSays';
import { Button, Chunky, Screen, SectionLabel, Txt } from '@/components/ui';
import { isRestDay, SHIELD, streakStatus, type StreakStatus } from '@/features/gamify/streak';
import { dayKey, lastNDays } from '@/lib/date';
import { fx } from '@/lib/feedback';
import { liveStreak, useApp, useProgress, useRestDays } from '@/store/app';
import { colors } from '@/theme';

const STATUS_TEXT: Record<StreakStatus, string> = {
  done: 'Streak safe today! 🎉',
  rest: 'Rest day — your streak is safe 💤',
  protected: 'Your shield saves the streak if you miss today 🛡️',
  atRisk: 'Finish a quiz today to keep it!',
  none: 'Finish a quiz to start a streak',
};
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
  const buyShield = useApp((s) => s.buyShield);
  const restDays = useRestDays();
  const today = dayKey();
  const streak = liveStreak(p, today, restDays);
  const status = streakStatus(p.streak, today, restDays);
  const shields = p.streak.shields ?? 0;
  const countdown = useCountdown();
  const days = lastNDays(7);
  // Lit days are exactly the streak days: a quiz or lesson was finished (which records time).
  const active = new Set(Object.keys(p.days).filter((d) => Object.keys(p.days[d]?.seconds ?? {}).length > 0));
  const shielded = new Set(p.streak.shielded ?? []);
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
                {STATUS_TEXT[status]}
              </Txt>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {days.map((d) => {
              const on = active.has(d);
              const saved = !on && shielded.has(d);
              const rest = !on && !saved && isRestDay(d, restDays);
              const isToday = d === today;
              const weekday = new Date(`${d}T12:00:00`).getDay();
              const label = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][weekday];
              const state = on ? 'streak day' : saved ? 'saved by a shield' : rest ? 'rest day' : isToday ? 'today, not done yet' : 'no streak';
              return (
                <View key={d} style={{ alignItems: 'center', gap: 4 }} accessible accessibilityLabel={`${WEEKDAY[weekday]}: ${state}`} testID={`day-${d}`}>
                  <Txt style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, color: colors.paper }}>{label}</Txt>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      borderWidth: 2,
                      borderColor: colors.ink,
                      backgroundColor: on || saved ? colors.sun : isToday ? colors.paper : colors['tangerine-soft'],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Txt style={{ fontSize: 16 }}>{on ? '🔥' : saved ? '🛡️' : rest ? '💤' : isToday ? '•' : ''}</Txt>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={{ gap: 6 }} testID="shields">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Txt style={{ fontSize: 24 }}>🛡️</Txt>
              <Txt variant="subtitle" style={{ color: colors.paper, flex: 1 }}>{`Rest-day shields · ${shields}/${SHIELD.max}`}</Txt>
              {shields < SHIELD.max && (
                <Button
                  label={`Buy · ${SHIELD.price} 🪙`}
                  tone="paper"
                  size="sm"
                  align="center"
                  disabled={p.coins < SHIELD.price}
                  testID="buy-shield"
                  onPress={() => {
                    if (!buyShield()) return;
                    fx.coin();
                    toast({ emoji: '🛡️', title: 'Shield ready!', subtitle: 'It saves your streak if you miss a day.' });
                  }}
                />
              )}
            </View>
            <Txt variant="small" style={{ color: colors.paper }}>
              {`Saves your streak on a day you can't play. You earn one every ${SHIELD.earnEvery} days.`}
            </Txt>
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
