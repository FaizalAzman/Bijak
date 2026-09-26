/**
 * Module 8 — Multimedia & Audio Handling (sound effects + read-aloud) and haptic feedback.
 * Uses expo-audio for short SFX, expo-speech (on-device TTS, works offline) for reading
 * questions/vocabulary aloud in English or Bahasa Melayu, and expo-haptics for touch feedback.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { useApp } from '@/store/app';
import { telemetry } from './telemetry';

const SOURCES = {
  tap: require('../../assets/sfx/tap.wav'),
  correct: require('../../assets/sfx/correct.wav'),
  wrong: require('../../assets/sfx/wrong.wav'),
  coin: require('../../assets/sfx/coin.wav'),
  levelup: require('../../assets/sfx/levelup.wav'),
  pop: require('../../assets/sfx/pop.wav'),
  whoosh: require('../../assets/sfx/whoosh.wav'),
  tick: require('../../assets/sfx/tick.wav'),
} as const;

export type Sfx = keyof typeof SOURCES;

const players: Partial<Record<Sfx, AudioPlayer>> = {};
let audioReady = false;

function ensureAudio() {
  if (audioReady) return;
  audioReady = true;
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
}

export function playSfx(name: Sfx) {
  if (!useApp.getState().settings.sound) return;
  try {
    ensureAudio();
    let p = players[name];
    if (!p) {
      p = createAudioPlayer(SOURCES[name]);
      p.volume = 0.6;
      players[name] = p;
    }
    p.seekTo(0).catch(() => undefined);
    p.play();
  } catch (e) {
    telemetry.error(e, { where: 'sfx', name });
  }
}

type HapticKind = 'tap' | 'select' | 'success' | 'error' | 'heavy';

export function haptic(kind: HapticKind) {
  if (!useApp.getState().settings.haptics || Platform.OS === 'web') return;
  const run = () => {
    switch (kind) {
      case 'tap':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case 'select':
        return Haptics.selectionAsync();
      case 'success':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'error':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      case 'heavy':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  };
  run().catch(() => undefined);
}

/** Combined helpers used across the quiz engines. */
export const fx = {
  tap: () => {
    haptic('tap');
    playSfx('tap');
  },
  correct: () => {
    haptic('success');
    playSfx('correct');
  },
  wrong: () => {
    haptic('error');
    playSfx('wrong');
  },
  drop: () => {
    haptic('select');
    playSfx('pop');
  },
  coin: () => {
    haptic('tap');
    playSfx('coin');
  },
  levelUp: () => {
    haptic('heavy');
    playSfx('levelup');
  },
};

/* ---------------------------------------------------------------- speech */

const LANG_TAG = { en: 'en-GB', ms: 'ms-MY' } as const;

/** Strip lightweight markup (**bold**, ___ blanks, emoji) before speaking. */
function speakable(text: string) {
  return text
    .replace(/\*\*/g, '')
    .replace(/_{3,}/g, ' blank ')
    .replace(/[×]/g, ' times ')
    .replace(/[÷]/g, ' divided by ')
    .replace(/−/g, ' minus ')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .trim();
}

export function speak(text: string, lang: 'en' | 'ms' = 'en', onDone?: () => void) {
  if (!useApp.getState().settings.voice) return;
  Speech.stop().catch(() => undefined);
  Speech.speak(speakable(text), { language: LANG_TAG[lang], rate: 0.9, pitch: 1.05, onDone });
}

export function stopSpeaking() {
  Speech.stop().catch(() => undefined);
}
