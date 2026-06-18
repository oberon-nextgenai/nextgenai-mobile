import { Text, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';

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
        <Text
          className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest mb-1.5"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
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
        <Text
          className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest mb-1.5"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
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
