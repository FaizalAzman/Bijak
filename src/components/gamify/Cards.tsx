import { Lock } from 'lucide-react-native';
import { View } from 'react-native';
import { PressChunky, ProgressBar, Txt } from '@/components/ui';
import type { ArcadeGame, Subject } from '@/features/content/schema';
import { accent, colors } from '@/theme';

export function SubjectCard({ subject, ratio, mastered, onPress }: { subject: Subject; ratio: number; mastered: number; onPress: () => void }) {
  const a = accent(subject.color);
  return (
    <PressChunky onPress={onPress} bg={a.soft} style={{ flex: 1 }} innerStyle={{ padding: 14, gap: 10, minHeight: 150 }} accessibilityLabel={subject.name}>
      <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: a.strong, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Txt style={{ fontSize: 26 }}>{subject.emoji}</Txt>
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="subtitle" numberOfLines={1}>
          {subject.name}
        </Txt>
        <Txt variant="small" numberOfLines={1}>
          {subject.topics.length} topics · {mastered} ⭐
        </Txt>
      </View>
      <ProgressBar value={ratio} color={a.strong} height={10} />
    </PressChunky>
  );
}

export function ArcadeCard({ game, locked, best, onPress }: { game: ArcadeGame; locked: boolean; best?: number; onPress: () => void }) {
  const a = accent(game.color);
  return (
    <PressChunky
      onPress={onPress}
      bg={locked ? colors.sand : a.strong}
      style={{ width: 150 }}
      innerStyle={{ padding: 14, gap: 8, height: 150, justifyContent: 'space-between' }}
      accessibilityLabel={game.title}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Txt style={{ fontSize: 34, opacity: locked ? 0.5 : 1 }}>{game.emoji}</Txt>
        {locked ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.ink, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Lock size={12} color={colors.lime} strokeWidth={3} />
            <Txt style={{ color: colors.lime, fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>{game.price}</Txt>
          </View>
        ) : null}
      </View>
      <View>
        <Txt variant="subtitle" numberOfLines={2} style={{ color: colors.ink }}>
          {game.title}
        </Txt>
        <Txt variant="small" style={{ color: colors.ink, opacity: 0.75 }}>
          {locked ? 'Unlock in shop' : best ? `Best: ${best}` : `${game.quiz.seconds}s challenge`}
        </Txt>
      </View>
    </PressChunky>
  );
}
