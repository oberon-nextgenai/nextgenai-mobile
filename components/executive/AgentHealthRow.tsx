import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text, type TextTone } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Sparkline } from '@/components/ui/Sparkline';
import { useThemeMode } from '@/hooks/useThemeMode';
import { usePressScale } from '@/hooks/usePressScale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type AgentStatus = 'healthy' | 'attention' | 'paused' | 'critical';

interface StatusMeta {
  label: string;
  /** SLA column copy — what this status means for delivery, not for the agent. */
  slaLabel: string;
  tone: TextTone;
  color: (c: ReturnType<typeof useThemeMode>['colors']) => string;
  icon: keyof typeof Ionicons.glyphMap;
}

/**
 * Single source of truth for how an agent status renders. Screens reuse this so
 * status is always colour + text, never colour alone.
 */
export function statusMeta(status: AgentStatus): StatusMeta {
  switch (status) {
    case 'healthy':
      return {
        label: 'Healthy',
        slaLabel: 'On track',
        tone: 'success',
        color: c => c.successBright,
        icon: 'checkmark-circle',
      };
    case 'attention':
      return {
        label: 'Needs attention',
        slaLabel: 'At risk',
        tone: 'warning',
        color: c => c.warning,
        icon: 'alert-circle',
      };
    case 'paused':
      return {
        label: 'Paused',
        slaLabel: 'Paused',
        tone: 'subtle',
        color: c => c.fgSubtle,
        icon: 'pause-circle',
      };
    case 'critical':
      return {
        label: 'Critical',
        slaLabel: 'Breaching',
        tone: 'danger',
        color: c => c.danger,
        icon: 'warning',
      };
  }
}

interface AgentHealthRowProps {
  name: string;
  /** Role and department — rendered as the mono provenance line. */
  role?: string;
  department?: string;
  status: AgentStatus;
  performancePct?: number;
  costPerRun?: number;
  trend?: number[];
  onPress?: () => void;
}

/** One labelled metric column. */
function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text variant="mono.label" tone="subtle">
        {label}
      </Text>
      <View className="mt-1">{children}</View>
    </View>
  );
}

/**
 * A roster row, built to read as a colleague first and a metric second: the name
 * leads, the role and department follow in mono, and performance, cost and SLA
 * sit underneath as supporting evidence.
 *
 * That ordering is the deck's whole argument about an AI workforce — these are
 * staff, not jobs — so it is worth preserving even though a metrics-first row
 * would be denser.
 */
export function AgentHealthRow({
  name,
  role,
  department,
  status,
  performancePct,
  costPerRun,
  trend,
  onPress,
}: AgentHealthRowProps) {
  const { colors } = useThemeMode();
  const press = usePressScale({ to: 0.985 });
  const meta = statusMeta(status);
  const accent = meta.color(colors);

  const provenance = [role, department].filter(Boolean).join(' · ');

  const a11yLabel = [
    name,
    provenance,
    meta.label,
    performancePct != null ? `${Math.round(performancePct)} percent performance` : null,
    costPerRun != null ? `${costPerRun.toFixed(2)} dollars per run` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={press.animatedStyle}
    >
      {/* No gloss: this renders once per agent in a scrolling list. */}
      <Card padding="none">
        <View className="px-4 pt-3.5">
          <View className="flex-row items-center">
            {/* Icon tile with the status dot tucked into its corner. */}
            <View
              className="h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: colors.surface2 }}
            >
              <Ionicons name={meta.icon} size={18} color={accent} />
              <View
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: accent, borderWidth: 2, borderColor: colors.surface }}
              />
            </View>

            <View className="ml-3 flex-1 min-w-0">
              <Text variant="body.semibold" numberOfLines={1}>
                {name}
              </Text>
              {provenance ? (
                <Text variant="mono.label" tone="subtle" numberOfLines={1} className="mt-0.5">
                  {provenance}
                </Text>
              ) : null}
            </View>

            <Ionicons name="chevron-forward" size={16} color={colors.fgSubtle} />
          </View>

          <View className="mt-3 flex-row items-end justify-between">
            <View className="flex-row gap-6">
              <Metric label="Perf">
                <Text variant="body.semibold" tone={performancePct == null ? 'subtle' : meta.tone}>
                  {performancePct == null ? '—' : `${Math.round(performancePct)}%`}
                </Text>
              </Metric>
              <Metric label="Cost/run">
                <Text variant="body.semibold">
                  {costPerRun == null ? '—' : `$${costPerRun.toFixed(2)}`}
                </Text>
              </Metric>
              <Metric label="SLA">
                <Text variant="body.semibold" tone={meta.tone}>
                  {meta.slaLabel}
                </Text>
              </Metric>
            </View>
          </View>
        </View>

        {/* Runs to the card edges — instrumentation, not a chart in a box. */}
        {trend && trend.length > 1 ? (
          <Sparkline values={trend} color={accent} height={30} fill />
        ) : (
          <View style={{ height: 14 }} />
        )}
      </Card>
    </AnimatedPressable>
  );
}
