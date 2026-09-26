import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLayout, type Frame } from '@/hooks/useLayout';
import { colors } from '@/theme';
import { DotGrid } from './DotGrid';
import { FrameContext } from './Frame';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  bg?: string;
  dots?: boolean;
  /** 'reading' (default) for text-heavy screens, 'wide' for grids that use tablet space. */
  frame?: Frame;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  /** Extra bottom padding (e.g. for the floating tab bar). */
  bottomInset?: number;
}

export function Screen({ children, scroll = true, header, footer, bg = colors.cream, dots = true, frame = 'reading', contentContainerStyle, bottomInset = 0 }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const layout = useLayout(frame);
  const { gutter, maxWidth } = layout;
  const column = { maxWidth, width: '100%' as const, alignSelf: 'center' as const };
  return (
    <FrameContext.Provider value={layout}>
      <View style={{ flex: 1, backgroundColor: bg, paddingLeft: insets.left, paddingRight: insets.right }}>
        {dots && <DotGrid />}
        <View style={{ paddingTop: insets.top }}>{header}</View>
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[{ paddingHorizontal: gutter, paddingTop: 8, paddingBottom: insets.bottom + 32 + bottomInset, ...column }, contentContainerStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingHorizontal: gutter, ...column }}>{children}</View>
        )}
        {footer && <View style={{ paddingBottom: insets.bottom, ...column }}>{footer}</View>}
      </View>
    </FrameContext.Provider>
  );
}
