import { Capacitor } from '@capacitor/core';
import { KeychainAccess, SecureStorage } from '@aparajita/capacitor-secure-storage';
import { createClient } from '@supabase/supabase-js';

// Prefer Vite variables, but support the NEXT_PUBLIC_* names already configured on Netlify.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL) as string | undefined;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const isNativeClient = Capacitor.isNativePlatform();
const nativeAuthStorageReady: Promise<void> = isNativeClient
  ? (async () => {
      await SecureStorage.setKeyPrefix('jdv_nexora_auth_v1_');

      if (Capacitor.getPlatform() === 'ios') {
        await SecureStorage.setDefaultKeychainAccess(KeychainAccess.whenUnlockedThisDeviceOnly);
      }

      // iOS Keychain items can survive app removal. A non-sensitive marker in
      // WebView storage lets a fresh installation clear any stale prior session.
      const installMarker = 'jdv_nexora_native_install_v1';
      if (!window.localStorage.getItem(installMarker)) {
        await SecureStorage.clear();
        window.localStorage.setItem(installMarker, '1');
      }
    })()
  : Promise.resolve();

const nativeAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    await nativeAuthStorageReady;
    return SecureStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    await nativeAuthStorageReady;
    await SecureStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    await nativeAuthStorageReady;
    await SecureStorage.removeItem(key);
  },
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        ...(isNativeClient ? { storage: nativeAuthStorage } : {}),
      },
    })
  : null;
