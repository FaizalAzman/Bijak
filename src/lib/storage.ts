/**
 * Module 2 — Local-first persistence.
 * On iOS/Android every store is persisted in an on-device SQLite database
 * (expo-sqlite key-value store), so the app works fully offline.
 */
import { Storage } from 'expo-sqlite/kv-store';

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const kv: KV = {
  getItem: (key) => Storage.getItemSync(key),
  setItem: (key, value) => Storage.setItemSync(key, value),
  removeItem: (key) => {
    Storage.removeItemSync(key);
  },
};
