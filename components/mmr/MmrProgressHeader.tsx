import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { CountUp } from '@/components/ui/CountUp';
import { useThemeMode } from '@/hooks/useThemeMode';
import type { MmrStats } from '@/api/services/mmr';

interface MmrProgressHeaderProps {
  stats?: MmrStats;
  /** Groups by status, used for the segmented bar. */
  statusCounts: Record<string, number>;
  totalGroups: number;
}

/**
 * What the campaign is actually for, at the top of the screen.
 *
 * The headline figure is readings collected against meters owed — not calls
 * placed or emails sent. A campaign can be busy on every channel and still have
 * collected nothing, and the invoice depends on the readings.
 */
export function MmrProgressHeader({ stats, statusCounts, totalGroups }: MmrProgressHeaderProps) {
  const { colors } = useThemeMode();

  const collected = stats?.totalReadingsCollected ?? 0;
  const owed = stats?.uniqueDeviceCount ?? stats?.totalDevices ?? 0;
  const pct =
    stats?.completionPercentage ?? (owed > 0 ? Math.round((collected / owed) * 100) : 0);

  // Ordered so the bar reads left-to-right as progress: done, working, waiting,
  // then the two kinds of not-happening.
  const segments: { key: string; label: string; color: string }[] = [
    { key: 'completed', label: 'Completed', color: colors.success },
    { key: 'in-progress', label: 'In progress', color: colors.accent },
    { key: 'pending', label: 'Pending', color: colors.border },
    { key: 'failed', label: 'Failed', color: colors.danger },
    { key: 'cant_collect', label: "Can't collect", color: colors.warning },
  ];

  const present = segments.filter(s => (statusCounts[s.key] ?? 0) > 0);

  return (
    <Card gloss className="mb-3">
      <Text variant="mono.label" tone="subtle">
        Readings collected
      </Text>

      <View className="mt-1.5 flex-row items-baseline">
        <CountUp value={collected} variant="display.lg" />
        <Text variant="body.md" tone="muted" className="ml-1.5">
          of {owed} meters
        </Text>
      </View>

      <Text variant="mono.value" tone={pct >= 100 ? 'success' : 'muted'} className="mt-0.5">
        {pct}% complete
      </Text>

      {/* Segmented bar. Rendered only once at least one group has a status, so
          an empty campaign shows nothing rather than a misleading full grey. */}
      {totalGroups > 0 ? (
        <>
          <View
            className="mt-3 h-1.5 flex-row rounded-full overflow-hidden"
            style={{ backgroundColor: colors.surface2 }}
            accessibilityRole="progressbar"
            accessibilityLabel={`${collected} of ${owed} meters read, ${pct} percent complete`}
          >
            {present.map(segment => (
              <View
                key={segment.key}
                style={{
                  flex: statusCounts[segment.key] ?? 0,
                  backgroundColor: segment.color,
                }}
              />
            ))}
          </View>

          <View className="mt-2.5 flex-row flex-wrap gap-x-3 gap-y-1">
            {present.map(segment => (
              <View key={segment.key} className="flex-row items-center">
                <View
                  className="h-1.5 w-1.5 rounded-full mr-1.5"
                  style={{ backgroundColor: segment.color }}
                />
                <Text variant="body.xs" tone="muted">
                  {statusCounts[segment.key]} {segment.label.toLowerCase()}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Card>
  );
}
