import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { fx, haptic, loadVoices, playSfx, previewVoice, refreshVoices, speak, stopSpeaking, VOICE_WAIT_MS } from '@/lib/feedback';
import { telemetry } from '@/lib/telemetry';
import type { VoiceInfo } from '@/lib/voice';
import { useApp } from '@/store/app';
import { resetStores } from '../helpers';
import { ANDROID, IOS } from '../voices';

// Keep every player the app creates, so tests can count plays even when a player is cached.
const players: { play: jest.Mock }[] = [];
(createAudioPlayer as jest.Mock).mockImplementation(() => {
  const p = { volume: 1, play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(() => Promise.resolve()) };
  players.push(p);
  return p;
});
const plays = () => players.reduce((n, p) => n + p.play.mock.calls.length, 0);

const settings = (patch: Partial<ReturnType<typeof useApp.getState>['settings']>) => useApp.getState().updateSettings(patch);

beforeEach(() => {
  resetStores();
  jest.clearAllMocks();
});

describe('sound effects', () => {
  it('play when sound is on, reusing one player per sound', () => {
    const created = players.length;
    playSfx('whoosh');
    playSfx('whoosh');
    expect(players.length - created).toBe(1);
    const player = players.at(-1) as unknown as { play: jest.Mock; seekTo: jest.Mock; volume: number };
    expect(player.play).toHaveBeenCalledTimes(2);
    expect(player.seekTo).toHaveBeenCalledWith(0);
    expect(player.volume).toBe(0.6);
    expect(setAudioModeAsync).toHaveBeenCalledTimes(1);
  });

  it('stay silent when the parent turned sound off', () => {
    settings({ sound: false });
    playSfx('wrong');
    expect(createAudioPlayer).not.toHaveBeenCalled();
    expect(plays()).toBe(0);
  });

  it('a broken audio device never crashes a quiz, it is logged instead', () => {
    (createAudioPlayer as jest.Mock).mockImplementationOnce(() => {
      throw new Error('no audio');
    });
    expect(() => playSfx('levelup')).not.toThrow();
    expect(telemetry.records().at(-1)).toMatchObject({ kind: 'error', name: 'no audio', data: { where: 'sfx', name: 'levelup' } });
  });
});

