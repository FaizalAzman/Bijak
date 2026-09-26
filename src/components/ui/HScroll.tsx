import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useFrame } from './Frame';

/** Horizontal scroller that bleeds to the screen edges but lines its first item up with the page. */
export function HScroll({ children, gap = 8, paddingVertical = 0 }: { children: ReactNode; gap?: number; paddingVertical?: number }) {
  const { gutter } = useFrame();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -gutter }} contentContainerStyle={{ gap, paddingHorizontal: gutter, paddingVertical }}>
      {children}
    </ScrollView>
  );
}
