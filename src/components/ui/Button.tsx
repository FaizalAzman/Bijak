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
  full?: boolean;
  testID?: string;
}

export function Button({ label, onPress, tone = 'ink', icon, iconRight, size = 'md', disabled, loading, full, testID }: ButtonProps) {
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
      style={full ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }}
      innerStyle={{ paddingVertical: pad, paddingHorizontal: size === 'sm' ? 12 : 20 }}
    >
      <View className="flex-row items-center justify-center" style={{ gap: 8 }}>
        {loading ? <ActivityIndicator color={t.fg} /> : icon}
        <Txt variant={size === 'lg' ? 'title' : 'subtitle'} style={{ color: t.fg, fontSize: size === 'sm' ? 13 : undefined }}>
          {label}
        </Txt>
        {iconRight}
      </View>
    </PressChunky>
  );
}
