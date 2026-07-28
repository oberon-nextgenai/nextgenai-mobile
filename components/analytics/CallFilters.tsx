import { View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';

export type CallDateRange = 'all' | '7d' | '30d' | '90d';
export type CallStatusFilter = 'all' | 'successful' | 'unsuccessful' | 'failed';

interface CallFiltersProps {
  range: CallDateRange;
  onRange: (r: CallDateRange) => void;
  status: CallStatusFilter;
  onStatus: (s: CallStatusFilter) => void;
}

const RANGES: { value: CallDateRange; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7d' },
  { value: '30d', label: 'Last 30d' },
];

const STATUSES: { value: CallStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'successful', label: 'Successful' },
  { value: 'unsuccessful', label: 'Unsuccessful' },
  { value: 'failed', label: 'Failed' },
];

export function CallFilters({ range, onRange, status, onStatus }: CallFiltersProps) {
  return (
    <View className="gap-3">
      <View>
        <Text variant="mono.label" tone="muted" className="mb-1.5">
          Date range
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {RANGES.map((r) => (
            <Chip
              key={r.value}
              label={r.label}
              selected={range === r.value}
              onPress={() => onRange(r.value)}
            />
          ))}
        </View>
      </View>
      <View>
        <Text variant="mono.label" tone="muted" className="mb-1.5">
          Status
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Chip
              key={s.value}
              label={s.label}
              selected={status === s.value}
              onPress={() => onStatus(s.value)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
