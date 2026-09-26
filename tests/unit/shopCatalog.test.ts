import { DEFAULT_AVATAR, EYES, FREE_ITEMS, HAIR_COLORS, HAIR_STYLES, itemById, SHOP, SKIN_TONES, SLOT_LABEL, type Slot } from '@/features/gamify/shop';

const SLOTS: Slot[] = ['outfit', 'hat', 'glasses', 'bg', 'pet'];
const HEX = /^#[0-9A-F]{6}$/i;

describe('shop catalogue', () => {
  it('has unique ids and valid slots', () => {
    expect(new Set(SHOP.map((i) => i.id)).size).toBe(SHOP.length);
    for (const i of SHOP) expect(SLOTS).toContain(i.slot);
  });

  it('prices are whole, non-negative coin amounts', () => {
    for (const i of SHOP) {
      expect(Number.isInteger(i.price)).toBe(true);
      expect(i.price).toBeGreaterThanOrEqual(0);
    }
  });

  it('level locks start above level 1 and only on paid items', () => {
    for (const i of SHOP.filter((x) => x.minLevel != null)) {
      expect(Number.isInteger(i.minLevel)).toBe(true);
      expect(i.minLevel!).toBeGreaterThan(1);
      expect(i.price).toBeGreaterThan(0);
    }
  });

  it('every item can be drawn or shown (colour or emoji)', () => {
    for (const i of SHOP) {
      expect(i.name.trim()).not.toBe('');
      expect(i.emoji).toBeTruthy();
      if (i.color) expect(i.color).toMatch(HEX);
      if (i.accent) expect(i.accent).toMatch(HEX);
      if (i.slot === 'outfit' || i.slot === 'bg' || i.slot === 'hat') expect(i.color).toMatch(HEX);
    }
  });

  it('every slot has something to buy, with a label', () => {
    for (const s of SLOTS) {
      expect(SLOT_LABEL[s]).toBeTruthy();
      expect(SHOP.some((i) => i.slot === s && i.price > 0)).toBe(true);
    }
  });

  it('free items are exactly the price-0 items and cover the default outfit and background', () => {
    expect(FREE_ITEMS).toEqual(SHOP.filter((i) => i.price === 0).map((i) => i.id));
    expect(FREE_ITEMS).toContain(DEFAULT_AVATAR.outfit);
    expect(FREE_ITEMS).toContain(DEFAULT_AVATAR.bg);
    // Outfit and background can never be empty, so each needs a free default.
    expect(SHOP.some((i) => i.slot === 'outfit' && i.price === 0)).toBe(true);
    expect(SHOP.some((i) => i.slot === 'bg' && i.price === 0)).toBe(true);
  });

  it('the default avatar only uses allowed basics', () => {
    expect(SKIN_TONES).toContain(DEFAULT_AVATAR.skin);
    expect(HAIR_STYLES).toContain(DEFAULT_AVATAR.hair);
    expect(HAIR_COLORS).toContain(DEFAULT_AVATAR.hairColor);
    expect(EYES).toContain(DEFAULT_AVATAR.eyes);
    expect(DEFAULT_AVATAR.hat).toBeUndefined();
  });

  it('itemById finds items and tolerates junk', () => {
    expect(itemById('crown')?.name).toBe('Golden Crown');
    expect(itemById('nope')).toBeUndefined();
    expect(itemById(undefined)).toBeUndefined();
  });

  it('basic palettes have no duplicates', () => {
    for (const list of [SKIN_TONES, HAIR_COLORS, HAIR_STYLES, EYES] as string[][]) expect(new Set(list).size).toBe(list.length);
    for (const c of [...SKIN_TONES, ...HAIR_COLORS]) expect(c).toMatch(HEX);
  });
});
