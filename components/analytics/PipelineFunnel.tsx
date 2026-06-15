import { Text, View } from 'react-native';
import type { NdsPipelineFunnel } from '@/api/services/types';
import { useThemeMode } from '@/hooks/useThemeMode';

interface PipelineFunnelProps {
  data: NdsPipelineFunnel | undefined;
}

interface Step {
  label: string;
  value: number;
  color: string;
}

// Per-row colors mirrored from the web NDS dashboard.
const CYAN = '#06B6D4';
const VIOLET = '#8B5CF6';
const VIOLET_LIGHT = '#A78BFA';
const EMERALD = '#10B981';
const RED = '#EF4444';
const SKY = '#38BDF8';

/**
 * Compact waterfall funnel — proportional bars relative to the largest step,
 * each row showing label + count. Six rows mirror the web NDS funnel order:
 * Ordered → Invited → Completed → Approved → Denied → Cancelled. Each row
 * uses its own color (also matched to the web).
 */
export function PipelineFunnel({ data }: PipelineFunnelProps) {
  const { colors } = useThemeMode();
  if (!data) return null;
  const steps: Step[] = [
    { label: 'Ordered', value: data.totalOrdered ?? 0, color: CYAN },
    { label: 'Invited', value: data.invited ?? 0, color: VIOLET },
    { label: 'Completed', value: data.completed ?? 0, color: VIOLET_LIGHT },
    { label: 'Approved', value: data.approved ?? 0, color: EMERALD },
    { label: 'Denied', value: data.denied ?? 0, color: RED },
    { label: 'Cancelled', value: data.canceled ?? 0, color: SKY },
  ];
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <View className="gap-2">
      {steps.map((s) => {
        const pct = s.value === 0 ? 0 : Math.max(0.04, s.value / max);
        return (
          <View key={s.label}>
            <View className="flex-row items-center justify-between mb-1">
              <Text
                className="text-fg-muted dark:text-fg-dark-muted text-[11px] uppercase tracking-widest"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                {s.label}
              </Text>
              <Text
                className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                style={{ fontFamily: 'Inter_600SemiBold' }}
              >
                {s.value.toLocaleString()}
              </Text>
            </View>
            <View
              className="h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: colors.surface2 }}
            >
              <View
                style={{
                  width: `${pct * 100}%`,
                  height: '100%',
                  backgroundColor: s.color,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
