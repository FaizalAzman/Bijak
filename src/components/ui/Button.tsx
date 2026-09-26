import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/theme';
import { PressChunky } from './Chunky';
import { Txt } from './Txt';

type Tone = 'ink' | 'lime' | 'paper' | 'mint' | 'berry' | 'grape' | 'sun';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  ink: { bg: colors.ink, fg: colors.paper },
  lime: { bg: colors.lime, fg: colors.ink },
  paper: { bg: colors.paper, fg: colors.ink },
  mint: { bg: colors.mint, fg: colors.ink },
  berry: { bg: colors.berry, fg: colors.paper },
  grape: { bg: colors.grape, fg: colors.paper },
  sun: { bg: colors.sun, fg: colors.ink },
};

interface ButtonProps {
  label: string;
  onPress?: () => void;
  tone?: Tone;
  icon?: ReactNode;
  iconRight?: ReactNode;
  size?: 'md' | 'lg' | 'sm';
  disabled?: boolean;
  loading?: boolean;
  /** Stretch to the container width. */
  full?: boolean;
  /** Alignment when not `full`: 'start' in columns (default), 'center' inside rows. */
  align?: 'start' | 'center';
  testID?: string;
}

const ALIGN = { start: 'flex-start', center: 'center' } as const;

export function Button({ label, onPress, tone = 'ink', icon, iconRight, size = 'md', disabled, loading, full, align = 'start', testID }: ButtonProps) {
  const t = disabled ? { bg: colors.sand, fg: colors.muted } : TONES[tone];
  const pad = size === 'lg' ? 17 : size === 'sm' ? 8 : 13;
  return (
    <PressChunky
      testID={testID}
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      bg={t.bg}
      shadowColor={tone === 'ink' && !disabled ? '#5B5547' : colors.ink}
      radius={size === 'sm' ? 12 : 16}
      depth={disabled ? 0 : size === 'sm' ? 3 : 4}
      borderColor={disabled ? colors.line : colors.ink}
      style={{ alignSelf: full ? 'stretch' : ALIGN[align], maxWidth: '100%' }}
      innerStyle={{ paddingVertical: pad, paddingHorizontal: size === 'sm' ? 12 : 20 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {loading ? <ActivityIndicator color={t.fg} /> : icon}
        {/* One line only: a wrapping label is what made buttons grow tall and narrow. */}
        <Txt
          testID={testID ? `${testID}-label` : undefined}
          variant={size === 'lg' ? 'title' : 'subtitle'}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          maxFontSizeMultiplier={1.2}
          style={{ color: t.fg, fontSize: size === 'sm' ? 13 : undefined, flexShrink: 1, textAlign: 'center' }}
        >
          {label}
        </Txt>
        {iconRight}
      </View>
    </PressChunky>
  );
}
