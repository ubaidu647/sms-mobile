import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Tokens live in the OS keychain/keystore, not AsyncStorage (plain, unencrypted
// app storage). A value previously saved to AsyncStorage is moved over once on
// first read, so existing sessions survive the upgrade.
const secureStorage = {
  getItem: async (name) => {
    const value = await SecureStore.getItemAsync(name);
    if (value !== null) return value;

    const legacy = await AsyncStorage.getItem(name);
    if (legacy !== null) {
      await SecureStore.setItemAsync(name, legacy);
      await AsyncStorage.removeItem(name);
    }
    return legacy;
  },
  setItem: (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: (name) => SecureStore.deleteItemAsync(name),
};

// expo-secure-store has no web implementation (`npm run web` would never
// hydrate), so the web build keeps the old AsyncStorage (localStorage) path.
const storage = Platform.OS === 'web' ? AsyncStorage : secureStorage;

export const useTokenStore = create(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      hasHydrated: false,

      setHasHydrated: (state) => set({ hasHydrated: state }),
      setTokens: (tokens) => set(tokens),
      clearTokens: () => set({ accessToken: null, refreshToken: null }),
    }),
    {
      name: 'token-storage',
      storage: createJSONStorage(() => storage),
      // Only the tokens are persisted; hydration state is runtime-only.
      partialize: ({ accessToken, refreshToken }) => ({ accessToken, refreshToken }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
