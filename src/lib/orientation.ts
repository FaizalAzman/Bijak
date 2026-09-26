import * as ScreenOrientation from 'expo-screen-orientation';
import { Dimensions, Platform } from 'react-native';

/** Phones stay in portrait (their layouts are designed for it); tablets rotate freely. */
export const isPhoneSized = (width: number, height: number) => Math.min(width, height) < 600;

export function lockPhonesToPortrait(screen = Dimensions.get('screen')): boolean {
  if (Platform.OS === 'web' || !isPhoneSized(screen.width, screen.height)) return false;
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
  return true;
}
