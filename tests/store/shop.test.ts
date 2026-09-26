/** Shop, arcade unlocks and avatar rules — enforced by the store, whatever the UI sends. */
import { DEFAULT_AVATAR, EYES, HAIR_COLORS, itemById, SHOP } from '@/features/gamify/shop';
import { xpForLevel } from '@/features/gamify/xp';
import { useApp } from '@/store/app';
import { index, patchProgress, progressOf, resetStores, setNow, setupChild } from '../helpers';

const s = () => useApp.getState();
const avatar = () => s().profiles.find((p) => p.id === s().activeProfileId)!.avatar;
const coins = (n: number) => patchProgress({ coins: n });

beforeEach(() => {
  setNow('2026-03-02T09:00:00');
  resetStores();
  setupChild({ level: 3 });
});
afterEach(() => jest.useRealTimers());

describe('buying items', () => {
  it('spends the catalogue price and adds the item', () => {
    expect(s().buy('tee-sky')).toBe(true);
    expect(progressOf().coins).toBe(50 - itemById('tee-sky')!.price);
    expect(progressOf().inventory).toContain('tee-sky');
    expect(progressOf().totals.purchases).toBe(1);
    expect(progressOf().badges.shopper).toBeDefined();
  });

  it('works with exactly enough coins, leaving zero', () => {
    coins(itemById('cap-red')!.price);
    expect(s().buy('cap-red')).toBe(true);
    expect(progressOf().coins).toBe(0);
  });

  it('refuses when short of coins', () => {
    coins(itemById('hoodie-grape')!.price - 1);
    expect(s().buy('hoodie-grape')).toBe(false);
    expect(progressOf().inventory).not.toContain('hoodie-grape');
    expect(progressOf().coins).toBe(itemById('hoodie-grape')!.price - 1);
  });

  it('refuses a second purchase of the same item', () => {
    coins(1000);
    expect(s().buy('sunnies')).toBe(true);
    expect(s().buy('sunnies')).toBe(false);
    expect(progressOf().inventory.filter((i) => i === 'sunnies')).toHaveLength(1);
    expect(progressOf().coins).toBe(1000 - itemById('sunnies')!.price);
  });

  it('refuses free starter items (already owned) and unknown ids', () => {
    expect(s().buy('tee-lime')).toBe(false);
    expect(s().buy('does-not-exist')).toBe(false);
    expect(s().buy('arcade:s3-arcade-words')).toBe(false);
    expect(progressOf().coins).toBe(50);
  });

  it.each(SHOP.filter((i) => i.minLevel).map((i) => [i.id, i.minLevel!] as const))('%s stays locked until level %i, even with coins', (id, level) => {
    coins(10_000);
    patchProgress({ xp: xpForLevel(level) - 1 });
    expect(s().buy(id)).toBe(false);
    patchProgress({ xp: xpForLevel(level) });
    expect(s().buy(id)).toBe(true);
  });

  it('every paid item can be bought by a learner with enough coins and level', () => {
    coins(100_000);
    patchProgress({ xp: xpForLevel(50) });
    for (const item of SHOP.filter((i) => i.price > 0)) expect(s().buy(item.id)).toBe(true);
    expect(progressOf().coins).toBe(100_000 - SHOP.reduce((n, i) => n + i.price, 0));
  });
});

describe('arcade unlocks', () => {
  const paid = () => index().standards.flatMap((std) => std.arcade.filter((g) => g.price > 0));
  const free = () => index().standards.flatMap((std) => std.arcade.filter((g) => g.price === 0));

  it('charge the price from the syllabus', () => {
    const game = paid()[0];
    coins(game.price + 7);
    expect(s().unlockArcade(game.id)).toBe(true);
    expect(progressOf().coins).toBe(7);
    expect(progressOf().inventory).toContain(`arcade:${game.id}`);
    expect(progressOf().totals.purchases).toBe(1);
  });

  it('cannot be unlocked twice, without coins, for free games, or for unknown games', () => {
    const game = paid()[0];
    coins(game.price - 1);
    expect(s().unlockArcade(game.id)).toBe(false);
    coins(game.price * 3);
    expect(s().unlockArcade(game.id)).toBe(true);
    expect(s().unlockArcade(game.id)).toBe(false);
    expect(s().unlockArcade(free()[0].id)).toBe(false);
    expect(s().unlockArcade('ghost-game')).toBe(false);
    expect(progressOf().coins).toBe(game.price * 2);
  });
});

describe('equipping', () => {
  it('wears owned items in their own slot', () => {
    coins(500);
    s().buy('crown') || patchProgress((p) => p.inventory.push('crown'));
    expect(s().equip('hat', 'crown')).toBe(true);
    expect(avatar().hat).toBe('crown');
  });

  it('refuses items not owned, in the wrong slot, or unknown', () => {
    expect(s().equip('hat', 'crown')).toBe(false);
    patchProgress((p) => p.inventory.push('crown'));
    expect(s().equip('outfit', 'crown')).toBe(false);
    expect(s().equip('hat', 'ghost')).toBe(false);
    expect(avatar()).toEqual(DEFAULT_AVATAR);
  });

  it('accessories can be taken off; outfit and background cannot be emptied', () => {
    patchProgress((p) => p.inventory.push('cap-red'));
    s().equip('hat', 'cap-red');
    expect(s().equip('hat', undefined)).toBe(true);
    expect('hat' in avatar()).toBe(false);
    expect(s().equip('outfit', undefined)).toBe(false);
    expect(s().equip('bg', undefined)).toBe(false);
    expect(avatar().outfit).toBe(DEFAULT_AVATAR.outfit);
  });
});

describe('avatar basics', () => {
  it('accepts palette values', () => {
    expect(s().setAvatar({ eyes: 'wink', hairColor: HAIR_COLORS[4], hair: 'tudung' })).toBe(true);
    expect(avatar()).toMatchObject({ eyes: 'wink', hairColor: HAIR_COLORS[4], hair: 'tudung' });
  });

  it('rejects anything off-palette, or shop slots smuggled in, without partial changes', () => {
    expect(s().setAvatar({ eyes: 'laser' as never })).toBe(false);
    expect(s().setAvatar({ skin: '#00FF00' })).toBe(false);
    expect(s().setAvatar({ eyes: EYES[2], outfit: 'suit-space' } as never)).toBe(false);
    expect(avatar()).toEqual(DEFAULT_AVATAR);
  });

  it('avatar edits sync (profile change bumps the revision)', () => {
    const dirty = s().dirtyAt;
    s().setAvatar({ eyes: 'happy' });
    expect(s().dirtyAt).toBeGreaterThan(dirty);
  });
});
