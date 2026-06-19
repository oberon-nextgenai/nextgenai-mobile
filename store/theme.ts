import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/lib/constants';

export type AppearanceMode = 'system' | 'light' | 'dark';

interface ThemeState {
  /** User preference (what they picked in Settings → Appearance). */
  mode: AppearanceMode;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setMode: (mode: AppearanceMode) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  // Dark-first executive app: default to the nebula dark theme until the user
  // explicitly chooses otherwise in Settings → Appearance.
  mode: 'dark',
  hydrated: false,

  hydrate: async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.theme);
    const mode: AppearanceMode =
      stored === 'light' || stored === 'dark' || stored === 'system'
        ? stored
        : 'dark';
    set({ mode, hydrated: true });
  },

  setMode: async (mode) => {
    await AsyncStorage.setItem(STORAGE_KEYS.theme, mode);
    set({ mode });
  },
}));
