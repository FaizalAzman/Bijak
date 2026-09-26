import { router } from 'expo-router';
import { View } from 'react-native';
import { Kancil } from '@/components/mascot/Kancil';
import { Button, Screen, Txt } from '@/components/ui';

export default function NotFound() {
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <Kancil mood="think" size={150} />
        <Txt variant="display">Hmm, I’m lost!</Txt>
        <Button label="Go home" tone="lime" onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}
