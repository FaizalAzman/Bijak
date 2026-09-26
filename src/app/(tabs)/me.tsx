import { router } from 'expo-router';
import { ChevronRight, Lock, Palette, Trophy, Users } from 'lucide-react-native';
import { View } from 'react-native';
import { Avatar } from '@/components/avatar/Avatar';
import { KidHeader } from '@/components/gamify/KidHeader';
import { TAB_BAR_SPACE } from '@/components/gamify/TabBar';
import { Chunky, Grid, PressChunky, Screen, SectionLabel, Toggle, Txt } from '@/components/ui';
import { allBadges } from '@/features/gamify/badges';
import { levelProgress, tierFor } from '@/features/gamify/xp';
import { useContentIndex } from '@/features/content/registry';
import { useLayout } from '@/hooks/useLayout';
import { pct } from '@/lib/format';
import { liveStreak, useActiveProfile, useApp, useProgress } from '@/store/app';
import { accent, colors } from '@/theme';

function Stat({ label, value, bg }: { label: string; value: string | number; bg: string }) {
  return (
    <Chunky bg={bg} style={{ flex: 1 }} depth={3} innerStyle={{ padding: 12, gap: 2 }}>
      <Txt variant="hero" style={{ fontSize: 26, lineHeight: 32 }}>
        {value}
      </Txt>
      <Txt variant="small" style={{ color: colors.ink }}>
        {label}
      </Txt>
    </Chunky>
  );
}

function Row({ icon, label, onPress, bg = colors.paper }: { icon: React.ReactNode; label: string; onPress: () => void; bg?: string }) {
  return (
    <PressChunky onPress={onPress} bg={bg} depth={3} innerStyle={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityLabel={label}>
      {icon}
      <Txt variant="subtitle" style={{ flex: 1 }}>
        {label}
      </Txt>
      <ChevronRight size={20} color={colors.ink} strokeWidth={2.75} />
    </PressChunky>
  );
}

export default function Me() {
  const profile = useActiveProfile();
  const p = useProgress();
  const index = useContentIndex();
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.updateSettings);
  const layout = useLayout();
  if (!profile) return null;
  const lp = levelProgress(p.xp);
  const tier = tierFor(lp.level);
  const badges = allBadges(index).filter((b) => p.badges[b.id]);
  const std = index.standardByLevel(profile.level);

  return (
    <Screen header={<KidHeader title="Me" />} bottomInset={TAB_BAR_SPACE}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Avatar config={profile.avatar} size={layout.isTablet ? 170 : layout.small ? 120 : 150} mood="happy" />
        <Txt variant="hero">{profile.name}</Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ backgroundColor: colors.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Txt style={{ color: colors.lime, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13 }}>
              {tier.emoji} Level {lp.level} {tier.name}
            </Txt>
          </View>
          <View style={{ backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 2 }}>
            <Txt style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13 }}>{std?.title ?? `Standard ${profile.level}`}</Txt>
          </View>
        </View>
      </View>

      <View style={{ height: 20 }} />
      <Grid minItemWidth={140} maxColumns={4} gap={10}>
        <Stat key="correct" label="Correct answers" value={p.totals.correct} bg={colors['mint-soft']} />
        <Stat key="accuracy" label="Accuracy" value={`${pct(p.totals.correct, p.totals.answered)}%`} bg={colors['sky-soft']} />
        <Stat key="streak" label="Day streak" value={`🔥 ${liveStreak(p)}`} bg={colors['tangerine-soft']} />
        <Stat key="badges" label="Badges" value={`🏅 ${badges.length}`} bg={colors['sun-soft']} />
      </Grid>

      {badges.length > 0 && (
        <>
          <SectionLabel
            right={
              <Txt variant="small" style={{ color: colors.grape }} onPress={() => router.push('/trophies')}>
                All
              </Txt>
            }
          >
            Latest badges
          </SectionLabel>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            {badges
              .sort((a, b) => (p.badges[b.id] ?? 0) - (p.badges[a.id] ?? 0))
              .slice(0, 4)
              .map((b) => (
                <View
                  key={b.id}
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 34,
                    backgroundColor: accent(b.color).strong,
                    borderWidth: 2,
                    borderColor: colors.ink,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Txt style={{ fontSize: 30 }}>{b.emoji}</Txt>
                </View>
              ))}
          </View>
        </>
      )}

      <SectionLabel>My stuff</SectionLabel>
      <View style={{ gap: 10 }}>
        <Row icon={<Palette size={22} color={colors.ink} />} label="Customise my avatar" onPress={() => router.push('/avatar')} bg={colors['grape-soft']} />
        <Row icon={<Trophy size={22} color={colors.ink} />} label="Trophy room" onPress={() => router.push('/trophies')} bg={colors['sun-soft']} />
      </View>

      <SectionLabel>Settings</SectionLabel>
      <Chunky depth={3} innerStyle={{ paddingHorizontal: 14, paddingVertical: 4 }}>
        <Toggle label="Sound effects" value={settings.sound} onChange={(v) => update({ sound: v })} />
        <Toggle label="Vibration" value={settings.haptics} onChange={(v) => update({ haptics: v })} />
        <Toggle label="Voice (read aloud)" value={settings.voice} onChange={(v) => update({ voice: v })} />
        <Toggle label="Auto-read questions" hint="Great for younger readers" value={settings.autoRead} onChange={(v) => update({ autoRead: v })} />
      </Chunky>

      <SectionLabel>Grown-ups</SectionLabel>
      <View style={{ gap: 10 }}>
        <Row icon={<Users size={22} color={colors.ink} />} label="Switch learner" onPress={() => router.push('/profiles')} />
        <Row icon={<Lock size={22} color={colors.ink} />} label="Parent zone" onPress={() => router.push('/parent')} bg={colors.sand} />
      </View>
    </Screen>
  );
}
