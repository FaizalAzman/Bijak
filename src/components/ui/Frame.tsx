import { createContext, useContext, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { computeLayout, type Layout } from '@/hooks/useLayout';

/** Page frame (max width + gutters) provided by <Screen> to everything rendered inside it. */
export const FrameContext = createContext<Layout>(computeLayout(390, 844));

export const useFrame = () => useContext(FrameContext);

/** A row aligned to the page frame, for custom headers and footers. */
export function FrameRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { gutter, maxWidth } = useFrame();
  return <View style={[{ paddingHorizontal: gutter, maxWidth, width: '100%', alignSelf: 'center' }, style]}>{children}</View>;
}
