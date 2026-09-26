import { colors as tokenColors } from './tokens';

export type ColorName =
  | 'cream'
  | 'sand'
  | 'paper'
  | 'ink'
  | 'muted'
  | 'line'
  | 'lime'
  | 'grape'
  | 'grape-soft'
  | 'tangerine'
  | 'tangerine-soft'
  | 'mint'
  | 'mint-soft'
  | 'sky'
  | 'sky-soft'
  | 'sun'
  | 'sun-soft'
  | 'berry'
  | 'berry-soft';

export const colors = tokenColors;

/** Accent colours content authors may reference by name in syllabus JSON. */
export const accentPairs: Record<string, { strong: string; soft: string }> = {
  lime: { strong: colors.lime, soft: '#F3FBCB' },
  grape: { strong: colors.grape, soft: colors['grape-soft'] },
  tangerine: { strong: colors.tangerine, soft: colors['tangerine-soft'] },
  mint: { strong: colors.mint, soft: colors['mint-soft'] },
  sky: { strong: colors.sky, soft: colors['sky-soft'] },
  sun: { strong: colors.sun, soft: colors['sun-soft'] },
  berry: { strong: colors.berry, soft: colors['berry-soft'] },
};

export function accent(name: string | undefined) {
  return accentPairs[name ?? 'lime'] ?? accentPairs.lime;
}

export const fonts = {
  body: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  black: 'PlusJakartaSans_800ExtraBold',
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
};

export const SHADOW_OFFSET = 4;
