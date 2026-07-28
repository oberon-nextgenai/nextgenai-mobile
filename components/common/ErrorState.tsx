import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useThemeMode } from '@/hooks/useThemeMode';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  const { colors } = useThemeMode();
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <View className="mb-3 opacity-70">
        <Ionicons name="alert-circle-outline" size={30} color={colors.danger} />
      </View>
      <Text variant="display.sm" className="text-center">
        {title}
      </Text>
      {message ? (
        <Text variant="body.sm" tone="muted" className="text-center mt-2 max-w-[300px]">
          {message}
        </Text>
      ) : null}
      {onRetry ? (
        <View className="mt-5">
          <Button onPress={onRetry} variant="secondary">
            Try again
          </Button>
        </View>
      ) : null}
    </View>
  );
}
