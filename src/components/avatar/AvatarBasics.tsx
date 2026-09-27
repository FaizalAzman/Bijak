import { Pressable, View } from 'react-native';
import { Txt } from '@/components/ui';
import { EYES, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, type AvatarConfig } from '@/features/gamify/shop';
import { useT } from '@/i18n';
import { fx } from '@/lib/feedback';
import { colors } from '@/theme';

function Swatch({ color, selected, onPress, label }: { color: string; selected: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
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
      accessibilityRole="button"
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

const HAIR_LABEL = { short: 'hair.short', spiky: 'hair.spiky', curly: 'hair.curly', long: 'hair.long', bun: 'hair.bun', tudung: 'hair.tudung' } as const satisfies Record<AvatarConfig['hair'], string>;
const EYE_LABEL = { round: 'eyes.round', happy: 'eyes.happy', wink: 'eyes.wink' } as const satisfies Record<AvatarConfig['eyes'], string>;
/** Spoken names for the swatches (screen readers would otherwise read hex codes). */
const HAIR_COLOUR_LABEL = ['hairColour.0', 'hairColour.1', 'hairColour.2', 'hairColour.3', 'hairColour.4'] as const;

/** Free, always-available look options (skin, hair, eyes). */
export function AvatarBasics({ value, onChange }: { value: AvatarConfig; onChange: (patch: Partial<AvatarConfig>) => void }) {
  const t = useT();
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <Txt variant="label">{t('avatar.skin')}</Txt>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          {SKIN_TONES.map((c, i) => (
            <Swatch key={c} label={t('avatar.skinTone', i + 1)} color={c} selected={value.skin === c} onPress={() => onChange({ skin: c })} />
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Txt variant="label">{t('avatar.hair')}</Txt>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {HAIR_STYLES.map((h) => (
            <Option key={h} label={t(HAIR_LABEL[h])} selected={value.hair === h} onPress={() => onChange({ hair: h })} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
          {HAIR_COLORS.map((c, i) => (
            <Swatch key={c} label={t('avatar.hairColour', HAIR_COLOUR_LABEL[i] ? t(HAIR_COLOUR_LABEL[i]) : t('avatar.colour', i + 1))} color={c} selected={value.hairColor === c} onPress={() => onChange({ hairColor: c })} />
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Txt variant="label">{t('avatar.eyes')}</Txt>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {EYES.map((e) => (
            <Option key={e} label={t(EYE_LABEL[e])} selected={value.eyes === e} onPress={() => onChange({ eyes: e })} />
          ))}
        </View>
      </View>
    </View>
  );
}
