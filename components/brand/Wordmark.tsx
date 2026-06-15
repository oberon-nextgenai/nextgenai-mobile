import { Text, View } from 'react-native';

interface WordmarkProps {
  variant?: 'full' | 'compact';
}

/**
 * Product wordmark. `full` = small-caps "NEXTGEN AI" eyebrow (the "AI" tinted
 * violet) above a bold "Prime" lockup. `compact` = just bold "Prime" for the
 * app header and other tight surfaces.
 */
export function Wordmark({ variant = 'full' }: WordmarkProps) {
  if (variant === 'compact') {
    return (
      <Text className="text-fg dark:text-fg-dark-DEFAULT font-bold text-lg tracking-tight">
        Prime
      </Text>
    );
  }
  return (
    <View>
      <Text className="text-[10px] uppercase tracking-[3px] font-medium -mb-0.5">
        <Text className="text-fg-muted dark:text-fg-dark-muted">NEXTGEN </Text>
        <Text className="text-accent-2 dark:text-accent-2-dark">AI</Text>
      </Text>
      <Text className="text-fg dark:text-fg-dark-DEFAULT font-bold text-2xl tracking-tight">
        Prime
      </Text>
    </View>
  );
}
