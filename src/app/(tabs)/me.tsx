import { router } from 'expo-router';
import { ChevronRight, Lock, Palette, Trophy, Users } from 'lucide-react-native';
import { View } from 'react-native';
import { Avatar } from '@/components/avatar/Avatar';
import { LanguagePicker } from '@/components/LanguagePicker';
import { KidHeader } from '@/components/gamify/KidHeader';
import { TAB_BAR_SPACE } from '@/components/gamify/TabBar';
import { Chunky, Grid, PressChunky, Screen, SectionLabel, Toggle, Txt } from '@/components/ui';
import { allBadges } from '@/features/gamify/badges';
import { standardName, useT } from '@/i18n';
import { levelProgress, tierFor } from '@/features/gamify/xp';
import { useChildContent } from '@/hooks/useChildContent';
import { useLayout } from '@/hooks/useLayout';
import { pct } from '@/lib/format';
import { dayKey } from '@/lib/date';
import { liveStreak, useActiveProfile, useApp, useProgress, useRestDays } from '@/store/app';
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
  const index = useChildContent();
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.updateSettings);
  const layout = useLayout();
  const restDays = useRestDays();
  const t = useT();
  if (!profile) return null;
  const lp = levelProgress(p.xp);
  const tier = tierFor(lp.level);
  const badges = allBadges(index).filter((b) => p.badges[b.id]);
  const std = index.standardByLevel(profile.level);

  return (
    <Screen header={<KidHeader title={t('tabs.me')} />} bottomInset={TAB_BAR_SPACE}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Avatar config={profile.avatar} size={layout.isTablet ? 170 : layout.small ? 120 : 150} mood="happy" />
        <Txt variant="hero">{profile.name}</Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ backgroundColor: colors.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Txt style={{ color: colors.lime, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13 }}>
              {tier.emoji} {t('me.levelTier', lp.level, t(tier.key))}
            </Txt>
          </View>
          <View style={{ backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 2 }}>
            <Txt style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13 }}>{std ? standardName(std, t.lang) : t('common.standard', profile.level)}</Txt>
          </View>
        </View>
      </View>

      <View style={{ height: 20 }} />
      <Grid minItemWidth={140} maxColumns={4} gap={10}>
        <Stat key="correct" label={t('me.correct')} value={p.totals.correct} bg={colors['mint-soft']} />
        <Stat key="accuracy" label={t('me.accuracy')} value={`${pct(p.totals.correct, p.totals.answered)}%`} bg={colors['sky-soft']} />
        <Stat key="streak" label={t('me.streak')} value={`🔥 ${liveStreak(p, dayKey(), restDays)}`} bg={colors['tangerine-soft']} />
        <Stat key="badges" label={t('me.badges')} value={`🏅 ${badges.length}`} bg={colors['sun-soft']} />
      </Grid>

      {badges.length > 0 && (
        <>
          <SectionLabel
            right={
              <Txt variant="small" style={{ color: colors.grape }} onPress={() => router.push('/trophies')}>
                {t('me.all')}
              </Txt>
            }
          >
            {t('me.latestBadges')}
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

      <SectionLabel>{t('me.myStuff')}</SectionLabel>
      <View style={{ gap: 10 }}>
        <Row icon={<Palette size={22} color={colors.ink} />} label={t('me.customise')} onPress={() => router.push('/avatar')} bg={colors['grape-soft']} />
        <Row icon={<Trophy size={22} color={colors.ink} />} label={t('me.trophyRoom')} onPress={() => router.push('/trophies')} bg={colors['sun-soft']} />
      </View>

      <SectionLabel>{t('me.settings')}</SectionLabel>
      <Chunky depth={3} innerStyle={{ paddingHorizontal: 14, paddingVertical: 4 }}>
        <View style={{ paddingVertical: 10 }}>
          <LanguagePicker />
        </View>
        <Toggle label={t('me.sound')} value={settings.sound} onChange={(v) => update({ sound: v })} />
        <Toggle label={t('me.vibration')} value={settings.haptics} onChange={(v) => update({ haptics: v })} />
        <Toggle label={t('me.voice')} value={settings.voice} onChange={(v) => update({ voice: v })} />
        <Toggle label={t('me.autoRead')} hint={t('me.autoReadHint')} value={settings.autoRead} onChange={(v) => update({ autoRead: v })} />
      </Chunky>

      <SectionLabel>{t('me.grownUps')}</SectionLabel>
      <View style={{ gap: 10 }}>
        <Row icon={<Users size={22} color={colors.ink} />} label={t('me.switch')} onPress={() => router.push('/profiles')} />
        <Row icon={<Lock size={22} color={colors.ink} />} label={t('me.parentZone')} onPress={() => router.push('/parent')} bg={colors.sand} />
      </View>
    </Screen>
  );
}
