import { router } from 'expo-router';
import { View } from 'react-native';
import { Kancil } from '@/components/mascot/Kancil';
import { Button, Txt } from '@/components/ui';
import { colors } from '@/theme';

export default function NotFound() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: colors.cream, padding: 24 }}>
      <Kancil mood="think" size={150} />
      <Txt variant="display">Hmm, I’m lost!</Txt>
      <Button label="Go home" tone="lime" onPress={() => router.replace('/')} />
    </View>
  );
}
