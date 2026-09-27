import { router } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useT } from '@/i18n';
import { colors } from '@/theme';
import { PressChunky } from './Chunky';
import { FrameRow } from './Frame';
import { Txt } from './Txt';

export function IconButton({ icon, onPress, label, bg = colors.paper }: { icon: ReactNode; onPress: () => void; label: string; bg?: string }) {
  return (
    <PressChunky onPress={onPress} accessibilityLabel={label} bg={bg} radius={14} depth={3} innerStyle={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </PressChunky>
  );
}

export function BackButton({ close, onPress }: { close?: boolean; onPress?: () => void }) {
  const Icon = close ? X : ChevronLeft;
  const t = useT();
  return (
    <IconButton
      label={close ? t('common.close') : t('common.back')}
      icon={<Icon size={22} color={colors.ink} strokeWidth={2.75} />}
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
    />
  );
}

export function TopBar({ title, right, close, onBack }: { title?: string; right?: ReactNode; close?: boolean; onBack?: () => void }) {
  return (
    <FrameRow style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 8, gap: 12 }}>
      <BackButton close={close} onPress={onBack} />
      <View style={{ flex: 1 }}>
        {title ? (
          <Txt variant="title" numberOfLines={1}>
            {title}
          </Txt>
        ) : null}
      </View>
      {right}
    </FrameRow>
  );
}
