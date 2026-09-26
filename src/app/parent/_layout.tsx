import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function ParentLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream }, animation: 'slide_from_right' }} />;
}
