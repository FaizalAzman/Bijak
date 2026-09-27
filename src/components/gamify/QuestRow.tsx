import { Check } from 'lucide-react-native';
import { View } from 'react-native';
import { Button, Chunky, ProgressBar, Txt } from '@/components/ui';
import { questText, type Quest } from '@/features/gamify/quests';
import { useUiLang } from '@/i18n';
import { colors } from '@/theme';

export function QuestRow({ quest, onClaim, compact }: { quest: Quest; onClaim?: () => void; compact?: boolean }) {
  const done = quest.progress >= quest.target;
  const lang = useUiLang();
  return (
    <Chunky
      bg={quest.claimed ? colors['mint-soft'] : colors.paper}
      depth={compact ? 3 : 4}
      innerStyle={{ padding: compact ? 12 : 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: colors.ink,
          backgroundColor: done ? colors.lime : colors.sand,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Txt style={{ fontSize: 22 }}>{quest.emoji}</Txt>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Txt variant="subtitle" style={{ fontSize: 15 }}>
          {questText(quest, lang)}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <ProgressBar value={quest.progress / quest.target} height={12} color={done ? colors.mint : colors.sun} />
          </View>
          <Txt variant="mono" style={{ fontSize: 12 }}>
            {Math.min(quest.progress, quest.target)}/{quest.target}
          </Txt>
        </View>
      </View>
      {quest.claimed ? (
        <View
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.mint, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}
        >
          <Check size={18} color={colors.ink} strokeWidth={3.5} />
        </View>
      ) : done && onClaim ? (
        <Button label={`+${quest.reward} 🪙`} tone="lime" size="sm" align="center" onPress={onClaim} testID={`claim-${quest.id}`} />
      ) : (
        <Txt variant="small" style={{ color: colors.ink }}>
          🪙 {quest.reward}
        </Txt>
      )}
    </Chunky>
  );
}
