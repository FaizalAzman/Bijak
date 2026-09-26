import { Pressable, View } from 'react-native';
import { Txt } from '@/components/ui';
import { EYES, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, type AvatarConfig } from '@/features/gamify/shop';
import { fx } from '@/lib/feedback';
import { colors } from '@/theme';

function Swatch({ color, selected, onPress, label }: { color: string; selected: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={() => {
        fx.tap();
        onPress();
      }}
      style={{
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: color,
        borderWidth: selected ? 4 : 2,
        borderColor: colors.ink,
        transform: [{ scale: selected ? 1.08 : 1 }],
      }}
    />
  );
}

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityState={{ selected }}
      onPress={() => {
        fx.tap();
        onPress();
      }}
      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 2, borderColor: colors.ink, backgroundColor: selected ? colors.ink : colors.paper }}
    >
      <Txt variant="subtitle" style={{ fontSize: 14, color: selected ? colors.paper : colors.ink }}>
        {label}
      </Txt>
    </Pressable>
  );
}

const HAIR_LABEL: Record<AvatarConfig['hair'], string> = { short: 'Short', spiky: 'Spiky', curly: 'Curly', long: 'Long', bun: 'Bun', tudung: 'Tudung' };
const EYE_LABEL: Record<AvatarConfig['eyes'], string> = { round: 'Bright', happy: 'Smiley', wink: 'Wink' };

/** Free, always-available look options (skin, hair, eyes). */
export function AvatarBasics({ value, onChange }: { value: AvatarConfig; onChange: (patch: Partial<AvatarConfig>) => void }) {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <Txt variant="label">Skin</Txt>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          {SKIN_TONES.map((c) => (
            <Swatch key={c} label={`Skin ${c}`} color={c} selected={value.skin === c} onPress={() => onChange({ skin: c })} />
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Txt variant="label">Hair</Txt>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {HAIR_STYLES.map((h) => (
            <Option key={h} label={HAIR_LABEL[h]} selected={value.hair === h} onPress={() => onChange({ hair: h })} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
          {HAIR_COLORS.map((c) => (
            <Swatch key={c} label={`Hair colour ${c}`} color={c} selected={value.hairColor === c} onPress={() => onChange({ hairColor: c })} />
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Txt variant="label">Eyes</Txt>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {EYES.map((e) => (
            <Option key={e} label={EYE_LABEL[e]} selected={value.eyes === e} onPress={() => onChange({ eyes: e })} />
          ))}
        </View>
      </View>
    </View>
  );
}
