import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';

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
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <View className="mb-3 opacity-70">
        <Ionicons name="alert-circle-outline" size={32} color="#B91C1C" />
      </View>
      <Text
        className="text-fg dark:text-fg-dark-DEFAULT text-base text-center"
        style={{ fontFamily: 'Inter_600SemiBold' }}
      >
        {title}
      </Text>
      {message ? (
        <Text
          className="text-fg-muted dark:text-fg-dark-muted text-sm text-center mt-1.5 max-w-[300px]"
          style={{ fontFamily: 'Inter_400Regular' }}
        >
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
