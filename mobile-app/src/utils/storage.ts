import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from './constants';

// In-memory fallback for environments where SecureStore is not supported (e.g. web preview)
const memoryStore = new Map<string, string>();

async function setItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      memoryStore.set(key, value);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    console.warn(`[storage] Error writing key ${key}:`, err);
    memoryStore.set(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key) || memoryStore.get(key) || null;
      }
      return memoryStore.get(key) || null;
    }
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    console.warn(`[storage] Error reading key ${key}:`, err);
    return memoryStore.get(key) || null;
  }
}

async function deleteItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      memoryStore.delete(key);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    console.warn(`[storage] Error deleting key ${key}:`, err);
    memoryStore.delete(key);
  }
}

// Token storage helpers
export async function saveTokens(accessToken: string, refreshToken?: string): Promise<void> {
  await setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  if (refreshToken) {
    await setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

export async function clearTokens(): Promise<void> {
  await deleteItem(STORAGE_KEYS.ACCESS_TOKEN);
  await deleteItem(STORAGE_KEYS.REFRESH_TOKEN);
}

// Persistent hardware device footprint
export async function getOrCreateDeviceUUID(): Promise<string> {
  let uuid = await getItem(STORAGE_KEYS.DEVICE_UUID);
  if (!uuid) {
    // Generate pseudo-random UUID v4
    uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    await setItem(STORAGE_KEYS.DEVICE_UUID, uuid);
  }
  return uuid;
}
