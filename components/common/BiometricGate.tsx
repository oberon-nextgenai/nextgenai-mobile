import { useEffect } from 'react';
import { View } from 'react-native';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';

interface BiometricGateProps {
  onAuthenticate: () => Promise<boolean>;
}

export function BiometricGate({ onAuthenticate }: BiometricGateProps) {
  useEffect(() => {
    onAuthenticate().catch(() => undefined);
  }, [onAuthenticate]);

  return (
    <View className="absolute inset-0 bg-bg dark:bg-bg-dark items-center justify-center z-50">
      <View className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl p-8 items-center w-80">
        <Logo size={64} withBackground />
        <Text variant="display.md" className="mt-4">
          Prime is locked
        </Text>
        <Text variant="body.sm" tone="muted" className="text-center mt-1.5">
          Authenticate to continue
        </Text>
        <Button className="mt-5 w-full" onPress={() => onAuthenticate()}>
          Unlock
        </Button>
      </View>
    </View>
  );
}
