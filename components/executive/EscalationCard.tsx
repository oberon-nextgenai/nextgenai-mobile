import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Text, type TextTone } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useThemeMode } from '@/hooks/useThemeMode';

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
  { label: string; icon: keyof typeof Ionicons.glyphMap; tone: TextTone }
> = {
  critical: { label: 'Critical', icon: 'alert-circle', tone: 'danger' },
  high: { label: 'High', icon: 'warning', tone: 'warning' },
  watching: { label: 'Watching', icon: 'eye', tone: 'accent' },
};

/**
 * A row in the escalation queue.
 *
 * Same anatomy as `PriorityCard`: a left severity rail instead of a coloured
 * fill, so a queue of these stacks without becoming a wall of colour. The top
 * line is provenance — severity on the left, the SLA countdown on the right —
 * the title is the sentence the reader acts on, and the metadata under it is
 * mono because agent, amount and clock are facts about the record.
 */
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

  const rail =
    severity === 'critical'
      ? colors.danger
      : severity === 'high'
        ? colors.warning
        : colors.accent2;

  // SLA urgency ramp — the countdown escalates on its own clock, independent
  // of the row's severity.
  const slaTone: TextTone =
    slaMinutesRemaining === undefined
      ? 'muted'
      : slaMinutesRemaining < 10
        ? 'danger'
        : slaMinutesRemaining < 30
          ? 'warning'
          : 'muted';
  const slaColor =
    slaTone === 'danger'
      ? colors.danger
      : slaTone === 'warning'
        ? colors.warning
        : colors.fgMuted;

  // Money emphasis: critical risk reads danger, otherwise amber warning.
  const moneyTone: TextTone = severity === 'critical' ? 'danger' : 'warning';
  const moneyColor = severity === 'critical' ? colors.danger : colors.warning;

  return (
    <Card
      rail={rail}
      accessibilityRole="summary"
      accessibilityLabel={`${meta.label} escalation: ${title}`}
    >
      {/* Severity + SLA countdown — the record line. */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name={meta.icon} size={13} color={rail} />
          <Text variant="mono.label" tone={meta.tone}>
            {meta.label}
          </Text>
        </View>

        {slaMinutesRemaining !== undefined ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="time" size={12} color={slaColor} />
            <Text variant="mono.label" tone={slaTone}>
              {`${slaMinutesRemaining}m left`}
            </Text>
          </View>
        ) : null}
      </View>

      <Text variant="body.lg" className="mt-2.5">
        {title}
      </Text>

      {/* Metadata: which agent, how much is exposed. */}
      <View className="flex-row items-center flex-wrap mt-2 gap-x-3 gap-y-1">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="person-circle" size={13} color={colors.fgSubtle} />
          <Text variant="mono.label" tone="muted">
            {agentName}
          </Text>
        </View>

        {amountAtRisk !== undefined ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons
              name={severity === 'critical' ? 'alert' : 'cash'}
              size={13}
              color={moneyColor}
            />
            <Text variant="mono.label" tone={moneyTone}>
              {`${formatMoney(amountAtRisk)} at risk`}
            </Text>
          </View>
        ) : null}
      </View>

      {reason ? (
        <Text variant="body.sm" tone="muted" className="mt-2">
          {reason}
        </Text>
      ) : null}

      <View className="flex-row mt-3">
        <Button
          variant="secondary"
          size="sm"
          onPress={onReview}
          rightIcon={<Ionicons name="arrow-forward" size={16} color={colors.fg} />}
          accessibilityLabel={`Review ${title}`}
        >
          Review
        </Button>
      </View>
    </Card>
  );
}

export type { EscalationCardProps };
