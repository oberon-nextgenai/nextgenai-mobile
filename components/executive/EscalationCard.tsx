import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Elevation } from '@/constants/Colors';
import { useThemeMode } from '@/hooks/useThemeMode';
import { Button } from '@/components/ui/Button';

type Severity = 'critical' | 'high' | 'watching';

interface EscalationCardProps {
  severity: Severity;
  title: string;
  agentName: string;
  reason?: string;
  amountAtRisk?: number;
  slaMinutesRemaining?: number;
  onReview?: () => void;
}

function formatMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

const SEVERITY_META: Record<
  Severity,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  critical: { label: 'Critical', icon: 'alert-circle' },
  high: { label: 'High', icon: 'warning' },
  watching: { label: 'Watching', icon: 'eye' },
};

export function EscalationCard({
  severity,
  title,
  agentName,
  reason,
  amountAtRisk,
  slaMinutesRemaining,
  onReview,
}: EscalationCardProps) {
  const { colors } = useThemeMode();
  const meta = SEVERITY_META[severity];

  const edgeColor =
    severity === 'critical'
      ? colors.danger
      : severity === 'high'
        ? colors.warning
        : colors.accent2;
  const severityColor = edgeColor;

  // SLA urgency colors
  const slaColor =
    slaMinutesRemaining === undefined
      ? colors.fgMuted
      : slaMinutesRemaining < 10
        ? colors.danger
        : slaMinutesRemaining < 30
          ? colors.warning
          : colors.fgMuted;

  // Money emphasis: critical risk reads danger, otherwise amber warning.
  const moneyColor = severity === 'critical' ? colors.danger : colors.warning;

  return (
    <View
      style={Elevation.sm}
      className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-3xl overflow-hidden flex-row"
      accessibilityRole="summary"
      accessibilityLabel={`${meta.label} escalation: ${title}`}
    >
      {/* Colored left edge bar (critical/high/watching) */}
      <View style={{ width: 4, backgroundColor: edgeColor }} />

      <View className="flex-1 p-4">
        {/* Top row: severity chip + optional SLA pill */}
        <View className="flex-row items-center justify-between mb-2">
          <View
            className="flex-row items-center rounded-full px-2.5 py-1"
            style={{ backgroundColor: `${edgeColor}1F` }}
          >
            <Ionicons name={meta.icon} size={13} color={severityColor} />
            <Text
              className="text-[11px] uppercase tracking-wider ml-1"
              style={{ fontFamily: 'Inter_600SemiBold', color: severityColor }}
            >
              {meta.label}
            </Text>
          </View>

          {slaMinutesRemaining !== undefined ? (
            <View
              className="flex-row items-center rounded-full px-2.5 py-1"
              style={{ backgroundColor: `${slaColor}1F` }}
            >
              <Ionicons name="time" size={13} color={slaColor} />
              <Text
                className="text-[11px] ml-1"
                style={{ fontFamily: 'Inter_600SemiBold', color: slaColor }}
              >
                {slaMinutesRemaining}m left
              </Text>
            </View>
          ) : null}
        </View>

        {/* Title */}
        <Text
          className="text-fg dark:text-fg-dark-DEFAULT text-[15px]"
          style={{ fontFamily: 'Inter_600SemiBold' }}
        >
          {title}
        </Text>

        {/* Metadata row: agent + amount at risk */}
        <View className="flex-row items-center flex-wrap mt-2">
          <View className="flex-row items-center mr-3">
            <Ionicons name="person-circle" size={15} color={colors.fgMuted} />
            <Text
              className="text-fg-muted dark:text-fg-dark-muted text-[13px] ml-1"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {agentName}
            </Text>
          </View>

          {amountAtRisk !== undefined ? (
            <View className="flex-row items-center">
              <Ionicons
                name={severity === 'critical' ? 'alert' : 'cash'}
                size={15}
                color={moneyColor}
              />
              <Text
                className="text-[13px] ml-1"
                style={{ fontFamily: 'Inter_600SemiBold', color: moneyColor }}
              >
                {formatMoney(amountAtRisk)} at risk
              </Text>
            </View>
          ) : null}
        </View>

        {/* Optional reason */}
        {reason ? (
          <Text
            className="text-fg-muted dark:text-fg-dark-muted text-[13px] mt-2"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            {reason}
          </Text>
        ) : null}

        {/* Review action */}
        <View className="flex-row mt-3">
          <Button
            variant="secondary"
            size="sm"
            onPress={onReview}
            rightIcon={
              <Ionicons name="arrow-forward" size={16} color={colors.fg} />
            }
            accessibilityLabel={`Review ${title}`}
          >
            Review
          </Button>
        </View>
      </View>
    </View>
  );
}

export type { EscalationCardProps };
