import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { useThemeMode } from '@/hooks/useThemeMode';

export default function BootRouter() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const { colors } = useThemeMode();

  useEffect(() => {
    if (token) {
      router.replace('/(root)/(tabs)/brief' as never);
    } else {
      router.replace('/(auth)/sign-in');
    }
  }, [token, router]);

  return (
    <View className="flex-1 items-center justify-center bg-bg dark:bg-bg-dark">
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}
