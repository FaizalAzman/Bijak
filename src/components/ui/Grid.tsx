import { Children, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useFrame } from './Frame';

/**
 * Responsive grid: fits as many columns of at least `minItemWidth` as the width allows
 * (2 on phones, 3–5 on tablets for small tiles), with equal-width items.
 */
export function Grid({ children, minItemWidth, maxColumns = 4, gap = 12 }: { children: ReactNode; minItemWidth: number; maxColumns?: number; gap?: number }) {
  const frame = useFrame();
  const [width, setWidth] = useState(frame.innerWidth);
  const columns = Math.max(1, Math.min(maxColumns, Math.floor((width + gap) / (minItemWidth + gap))));
  const itemWidth = Math.floor((width - gap * (columns - 1)) / columns);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {Children.toArray(children).map((child, i) => (
        <View key={(child as { key?: string }).key ?? i} style={{ width: itemWidth, flexDirection: 'column' }}>
          {child}
        </View>
      ))}
    </View>
  );
}
