import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistableUser } from '../utils/persistedUser';

export const useUserStore = create(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only what routing/permission checks need at cold start; the full
      // profile (name, email…) stays in memory and is re-fetched via /auth/me.
      partialize: (state) => ({ user: persistableUser(state.user) }),
    },
  ),
);
