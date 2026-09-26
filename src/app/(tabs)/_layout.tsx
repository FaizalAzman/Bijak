import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { TabBar } from '@/components/gamify/TabBar';
import { useActiveProfile, useApp } from '@/store/app';
import { colors } from '@/theme';

export default function TabsLayout() {
  const profile = useActiveProfile();
  const ensureToday = useApp((s) => s.ensureToday);

  // Daily quests reset at local midnight — refresh whenever the app returns to the foreground.
  useEffect(() => {
    ensureToday();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && ensureToday());
    return () => sub.remove();
  }, [ensureToday]);

  if (!profile) return <Redirect href="/" />;
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.cream } }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="learn" />
      <Tabs.Screen name="quests" />
      <Tabs.Screen name="shop" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
