/**
 * Read-aloud quality: the best voice on the device, and text rewritten the way a teacher
 * would read it (no "R M eighteen point five zero", no "one slash two").
 */
import { cleanVoiceChoices, LANG_TAG, pickVoice, rankVoices, speakable, voiceLabel, voiceScore, withoutOnlineTwins, type VoiceInfo } from '@/lib/voice';
import { ANDROID, IOS, WEB } from '../voices';

const ids = (list: VoiceInfo[]) => list.map((v) => v.identifier);

describe('choosing the voice', () => {
  it('iPhone: premium beats enhanced beats compact; novelty and Eloquence voices come last', () => {
    const ranked = ids(rankVoices(IOS, 'en'));
    expect(ranked[0]).toBe('com.apple.voice.premium.en-GB.Malcolm');
    expect(ranked[1]).toBe('com.apple.voice.enhanced.en-GB.Daniel');
    expect(ranked.indexOf('com.apple.ttsbundle.siri_Martha_en-GB_compact')).toBeLessThan(ranked.indexOf('com.apple.voice.compact.en-GB.Daniel'));
    expect(ranked.slice(-3).sort()).toEqual(['com.apple.eloquence.en-GB.Eddy', 'com.apple.speech.synthesis.voice.Fred', 'com.apple.speech.synthesis.voice.Zarvox'].sort());
    // Only English voices can read English.
    expect(ranked).not.toContain('com.apple.voice.compact.fr-FR.Thomas');
    expect(ranked).not.toContain('com.apple.voice.compact.id-ID.Damayanti');
  });

  it('iPhone has no Malay voice, so Bahasa Melayu is read by the Indonesian one', () => {
    expect(pickVoice(IOS, 'ms')?.identifier).toBe('com.apple.voice.compact.id-ID.Damayanti');
  });

  it('Android: a British voice, the offline twin, and a real Malay voice for Bahasa Melayu', () => {
    expect(pickVoice(ANDROID, 'en')?.identifier).toBe('en-gb-x-gba-local');
    expect(pickVoice(ANDROID, 'ms')?.identifier).toBe('ms-my-x-mfm-local');
    expect(ids(rankVoices(ANDROID, 'ms'))).toEqual(['ms-my-x-mfm-local', 'ms-my-x-mfm-network', 'id-id-x-idc-local']);
    expect(rankVoices(ANDROID, 'en').at(-1)?.name).toBe('Pico TTS');
  });

  it('browsers: neural Google/Microsoft voices over classic ones, never eSpeak', () => {
    const ranked = ids(rankVoices(WEB, 'en'));
    expect(ranked.slice(0, 2).sort()).toEqual(['Google UK English Female', 'Microsoft Libby Online (Natural) - English (United Kingdom)'].sort());
    expect(ranked.at(-1)).toBe('eSpeak English');
    expect(pickVoice(WEB, 'ms')?.identifier).toBe('Google Bahasa Indonesia');
  });

  it('the pick is stable when voices tie', () => {
    const twins = [
      { identifier: 'b', name: 'Beth', language: 'en-GB', quality: 'Default' },
      { identifier: 'a', name: 'Anna', language: 'en-GB', quality: 'Default' },
      { identifier: 'c', name: 'Anna', language: 'en-GB', quality: 'Default' },
    ];
    expect(ids(rankVoices(twins, 'en'))).toEqual(['a', 'c', 'b']);
    expect(ids(rankVoices([...twins].reverse(), 'en'))).toEqual(['a', 'c', 'b']);
  });

  it('a parent’s choice wins while the device still has it (and it can read the language)', () => {
    expect(pickVoice(IOS, 'en', 'com.apple.voice.compact.en-US.Samantha')?.identifier).toBe('com.apple.voice.compact.en-US.Samantha');
    expect(pickVoice(IOS, 'en', 'uninstalled-voice')?.identifier).toBe('com.apple.voice.premium.en-GB.Malcolm');
    expect(pickVoice(IOS, 'en', 'com.apple.voice.compact.fr-FR.Thomas')?.identifier).toBe('com.apple.voice.premium.en-GB.Malcolm');
  });

  it('no suitable voice → null (the engine then uses its default for the language tag)', () => {
    expect(pickVoice([], 'en')).toBeNull();
    expect(pickVoice(IOS.filter((v) => !/^(en|id)/.test(v.language)), 'ms')).toBeNull();
    expect(voiceScore(IOS[0], 'ms')).toBeNull();
    expect(LANG_TAG).toEqual({ en: 'en-GB', ms: 'ms-MY' });
  });

  it('voices get friendly names for the parent’s picker', () => {
    expect(voiceLabel(IOS[5])).toBe('Malcolm · British English (premium)');
    expect(voiceLabel(IOS[4])).toBe('Daniel · British English (enhanced)');
    expect(voiceLabel(IOS[3])).toBe('Daniel · British English');
    expect(voiceLabel(ANDROID[3])).toBe('British English · gba (enhanced)');
    expect(voiceLabel(ANDROID[5])).toBe('Bahasa Melayu · mfm (enhanced)');
    expect(voiceLabel({ identifier: 'x', name: 'Kiri', language: 'mi-NZ', quality: 'Default' })).toBe('Kiri · mi-NZ');
    expect(voiceLabel(WEB[4])).toBe('Google Bahasa Indonesia · Bahasa Indonesia');
    expect(voiceLabel(ANDROID[2])).toBe('British English · gba (enhanced, needs internet)');
    expect(voiceLabel({ identifier: 'en-au-x-aua-network', name: 'en-au-x-aua-network', language: 'en-AU', quality: 'Default' })).toBe('Australian English · aua (needs internet)');
  });

  it('the picker hides online twins of on-device voices', () => {
    expect(ids(withoutOnlineTwins(ANDROID))).toEqual(['en-us-x-sfg-local', 'en-gb-x-gba-local', 'id-id-x-idc-local', 'ms-my-x-mfm-local', 'com.svox.pico.en_GB']);
    const online = [{ identifier: 'en-in-x-ahp-network', name: 'en-in-x-ahp-network', language: 'en-IN', quality: 'Default' }];
    expect(withoutOnlineTwins(online)).toEqual(online);
  });

  it('saved choices keep only a voice id per known language', () => {
    expect(cleanVoiceChoices({ en: 'a', ms: 'b' })).toEqual({ en: 'a', ms: 'b' });
    expect(cleanVoiceChoices({ en: '', ms: 42, fr: 'x', zh: 'y' })).toEqual({});
    expect(cleanVoiceChoices({ en: 'x'.repeat(301), ms: '  ' })).toEqual({});
    expect(cleanVoiceChoices(null)).toEqual({});
    expect(cleanVoiceChoices('en')).toEqual({});
  });
});

