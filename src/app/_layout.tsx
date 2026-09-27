import '../../global.css';
import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka/600SemiBold';
import { Fredoka_700Bold } from '@expo-google-fonts/fredoka/700Bold';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono/400Regular';
import { SpaceMono_700Bold } from '@expo-google-fonts/space-mono/700Bold';
import { useFonts } from 'expo-font';
import { router, Stack, usePathname, type ErrorBoundaryProps, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from '@/components/gamify/Toaster';
import { Kancil } from '@/components/mascot/Kancil';
import { Button, Txt } from '@/components/ui';
import { startReminders } from '@/features/reminders/service';
import { useT } from '@/i18n';
import { startBackgroundServices } from '@/features/sync/services';
import { loadVoices } from '@/lib/feedback';
import { lockPhonesToPortrait } from '@/lib/orientation';
import { installCrashHandler, startFrameMonitor, telemetry } from '@/lib/telemetry';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
installCrashHandler();

lockPhonesToPortrait();

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const t = useT();
  useEffect(() => {
    telemetry.error(error, { where: 'boundary' });
  }, [error]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
      <Kancil mood="sad" size={150} />
      <Txt variant="display" style={{ textAlign: 'center' }}>
        {t('error.title')}
      </Txt>
      <Txt variant="body" style={{ textAlign: 'center', color: colors.muted }}>
        {t('error.body')}
      </Txt>
      <Button label={t('error.retry')} tone="lime" onPress={retry} />
    </View>
  );
}

/** Measures how long each route takes to mount and render its first frame. */
function ScreenTimer() {
  const pathname = usePathname();
  const started = useRef(0);
  useEffect(() => {
    const t0 = started.current || Date.now();
    const id = requestAnimationFrame(() => telemetry.screen(pathname, Date.now() - t0));
    telemetry.setContext(`screen:${pathname}`);
    return () => {
      cancelAnimationFrame(id);
      started.current = Date.now();
    };
  }, [pathname]);
  return null;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded, error]);

  useEffect(() => {
    const stopFrames = startFrameMonitor();
    const stopServices = startBackgroundServices();
    // Find the most natural read-aloud voice now, so the first question is read without a pause.
    void loadVoices();
    // Reminders follow progress; tapping one (even one that launched the app) opens its screen.
    const stopReminders = startReminders((url) => router.push(url as Href));
    return () => {
      stopFrames();
      stopServices();
      stopReminders();
    };
  }, []);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.cream }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <ScreenTimer />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream }, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="profiles" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="quiz/[quizId]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
          <Stack.Screen name="lesson/[topicId]" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="parent" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
        <Toaster />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
