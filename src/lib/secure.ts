/**
 * Module 4 — secrets (parent PIN hash, sync token) live in the OS keychain/keystore
 * via Expo SecureStore. Falls back to the local KV store where SecureStore is unavailable (web).
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { kv } from './storage';

const useSecure = Platform.OS === 'ios' || Platform.OS === 'android';

export async function secureGet(key: string): Promise<string | null> {
  return useSecure ? SecureStore.getItemAsync(key) : kv.getItem(`secure:${key}`);
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (useSecure) await SecureStore.setItemAsync(key, value);
  else kv.setItem(`secure:${key}`, value);
}

export async function secureDelete(key: string): Promise<void> {
  if (useSecure) await SecureStore.deleteItemAsync(key);
  else kv.removeItem(`secure:${key}`);
}

const PIN_KEY = 'bijak.parentPin';

async function hashPin(pin: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function setParentPin(pin: string): Promise<void> {
  const salt = Crypto.randomUUID();
  await secureSet(PIN_KEY, JSON.stringify({ salt, hash: await hashPin(pin, salt) }));
}

export async function verifyParentPin(pin: string): Promise<boolean> {
  const raw = await secureGet(PIN_KEY);
  if (!raw) return false;
  const { salt, hash } = JSON.parse(raw) as { salt: string; hash: string };
  return (await hashPin(pin, salt)) === hash;
}

export async function hasParentPin(): Promise<boolean> {
  return (await secureGet(PIN_KEY)) != null;
}

export async function clearParentPin(): Promise<void> {
  await secureDelete(PIN_KEY);
}
