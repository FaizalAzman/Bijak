import { useWindowDimensions } from 'react-native';

/**
 * 'reading' keeps text-heavy screens (quizzes, lessons) at a comfortable line length;
 * 'wide' lets grid screens (home, shop, trophies…) use the extra room on tablets.
 */
export type Frame = 'reading' | 'wide';

const MAX_WIDTH: Record<Frame, number> = { reading: 720, wide: 1040 };

export interface Layout {
  width: number;
  height: number;
  /** Tablet-class device (iPad, Android tablets, foldables unfolded). */
  isTablet: boolean;
  /** Small phone (e.g. iPhone SE, compact Androids): tighten sizes. */
  small: boolean;
  landscape: boolean;
  /** Horizontal page padding. */
  gutter: number;
  maxWidth: number;
  /** Usable content width inside the gutters. */
  innerWidth: number;
}

export function computeLayout(width: number, height: number, frame: Frame = 'reading'): Layout {
  const isTablet = Math.min(width, height) >= 600;
  const small = width < 360 || height < 680;
  const gutter = isTablet ? 28 : width < 360 ? 14 : 18;
  const maxWidth = MAX_WIDTH[frame];
  const innerWidth = Math.max(0, Math.min(width, maxWidth) - gutter * 2);
  return { width, height, isTablet, small, landscape: width > height, gutter, maxWidth, innerWidth };
}

export function useLayout(frame: Frame = 'reading'): Layout {
  const { width, height } = useWindowDimensions();
  return computeLayout(width, height, frame);
}
