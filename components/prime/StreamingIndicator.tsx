import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { PulseRings } from './PulseRings';

export function StreamingIndicator() {
  return (
    <View className="self-start flex-row items-center py-2 px-1">
      <PulseRings size={28} />
      {/* Run state, not prose — the deck's mono eyebrow next to the rings. */}
      <Text variant="mono.label" tone="muted" className="ml-2.5">
        Prime is thinking
      </Text>
    </View>
  );
}
