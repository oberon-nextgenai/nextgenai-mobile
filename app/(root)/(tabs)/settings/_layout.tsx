import { Stack } from 'expo-router';
import { useThemeMode } from '@/hooks/useThemeMode';

export default function SettingsStackLayout() {
  const { colors } = useThemeMode();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