describe('what is said', () => {
  it.each([
    // Numbers are read as numbers, not digit groups.
    ['What is the place value of 7 in 4 725?', 'What is the place value of 7 in 4725?'],
    ['3 000 + 400 + 50 + 2 = ?', '3000 plus 400 plus 50 plus 2 equals what?'],
    ['7 × 8 = ?', '7 times 8 equals what?'],
    ['45 ÷ 9 = ?', '45 divided by 9 equals what?'],
    ['1 000 − 275 = ?', '1000 minus 275 equals what?'],
    ['10 - 4 = 6', '10 minus 4 equals 6'],
    ['4 725  ?  4 752', 'Compare 4725 and 4752.'],
    // Money
    ['RM12.50 + RM3.20 = RM ?', '12 ringgit 50 sen plus 3 ringgit 20 sen equals how many ringgit?'],
    ['You have RM1 250.00. You spend RM0.80. How much is left?', 'You have 1250 ringgit. You spend 80 sen. How much is left?'],
    ['A shirt costs RM35. How much altogether? (RM)', 'A shirt costs 35 ringgit. How much altogether? (ringgit)'],
    ['RM4.5 is 450 sen.', '4 ringgit 50 sen is 450 sen.'],
    // Fractions, percent, units
    ['Is 1/2 bigger than 1/5?', 'Is 1 half bigger than 1 fifth?'],
    ['He ate 3/8 of the cake, not 3/4 or 2/11.', 'He ate 3 eighths of the cake, not 3 quarters or 2 over 11.'],
    ['50% is the same as one half.', '50 percent is the same as one half.'],
    ['3 m = ___ cm', '3 metres equals blank centimetres'],
    ['1 l is more than 500 ml.', '1 litre is more than 500 millilitres.'],
    ['Would you measure it in g or kg?', 'Would you measure it in grams or kilograms?'],
    ['Area in cm², volume in cm³. 1.5 m', 'Area in square centimetres, volume in cubic centimetres. 1.5 metres'],
    ['I’m at 7:30 a.m.', 'I’m at 7:30 a.m.'],
    // Markup, emoji, symbols
    ['**Ali** has 3 × 4 − 2 ÷ 1 = ___ 🍎', 'Ali has 3 times 4 minus 2 divided by 1 equals blank'],
    ['How many stars? ⭐⭐⭐⭐⭐⭐⭐', 'How many stars?'],
    ['Mei Ling has 🍎🍎🍎. 👩‍⚕️ Visit the dentist 👍🏽', 'Mei Ling has this many. Visit the dentist'],
    // Pictographs: the key is "a picture", a row to count is "this many" (the count is the child's job).
    ['Each 🍎 = 2 apples. Mei Ling has 🍎🍎🍎🍎🍎. How many apples does she have?', 'Each picture equals 2 apples. Mei Ling has this many. How many apples does she have?'],
    ['Each ⭐️ = 5 stars. Kavin has ⭐️⭐️⭐️, how many stars?', 'Each picture equals 5 stars. Kavin has this many, how many stars?'],
    ['1 bicycle : 2 wheels. 1 car : 4 wheels', '1 bicycle to 2 wheels. 1 car to 4 wheels'],
    ['4 hundreds > 0 hundreds, 2 < 3', '4 hundreds is more than 0 hundreds, 2 is less than 3'],
    ['Salt & pepper → yum · ok', 'Salt and pepper, yum, ok'],
    ['🎲', ''],
  ])('en: %s', (input, spoken) => {
    expect(speakable(input, 'en')).toBe(spoken);
  });

  it.each([
    ['Apakah nilai tempat bagi digit 7 dalam 4 725?', 'Apakah nilai tempat bagi digit 7 dalam 4725?'],
    ['7 × 8 = ?', '7 darab 8 sama dengan berapa?'],
    ['45 ÷ 9 − 1 + 2 = ?', '45 bahagi 9 tolak 1 tambah 2 sama dengan berapa?'],
    ['4 725  ?  4 752', 'Bandingkan 4725 dengan 4752.'],
    ['Kamu ada RM18.50. Kamu belanja RM3. Berapakah baki wang kamu?', 'Kamu ada 18 ringgit 50 sen. Kamu belanja 3 ringgit. Berapakah baki wang kamu?'],
    ['RM5 + RM2.25 = RM ?', '5 ringgit tambah 2 ringgit 25 sen sama dengan berapa ringgit?'],
    ['Nombor perpuluhan manakah yang sama dengan 7/10? 0.7', 'Nombor perpuluhan manakah yang sama dengan 7 per 10? 0 perpuluhan 7'],
    ['25 daripada 100 = 25%', '25 daripada 100 sama dengan 25 peratus'],
    ['3 m = ___ cm', '3 meter sama dengan tempat kosong sentimeter'],
    ['2 kg = ___ g, 1 l, 500 ml, 1.5 km', '2 kilogram sama dengan tempat kosong gram, 1 liter, 500 mililiter, 1 perpuluhan 5 kilometer'],
    ['Sekolah bermula pukul 7:30 pagi dan waktu rehat pukul 10:00 pagi.', 'Sekolah bermula pukul 7 30 pagi dan waktu rehat pukul 10 pagi.'],
    ['Unit piawai: luas dalam **cm²**, isi padu dalam **cm³**.', 'Unit piawai: luas dalam sentimeter persegi, isi padu dalam sentimeter padu.'],
    ['4 ratus > 0 ratus & 2 < 3', '4 ratus lebih besar daripada 0 ratus dan 2 lebih kecil daripada 3'],
    ['Setiap ⭐ = 5 bintang. Kavin ada ⭐⭐⭐. Berapakah bilangan bintang?', 'Setiap gambar sama dengan 5 bintang. Kavin ada sebanyak ini. Berapakah bilangan bintang?'],
    ['1 basikal : 2 roda.', '1 basikal kepada 2 roda.'],
  ])('ms: %s', (input, spoken) => {
    expect(speakable(input, 'ms')).toBe(spoken);
  });

  it('defaults to English', () => {
    expect(speakable('1/2')).toBe('1 half');
  });
});
