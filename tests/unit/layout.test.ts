import { computeLayout } from '@/hooks/useLayout';

describe('computeLayout', () => {
  it.each([
    // device, w, h, tablet, small, gutter
    ['iPhone SE (1st gen)', 320, 568, false, true, 14],
    ['iPhone SE 2/3', 375, 667, false, true, 18],
    ['iPhone 15', 393, 852, false, false, 18],
    ['Pixel 7', 412, 915, false, false, 18],
    ['Galaxy Fold (folded)', 344, 882, false, true, 14],
    ['iPad mini portrait', 744, 1133, true, false, 28],
    ['iPad Pro landscape', 1366, 1024, true, false, 28],
    ['phone landscape', 852, 393, false, true, 18],
  ])('%s', (_, w, h, tablet, small, gutter) => {
    const l = computeLayout(w, h);
    expect(l.isTablet).toBe(tablet);
    expect(l.small).toBe(small);
    expect(l.gutter).toBe(gutter);
    expect(l.landscape).toBe(w > h);
  });

  it('caps content width per frame and keeps gutters inside it', () => {
    expect(computeLayout(1366, 1024, 'reading').innerWidth).toBe(720 - 56);
    expect(computeLayout(1366, 1024, 'wide').innerWidth).toBe(1040 - 56);
    expect(computeLayout(390, 844, 'wide').innerWidth).toBe(390 - 36);
  });

  it('never returns a negative content width', () => {
    expect(computeLayout(10, 10).innerWidth).toBe(0);
  });

  it('content width grows with the screen and never exceeds it', () => {
    let prev = -1;
    for (let w = 280; w <= 1600; w += 20) {
      const l = computeLayout(w, 900, 'wide');
      expect(l.innerWidth).toBeGreaterThanOrEqual(prev === -1 ? 0 : Math.min(prev, l.innerWidth));
      expect(l.innerWidth + l.gutter * 2).toBeLessThanOrEqual(Math.max(w, l.gutter * 2));
      prev = l.innerWidth;
    }
  });
});

describe('orientation', () => {
  const { isPhoneSized, lockPhonesToPortrait } = jest.requireActual<typeof import('@/lib/orientation')>('@/lib/orientation');
  const ScreenOrientation = jest.requireMock<typeof import('expo-screen-orientation')>('expo-screen-orientation');

  it.each([
    [390, 844, true],
    [844, 390, true],
    [599, 1000, true],
    [744, 1133, false],
    [1366, 1024, false],
  ])('%ix%i phone-sized: %s', (w, h, phone) => {
    expect(isPhoneSized(w, h)).toBe(phone);
  });

  it('locks phones to portrait and lets tablets rotate', () => {
    (ScreenOrientation.lockAsync as jest.Mock).mockClear();
    expect(lockPhonesToPortrait({ width: 820, height: 1180, scale: 2, fontScale: 1 })).toBe(false);
    expect(ScreenOrientation.lockAsync).not.toHaveBeenCalled();
    expect(lockPhonesToPortrait({ width: 390, height: 844, scale: 3, fontScale: 1 })).toBe(true);
    expect(ScreenOrientation.lockAsync).toHaveBeenCalledWith(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  });
});
