import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Avatar } from '@/components/avatar/Avatar';
import { Pill, Txt } from '@/components/ui';
import { greeting } from '@/features/progress/selectors';
import { liveStreak, useActiveProfile, useProgress } from '@/store/app';
import { colors } from '@/theme';

export function KidHeader({ title }: { title?: string }) {
  const profile = useActiveProfile();
  const p = useProgress();
  const streak = liveStreak(p);
  if (!profile) return null;
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6, maxWidth: 720, width: '100%', alignSelf: 'center' }}
    >
      <Pressable accessibilityLabel="My profile" onPress={() => router.push('/me')}>
        <Avatar config={profile.avatar} size={44} />
      </Pressable>
      <View style={{ flex: 1 }}>
        {title ? (
          <Txt variant="display" style={{ fontSize: 24 }} numberOfLines={1}>
            {title}
          </Txt>
        ) : (
          <>
            <Txt variant="small">{greeting()},</Txt>
            <Txt variant="title" numberOfLines={1}>
              {profile.name}! 👋
            </Txt>
          </>
        )}
      </View>
      <Pill icon="🔥" value={streak} bg={streak > 0 ? colors['tangerine-soft'] : colors.paper} testID="streak-pill" />
      <Pill icon="🪙" value={p.coins} bg={colors['sun-soft']} testID="coin-pill" />
    </View>
  );
}
