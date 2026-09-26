import { View } from 'react-native';
import { Avatar, type AvatarMood } from '@/components/avatar/Avatar';
import { Chunky, ProgressBar, Txt } from '@/components/ui';
import { levelProgress, tierFor } from '@/features/gamify/xp';
import type { Profile, Progress } from '@/store/types';
import { colors } from '@/theme';

export function LevelCard({ profile, progress, mood }: { profile: Profile; progress: Progress; mood: AvatarMood }) {
  const lp = levelProgress(progress.xp);
  const tier = tierFor(lp.level);
  return (
    <Chunky bg={colors.ink} shadowColor={colors.lime} innerStyle={{ padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
      <Avatar config={profile.avatar} size={84} mood={mood} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt variant="label" style={{ color: colors.lime }}>
            {tier.emoji} {tier.name}
          </Txt>
          <Txt variant="mono" style={{ color: '#BDB6A6', fontSize: 12 }}>
            {progress.xp} XP
          </Txt>
        </View>
        <Txt variant="display" style={{ color: colors.paper, fontSize: 28, lineHeight: 32 }}>
          Level {lp.level}
        </Txt>
        <ProgressBar value={lp.ratio} color={colors.lime} track="#34302A" height={14} />
        <Txt variant="small" style={{ color: '#BDB6A6' }}>
          {lp.needed - lp.into} XP to level {lp.level + 1}
        </Txt>
      </View>
    </Chunky>
  );
}
