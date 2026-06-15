import { useEffect, useMemo } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { colorScheme as nwColorScheme } from 'nativewind';
import { useThemeStore } from '@/store/theme';
import { Colors, ColorPalette, ThemeMode } from '@/constants/Colors';

/**
 * Resolves the active theme by combining the user's Appearance preference
 * with the system color scheme, applies it to NativeWind, and exposes the
 * effective palette + setter for charts/RN inline styles.
 */
export function useThemeMode(): {
  mode: ThemeMode;
  appearance: 'system' | 'light' | 'dark';
  colors: ColorPalette;
  setAppearance: (mode: 'system' | 'light' | 'dark') => Promise<void>;
} {
  const appearance = useThemeStore((s) => s.mode);
  const setAppearance = useThemeStore((s) => s.setMode);
  const systemScheme = useRNColorScheme();

  const mode: ThemeMode = useMemo(() => {
    if (appearance === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
    return appearance;
  }, [appearance, systemScheme]);

  useEffect(() => {
    // Sync NativeWind so `dark:` classes resolve correctly.
    nwColorScheme.set(mode);
  }, [mode]);

  return { mode, appearance, colors: Colors[mode], setAppearance };
}
