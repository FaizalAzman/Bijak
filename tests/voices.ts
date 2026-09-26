/**
 * Voice lists as real devices report them (expo-speech `getAvailableVoicesAsync`), for the
 * read-aloud tests.
 */
import type { VoiceInfo } from '@/lib/voice';

const v = (identifier: string, name: string, language: string, quality = 'Default'): VoiceInfo => ({ identifier, name, language, quality });

/** iPhone: compact, enhanced and premium voices, Siri, Eloquence and novelty voices; no Malay voice. */
export const IOS: VoiceInfo[] = [
  v('com.apple.speech.synthesis.voice.Fred', 'Fred', 'en-US'),
  v('com.apple.speech.synthesis.voice.Zarvox', 'Zarvox', 'en-US'),
  v('com.apple.eloquence.en-GB.Eddy', 'Eddy', 'en-GB'),
  v('com.apple.voice.compact.en-GB.Daniel', 'Daniel', 'en-GB'),
  v('com.apple.voice.enhanced.en-GB.Daniel', 'Daniel (Enhanced)', 'en-GB', 'Enhanced'),
  v('com.apple.voice.premium.en-GB.Malcolm', 'Malcolm (Premium)', 'en-GB', 'Enhanced'),
  v('com.apple.voice.compact.en-US.Samantha', 'Samantha', 'en-US'),
  v('com.apple.ttsbundle.siri_Martha_en-GB_compact', 'Martha', 'en-GB'),
  v('com.apple.voice.compact.id-ID.Damayanti', 'Damayanti', 'id-ID'),
  v('com.apple.voice.compact.fr-FR.Thomas', 'Thomas', 'fr-FR'),
];

/** Android with Google speech services: local and network twins, Malay and Indonesian. */
export const ANDROID: VoiceInfo[] = [
  v('en-us-x-sfg-network', 'en-us-x-sfg-network', 'en-US', 'Enhanced'),
  v('en-us-x-sfg-local', 'en-us-x-sfg-local', 'en-US', 'Enhanced'),
  v('en-gb-x-gba-network', 'en-gb-x-gba-network', 'en-GB', 'Enhanced'),
  v('en-gb-x-gba-local', 'en-gb-x-gba-local', 'en-GB', 'Enhanced'),
  v('id-id-x-idc-local', 'id-id-x-idc-local', 'id-ID', 'Enhanced'),
  v('ms-my-x-mfm-local', 'ms-my-x-mfm-local', 'ms-MY', 'Enhanced'),
  v('ms-my-x-mfm-network', 'ms-my-x-mfm-network', 'ms-MY', 'Enhanced'),
  v('com.svox.pico.en_GB', 'Pico TTS', 'en_GB'),
];

/** Desktop Chrome/Edge: Google and Microsoft neural voices next to eSpeak. */
export const WEB: VoiceInfo[] = [
  v('eSpeak English', 'eSpeak English', 'en'),
  v('Microsoft George - English (United Kingdom)', 'Microsoft George - English (United Kingdom)', 'en-GB'),
  v('Microsoft Libby Online (Natural) - English (United Kingdom)', 'Microsoft Libby Online (Natural) - English (United Kingdom)', 'en-GB'),
  v('Google UK English Female', 'Google UK English Female', 'en-GB'),
  v('Google Bahasa Indonesia', 'Google Bahasa Indonesia', 'id-ID'),
];
