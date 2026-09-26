import { router } from 'expo-router';
import { View } from 'react-native';
import { Kancil } from '@/components/mascot/Kancil';
import { Button, Screen, Txt } from '@/components/ui';
import { useT } from '@/i18n';

export default function NotFound() {
  const t = useT();
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <Kancil mood="think" size={150} />
        <Txt variant="display">{t('notFound.title')}</Txt>
        <Button label={t('notFound.home')} tone="lime" onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}
