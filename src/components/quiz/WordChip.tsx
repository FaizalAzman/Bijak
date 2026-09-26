import { View } from 'react-native';
import { Txt } from '@/components/ui';
import { colors } from '@/theme';

/** Chunky word tile used in sentence building, sorting and fill-in-the-blanks. */
export function WordChip({ text, bg = colors.paper, faded, big }: { text: string; bg?: string; faded?: boolean; big?: boolean }) {
  return (
    <View style={{ opacity: faded ? 0.25 : 1 }}>
      <View style={{ position: 'absolute', left: 3, top: 3, right: -3, bottom: -3, borderRadius: 12, backgroundColor: colors.ink }} />
      <View style={{ backgroundColor: bg, borderWidth: 2, borderColor: colors.ink, borderRadius: 12, paddingHorizontal: big ? 16 : 13, paddingVertical: big ? 11 : 8 }}>
        <Txt variant="subtitle" style={{ fontSize: big ? 18 : 16 }}>
          {text}
        </Txt>
      </View>
    </View>
  );
}
