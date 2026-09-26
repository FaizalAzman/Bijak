import { kv } from '@/lib/storage.web';

describe('web storage fallback', () => {
  beforeEach(() => window.localStorage?.clear?.());

  it('reads back what it writes and removes keys', () => {
    kv.setItem('a', '1');
    expect(kv.getItem('a')).toBe('1');
    kv.removeItem('a');
    expect(kv.getItem('a')).toBeNull();
  });

  it('falls back to memory when localStorage throws (private mode)', () => {
    const ls = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('denied');
      },
    });
    kv.setItem('b', '2');
    expect(kv.getItem('b')).toBe('2');
    kv.removeItem('b');
    expect(kv.getItem('b')).toBeNull();
    Object.defineProperty(window, 'localStorage', { configurable: true, value: ls });
  });
});
