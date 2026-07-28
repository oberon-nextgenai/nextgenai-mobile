import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useThemeMode } from '@/hooks/useThemeMode';
import { usePressScale } from '@/hooks/usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Minutes from local midnight → `22:00`. Exported so callers render it the same way. */
export function formatMinuteOfDay(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Half-hour granularity. Quiet hours are a blunt instrument — nobody needs their
 * notifications to resume at 07:07 — and 48 options fit a scrollable column
 * without a dependency.
 */
const STEP_MINUTES = 30;
const OPTIONS = Array.from({ length: (24 * 60) / STEP_MINUTES }, (_, i) => i * STEP_MINUTES);

interface TimeWindowPickerProps {
  visible: boolean;
  /** Minutes from midnight. */
  initialStart: number;
  initialEnd: number;
  onCancel: () => void;
  onConfirm: (start: number, end: number) => void;
}

function TimeColumn({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (minute: number) => void;
}) {
  const { colors } = useThemeMode();

  return (
    <View className="flex-1">
      <Text variant="mono.label" tone="subtle" className="mb-2">
        {label}
      </Text>
      <View
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: colors.surface2, height: 200 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {OPTIONS.map(minute => {
            const selected = minute === value;
            return (
              <Pressable
                key={minute}
                onPress={() => onChange(minute)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className="px-3 py-2.5"
                style={selected ? { backgroundColor: colors.chipSelectedBg } : undefined}
              >
                <Text variant="mono.value" tone={selected ? 'accent' : 'muted'}>
                  {formatMinuteOfDay(minute)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

/**
 * Picks a repeating local time window — used for quiet hours.
 *
 * Built from scratch rather than pulling in `@react-native-community/datetimepicker`:
 * that component picks an *instant*, and quiet hours are a recurring
 * minute-of-day pair. Handing the user a date they must ignore invites the wrong
 * mental model, and it would be a native dependency for one screen.
 */
export function TimeWindowPicker({
  visible,
  initialStart,
  initialEnd,
  onCancel,
  onConfirm,
}: TimeWindowPickerProps) {
  const { colors } = useThemeMode();
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const cancelPress = usePressScale();

  // A window that starts and ends at the same minute silences nothing — the
  // backend treats it as unset, so saying so here beats saving a no-op.
  const isEmpty = start === end;

  const summary = useMemo(() => {
    if (isEmpty) return 'Start and end are the same, so nothing would be silenced.';
    const wraps = start > end;
    return wraps
      ? `Silenced from ${formatMinuteOfDay(start)} overnight until ${formatMinuteOfDay(end)}.`
      : `Silenced from ${formatMinuteOfDay(start)} until ${formatMinuteOfDay(end)} the same day.`;
  }, [start, end, isEmpty]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <AnimatedPressable
        onPress={onCancel}
        onPressIn={cancelPress.onPressIn}
        onPressOut={cancelPress.onPressOut}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        className="flex-1"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      />
      <View style={{ backgroundColor: colors.bg }} className="px-4 pb-8 pt-4">
        <Card padding="md">
          <Text variant="display.sm">Quiet hours</Text>

          <View className="mt-4 flex-row gap-3">
            <TimeColumn label="From" value={start} onChange={setStart} />
            <TimeColumn label="Until" value={end} onChange={setEnd} />
          </View>

          <Text variant="body.sm" tone={isEmpty ? 'warning' : 'muted'} className="mt-4">
            {summary}
          </Text>
          <Text variant="body.xs" tone="subtle" className="mt-1">
            Critical escalations are always delivered.
          </Text>

          <View className="mt-5 flex-row gap-2.5">
            <View className="flex-1">
              <Button variant="secondary" fullWidth onPress={onCancel}>
                Cancel
              </Button>
            </View>
            <View className="flex-1">
              <Button fullWidth disabled={isEmpty} onPress={() => onConfirm(start, end)}>
                Save
              </Button>
            </View>
          </View>
        </Card>
      </View>
    </Modal>
  );
}
