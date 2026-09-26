import { View } from 'react-native';
import { Chunky, Grid, ProgressBar, Screen, TopBar, Txt } from '@/components/ui';
import { useContentIndex } from '@/features/content/registry';
import { allBadges } from '@/features/gamify/badges';
import { useProgress } from '@/store/app';
import { accent, colors } from '@/theme';

/** Module 19 — the trophy room. */
export default function Trophies() {
  const p = useProgress();
  const badges = allBadges(useContentIndex());
  const earned = badges.filter((b) => p.badges[b.id]).length;
  return (
    <Screen frame="wide" header={<TopBar title="Trophy room" />}>
      <Chunky bg={colors.ink} shadowColor={colors.sun} innerStyle={{ padding: 18, gap: 10 }}>
        <Txt variant="label" style={{ color: colors.sun }}>
          Collected
        </Txt>
        <Txt variant="hero" style={{ color: colors.paper }}>
          🏆 {earned} / {badges.length}
        </Txt>
        <ProgressBar value={earned / Math.max(1, badges.length)} color={colors.sun} track="#34302A" />
      </Chunky>
      <View style={{ height: 20 }} />
      <Grid minItemWidth={140} maxColumns={5}>
        {badges.map((b) => {
          const got = !!p.badges[b.id];
          const a = accent(b.color);
          const prog = b.progress?.(p) ?? (got ? 1 : 0);
          return (
            <View key={b.id} style={{ flex: 1 }}>
              <Chunky bg={got ? a.soft : colors.paper} depth={got ? 4 : 2} style={{ flex: 1 }} innerStyle={{ flex: 1, padding: 12, alignItems: 'center', gap: 6, minHeight: 176 }}>
                <View
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 35,
                    backgroundColor: got ? a.strong : colors.sand,
                    borderWidth: 2.5,
                    borderColor: got ? colors.ink : colors.line,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Txt style={{ fontSize: 34, opacity: got ? 1 : 0.3 }}>{b.emoji}</Txt>
                </View>
                <Txt variant="subtitle" style={{ textAlign: 'center', fontSize: 14, opacity: got ? 1 : 0.7 }} numberOfLines={2}>
                  {b.title}
                </Txt>
                <Txt variant="small" style={{ textAlign: 'center', fontSize: 12 }} numberOfLines={3}>
                  {b.description}
                </Txt>
                {!got && b.progress ? (
                  <View style={{ width: '100%', marginTop: 'auto' }}>
                    <ProgressBar value={prog} height={8} color={a.strong} />
                  </View>
                ) : got ? (
                  <Txt variant="small" style={{ color: colors.ink, marginTop: 'auto' }}>
                    {new Date(p.badges[b.id]).toLocaleDateString()}
                  </Txt>
                ) : null}
              </Chunky>
            </View>
          );
        })}
      </Grid>
    </Screen>
  );
}
