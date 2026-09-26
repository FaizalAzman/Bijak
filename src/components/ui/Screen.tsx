import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { DotGrid } from './DotGrid';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  bg?: string;
  dots?: boolean;
  padded?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  /** Extra bottom padding (e.g. for the floating tab bar). */
  bottomInset?: number;
}

export function Screen({ children, scroll = true, header, footer, bg = colors.cream, dots = true, padded = true, contentContainerStyle, bottomInset = 0 }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const pad = padded ? 18 : 0;
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {dots && <DotGrid />}
      <View style={{ paddingTop: insets.top }}>{header}</View>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            { paddingHorizontal: pad, paddingTop: 8, paddingBottom: insets.bottom + 32 + bottomInset, maxWidth: 720, width: '100%', alignSelf: 'center' },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: pad, maxWidth: 720, width: '100%', alignSelf: 'center' }}>{children}</View>
      )}
      {footer && <View style={{ paddingBottom: insets.bottom, maxWidth: 720, width: '100%', alignSelf: 'center' }}>{footer}</View>}
    </View>
  );
}
