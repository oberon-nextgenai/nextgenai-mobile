import { Text, View } from 'react-native';
import { PulseRings } from './PulseRings';

export function StreamingIndicator() {
  return (
    <View className="self-start flex-row items-center py-2 px-1">
      <PulseRings size={28} />
      <Text
        className="text-fg-muted dark:text-fg-dark-muted text-xs ml-2.5"
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        Prime is thinking
      </Text>
    </View>
  );
}
