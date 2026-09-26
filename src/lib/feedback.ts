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
import { LANG_TAG, PITCH, pickVoice, RATE, speakable, type SpeechLang, type VoiceInfo } from './voice';

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

let voices: VoiceInfo[] | null = null;
let loading: Promise<VoiceInfo[]> | null = null;
/** Bumped by every speak/stop, so a slow first voice lookup never talks over newer speech. */
let turn = 0;

/** Browsers without any voice never answer the voice query; don't let speech wait on it. */
export const VOICE_WAIT_MS = 1500;

/** The device's voices (cached once the engine reports any; an empty list is asked again later). */
export function loadVoices(): Promise<VoiceInfo[]> {
  if (voices) return Promise.resolve(voices);
  loading ??= Promise.race([Speech.getAvailableVoicesAsync(), new Promise<VoiceInfo[]>((resolve) => setTimeout(() => resolve([]), VOICE_WAIT_MS))])
    .then((list) => {
      if (list.length) voices = list;
      else loading = null;
      return list;
    })
    .catch((e: unknown) => {
      loading = null;
      telemetry.error(e, { where: 'voices' });
      return [];
    });
  return loading;
}

/** Forget the cached voice list (e.g. after the parent installs a new voice). */
export function refreshVoices() {
  voices = null;
  loading = null;
  return loadVoices();
}

function say(text: string, lang: SpeechLang, preferred: string | undefined, onDone?: () => void) {
  const words = speakable(text, lang);
  Speech.stop().catch(() => undefined);
  const mine = ++turn;
  if (!words) return;
  const go = (list: readonly VoiceInfo[]) => {
    if (mine !== turn) return;
    const voice = pickVoice(list, lang, preferred);
    Speech.speak(words, { language: voice?.language ?? LANG_TAG[lang], ...(voice ? { voice: voice.identifier } : {}), rate: RATE, pitch: PITCH, onDone });
  };
  if (voices) go(voices);
  else loadVoices().then(go);
}

/** Read text aloud (if the voice setting is on) in the best voice for its language. */
export function speak(text: string, lang: SpeechLang = 'en', onDone?: () => void) {
  const { voice, voices: chosen } = useApp.getState().settings;
  if (!voice) return;
  say(text, lang, chosen?.[lang], onDone);
}

/** Let a parent hear a voice before choosing it (plays even when read-aloud is off). */
export function previewVoice(lang: SpeechLang, identifier?: string) {
  say(lang === 'ms' ? 'Hai! Mari belajar bersama-sama. Berapakah 7 × 8?' : 'Hello! Let’s learn together. What is 7 × 8?', lang, identifier);
}

export function stopSpeaking() {
  turn++;
  Speech.stop().catch(() => undefined);
}