describe('haptics', () => {
  it.each([
    ['tap', 'impactAsync', 'light'],
    ['heavy', 'impactAsync', 'heavy'],
    ['select', 'selectionAsync', undefined],
    ['success', 'notificationAsync', 'success'],
    ['error', 'notificationAsync', 'error'],
  ] as const)('%s → Haptics.%s(%s)', (kind, fn, arg) => {
    haptic(kind);
    const mock = Haptics[fn] as jest.Mock;
    expect(mock).toHaveBeenCalledTimes(1);
    if (arg) expect(mock).toHaveBeenCalledWith(arg);
  });

  it('respect the haptics setting', () => {
    settings({ haptics: false });
    haptic('tap');
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('are skipped on web', () => {
    const os = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    haptic('tap');
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('a rejected haptic call is swallowed', async () => {
    (Haptics.selectionAsync as jest.Mock).mockRejectedValueOnce(new Error('busy'));
    expect(() => haptic('select')).not.toThrow();
    await Promise.resolve();
  });
});

describe('fx', () => {
  it.each([
    ['tap', 'tap'],
    ['correct', 'correct'],
    ['wrong', 'wrong'],
    ['drop', 'pop'],
    ['coin', 'coin'],
    ['levelUp', 'levelup'],
  ] as const)('fx.%s plays the %s sound and a haptic', (name, _sound) => {
    fx[name]();
    expect(plays()).toBe(1);
    const calls = (Haptics.impactAsync as jest.Mock).mock.calls.length + (Haptics.notificationAsync as jest.Mock).mock.calls.length + (Haptics.selectionAsync as jest.Mock).mock.calls.length;
    expect(calls).toBe(1);
  });
});

describe('read aloud', () => {
  const voiceList = Speech.getAvailableVoicesAsync as jest.Mock;
  const spoken = () => (Speech.speak as jest.Mock).mock.calls.map(([text, opts]) => [text, opts.voice, opts.language]);
  const flush = async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  };

  beforeEach(async () => {
    voiceList.mockResolvedValue(IOS);
    await refreshVoices();
    jest.clearAllMocks();
  });

  it('reads with the best voice on the device, at a natural pitch and an easy pace', () => {
    speak('**Ali** has 3 × 4 − 2 ÷ 1 = ___ 🍎', 'en');
    expect(Speech.stop).toHaveBeenCalled();
    expect(Speech.speak).toHaveBeenCalledWith('Ali has 3 times 4 minus 2 divided by 1 equals blank', expect.objectContaining({ voice: 'com.apple.voice.premium.en-GB.Malcolm', language: 'en-GB', pitch: 1, rate: 0.95 }));
  });

  it('reads Bahasa Melayu with a Malay voice, or the Indonesian one where there is none', async () => {
    speak('Apakah maksud "besar"?', 'ms');
    expect(spoken()).toEqual([['Apakah maksud "besar"?', 'com.apple.voice.compact.id-ID.Damayanti', 'id-ID']]);
    voiceList.mockResolvedValue(ANDROID);
    await refreshVoices();
    speak('7 × 8 = ?', 'ms');
    expect(spoken()[1]).toEqual(['7 darab 8 sama dengan berapa?', 'ms-my-x-mfm-local', 'ms-MY']);
  });

  it('uses the voice a parent picked, per language', () => {
    settings({ voices: { en: 'com.apple.voice.compact.en-US.Samantha' } });
    speak('Hello', 'en');
    speak('Hai', 'ms');
    expect(spoken()).toEqual([
      ['Hello', 'com.apple.voice.compact.en-US.Samantha', 'en-US'],
      ['Hai', 'com.apple.voice.compact.id-ID.Damayanti', 'id-ID'],
    ]);
  });

  it('before the voice list is ready it waits for it, and newer speech or stop wins', async () => {
    let resolve: (v: VoiceInfo[]) => void = () => undefined;
    voiceList.mockReturnValue(new Promise<VoiceInfo[]>((r) => (resolve = r)));
    void refreshVoices();
    speak('First', 'en');
    speak('Second', 'en');
    expect(Speech.speak).not.toHaveBeenCalled();
    resolve(IOS);
    await flush();
    expect(spoken()).toEqual([['Second', 'com.apple.voice.premium.en-GB.Malcolm', 'en-GB']]);

    voiceList.mockReturnValue(new Promise<VoiceInfo[]>((r) => (resolve = r)));
    void refreshVoices();
    speak('Never mind', 'en');
    stopSpeaking();
    resolve(IOS);
    await flush();
    expect(spoken()).toHaveLength(1);
  });

  it('with no voices reported yet, speaks with the language tag and asks again next time', async () => {
    voiceList.mockResolvedValue([]);
    await refreshVoices();
    speak('Hello', 'en');
    await flush();
    expect(spoken()).toEqual([['Hello', undefined, 'en-GB']]);
    voiceList.mockResolvedValue(ANDROID);
    speak('Again', 'en');
    await flush();
    expect(spoken()[1]).toEqual(['Again', 'en-gb-x-gba-local', 'en-GB']);
    expect(await loadVoices()).toBe(ANDROID);
  });

  it('a browser that never lists voices doesn’t hold speech up for long', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] });
    voiceList.mockReturnValue(new Promise(() => undefined));
    void refreshVoices();
    speak('Hello', 'en');
    await flush();
    expect(Speech.speak).not.toHaveBeenCalled();
    jest.advanceTimersByTime(VOICE_WAIT_MS);
    await flush();
    expect(spoken()).toEqual([['Hello', undefined, 'en-GB']]);
    jest.useRealTimers();
  });

  it('a failing voice list is reported and speech still works', async () => {
    const error = jest.spyOn(telemetry, 'error').mockImplementation(() => undefined);
    voiceList.mockRejectedValue(new Error('engine not ready'));
    await refreshVoices();
    expect(error).toHaveBeenCalledWith(expect.any(Error), { where: 'voices' });
    speak('Hello', 'ms');
    await flush();
    expect(spoken()).toEqual([['Hello', undefined, 'ms-MY']]);
    error.mockRestore();
  });

  it('text with nothing to read (only emoji) stays silent', () => {
    speak('🎲🍎', 'en');
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('respects the voice setting, but a parent can still preview voices', () => {
    settings({ voice: false });
    speak('Hello');
    expect(Speech.speak).not.toHaveBeenCalled();
    previewVoice('en', 'com.apple.voice.enhanced.en-GB.Daniel');
    previewVoice('ms');
    expect(spoken()).toEqual([
      ['Hello! Let’s learn together. What is 7 times 8?', 'com.apple.voice.enhanced.en-GB.Daniel', 'en-GB'],
      ['Hai! Mari belajar bersama-sama. Berapakah 7 darab 8?', 'com.apple.voice.compact.id-ID.Damayanti', 'id-ID'],
    ]);
  });

  it('stopSpeaking stops the voice', () => {
    stopSpeaking();
    expect(Speech.stop).toHaveBeenCalled();
  });
});

