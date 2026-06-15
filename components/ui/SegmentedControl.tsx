import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { cn } from '@/lib/cn';
import { usePressScale } from '@/hooks/usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}

function Segment({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const press = usePressScale({ to: 0.97 });
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={press.animatedStyle}
      className={cn(
        'flex-1 items-center justify-center py-2 rounded-full',
        selected && 'bg-accent dark:bg-accent-dark',
      )}
    >
      <Text
        className={cn(
          'text-sm',
          selected ? 'text-white' : 'text-fg dark:text-fg-dark-DEFAULT',
        )}
        style={{ fontFamily: selected ? 'Inter_600SemiBold' : 'Inter_500Medium' }}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <View
      className={cn(
        'flex-row bg-surface-2 dark:bg-surface-2-dark border border-border dark:border-border-dark rounded-full p-0.5',
        className,
      )}
    >
      {options.map((opt) => (
        <Segment
          key={opt.value}
          label={opt.label}
          selected={opt.value === value}
          onPress={() => onChange(opt.value)}
        />
      ))}
    </View>
  );
}
