import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { colors } from '@/theme';

/** Subtle dotted "graph paper" backdrop — part of the brand look. */
export const DotGrid = memo(function DotGrid({ color = colors.line }: { color?: string }) {
  return (
    <Svg width="100%" height="100%" style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <Defs>
        <Pattern id="dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
          <Circle cx="2" cy="2" r="1.4" fill={color} />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#dots)" />
    </Svg>
  );
});
