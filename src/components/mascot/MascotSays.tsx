import { View } from 'react-native';
import { Txt } from '@/components/ui';
import { colors } from '@/theme';
import { Kancil, type KancilMood } from './Kancil';

/** Kancil with a speech bubble. Static by design so the message is easy to read. */
export function MascotSays({ text, mood = 'idle', size = 96, bubbleBg = colors.paper }: { text: string; mood?: KancilMood; size?: number; bubbleBg?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
      <Kancil mood={mood} size={size} />
      <View style={{ flex: 1, marginBottom: size * 0.35 }}>
        <View style={{ backgroundColor: bubbleBg, borderWidth: 2, borderColor: colors.ink, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11 }}>
          <Txt variant="subtitle" style={{ fontSize: 15, lineHeight: 21 }}>
            {text}
          </Txt>
        </View>
        {/* bubble tail */}
        <View
          style={{
            position: 'absolute',
            left: -9,
            bottom: 14,
            width: 16,
            height: 16,
            backgroundColor: bubbleBg,
            borderLeftWidth: 2,
            borderBottomWidth: 2,
            borderColor: colors.ink,
            transform: [{ rotate: '45deg' }],
          }}
        />
      </View>
    </View>
  );
}
