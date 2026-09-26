import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { fx, haptic, playSfx, speak, stopSpeaking } from '@/lib/feedback';
import { telemetry } from '@/lib/telemetry';
import { useApp } from '@/store/app';
import { resetStores } from '../helpers';

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
  it('speaks in the right voice and makes maths readable', () => {
    speak('**Ali** has 3 × 4 − 2 ÷ 1 = ___ 🍎', 'en');
    expect(Speech.stop).toHaveBeenCalled();
    const [text, opts] = (Speech.speak as jest.Mock).mock.calls[0];
    expect(text).toBe('Ali has 3  times  4  minus  2  divided by  1 =  blank');
    expect(opts).toMatchObject({ language: 'en-GB' });
  });

  it('uses the Malaysian voice for Bahasa Melayu', () => {
    speak('Apakah maksud "besar"?', 'ms');
    expect((Speech.speak as jest.Mock).mock.calls[0][1]).toMatchObject({ language: 'ms-MY' });
  });

  it('respects the voice setting', () => {
    settings({ voice: false });
    speak('Hello');
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('stopSpeaking stops the voice', () => {
    stopSpeaking();
    expect(Speech.stop).toHaveBeenCalled();
  });
});
