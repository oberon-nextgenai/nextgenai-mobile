import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';

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
        <Text
          className="text-fg dark:text-fg-dark-DEFAULT text-xl mt-4"
          style={{ fontFamily: 'Inter_700Bold' }}
        >
          Prime is locked
        </Text>
        <Text
          className="text-fg-muted dark:text-fg-dark-muted text-sm text-center mt-1.5"
          style={{ fontFamily: 'Inter_400Regular' }}
        >
          Authenticate to continue
        </Text>
        <Button className="mt-5 w-full" onPress={() => onAuthenticate()}>
          Unlock
        </Button>
      </View>
    </View>
  );
}
