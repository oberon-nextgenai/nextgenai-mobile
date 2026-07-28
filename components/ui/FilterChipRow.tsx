import { ScrollView, Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { cn } from '@/lib/cn';
import { Type } from '@/constants/Typography';
import { useThemeMode } from '@/hooks/useThemeMode';
import { usePressScale } from '@/hooks/usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
  /** Trailing count — "All 14", "Logistics 3". Omit for chips with no tally. */
  count?: number;
}

interface FilterChipRowProps<T extends string = string> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

function FilterChip({
  option,
  selected,
  onPress,
}: {
  option: FilterOption;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useThemeMode();
  const press = usePressScale();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={option.count === undefined ? option.label : `${option.label}, ${option.count}`}
      style={[
        press.animatedStyle,
        {
          backgroundColor: selected ? colors.chipSelectedBg : colors.surface,
          borderColor: selected ? colors.chipSelectedBorder : colors.border,
        },
      ]}
      className="flex-row items-center rounded-full border px-3.5 py-2"
    >
      <Text style={[Type.body.sm, { color: selected ? colors.accent2 : colors.fgMuted }]}>{option.label}</Text>
      {option.count !== undefined ? (
        <Text style={[Type.mono.sm, { color: selected ? colors.accent2 : colors.fgSubtle, marginLeft: 6 }]}>
          {option.count}
        </Text>
      ) : null}
    </AnimatedPressable>
  );
}

/**
 * Horizontally scrolling single-select filter row — the deck's
 * "All 14 · Logistics 3 · Front Office 2" and "All · Critical · Mine · Watching".
 *
 * Counts are set in mono so the labels stay comparable at a glance; that split is
 * the whole reason this isn't a plain row of `Chip`s.
 */
export function FilterChipRow<T extends string = string>({
  options,
  value,
  onChange,
  className,
}: FilterChipRowProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      className={cn('grow-0', className)}
    >
      {options.map((option) => (
        <FilterChip
          key={option.value}
          option={option}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
      {/* Trailing breathing room so the last chip clears the screen edge. */}
      <View className="w-1" />
    </ScrollView>
  );
}
