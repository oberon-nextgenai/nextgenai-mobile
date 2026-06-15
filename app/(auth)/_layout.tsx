import { Stack } from 'expo-router';
import { useThemeMode } from '@/hooks/useThemeMode';

export default function AuthLayout() {
  const { colors } = useThemeMode();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    />
  );
}
