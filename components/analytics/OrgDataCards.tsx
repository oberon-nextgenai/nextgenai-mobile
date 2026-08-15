import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useThemeMode } from '@/hooks/useThemeMode';
import { fmtCurrency, fmtNumber } from '@/lib/formatters';
import type { LeasingSection, MeterFleetSection } from '@/api/services/orgData';

/** 12,085,858 → "12.1M". */
function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  return fmtNumber(n);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text variant="body.sm" tone="muted">
        {label}
      </Text>
      <Text variant="body.semibold">{value}</Text>
    </View>
  );
}

/** Live meter-fleet aggregates from the organization's own database. */
export function MeterFleetCard({ fleet }: { fleet: MeterFleetSection }) {
  const { colors } = useThemeMode();
  const maxSource = Math.max(...fleet.readingsBySource.map(s => s.count), 1);

  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <Text variant="mono.label" tone="subtle">
          Meter fleet
        </Text>
        <Text variant="mono.label" tone="muted">
          live · org database
        </Text>
      </View>
      <View className="mt-3 gap-2">
        <Row
          label="Active customers"
          value={`${fleet.summary.customersActive} of ${fleet.summary.customersTotal}`}
        />
        <Row
          label="Active devices"
          value={`${fleet.summary.devicesActive} of ${fleet.summary.devicesTotal}`}
        />
        <Row label="Lifetime pages collected" value={fmtCompact(fleet.summary.fleetLifetimePages)} />
        <Row label="Meter readings on file" value={fmtNumber(fleet.summary.readings)} />
      </View>
      {fleet.readingsBySource.length > 0 ? (
        <View className="mt-3">
          <Text variant="mono.label" tone="subtle">
            Readings by source
          </Text>
          <View className="mt-2 gap-1.5">
            {fleet.readingsBySource.slice(0, 5).map(s => (
              <View key={s.source} className="flex-row items-center gap-2">
                <Text variant="mono.sm" tone="muted" className="w-16" numberOfLines={1}>
                  {s.source}
                </Text>
                <View
                  className="flex-1 h-1 rounded-full overflow-hidden"
                  style={{ backgroundColor: colors.surface2 }}
                >
                  <View
                    className="h-1 rounded-full"
                    style={{
                      backgroundColor: colors.accent2,
                      width: `${Math.max(4, Math.round((s.count / maxSource) * 100))}%`,
                    }}
                  />
                </View>
                <Text variant="mono.sm" tone="muted">
                  {fmtNumber(s.count)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

/** Live leasing pipeline from the organization's own database. */
export function LeasingCard({ leasing }: { leasing: LeasingSection }) {
  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <Text variant="mono.label" tone="subtle">
          Leasing pipeline
        </Text>
        <Text variant="mono.label" tone="muted">
          live · org database
        </Text>
      </View>
      <View className="mt-3 gap-2">
        <Row label="Monthly lease total" value={`${fmtCurrency(leasing.pipeline.monthlyTotal)}/mo`} />
        <Row label="Lease opportunities" value={fmtNumber(leasing.pipeline.opportunities)} />
        <Row label="Renewals in window" value={fmtNumber(leasing.renewalsDue.length)} />
        <Row label="Order revenue" value={fmtCurrency(leasing.orders.revenue)} />
      </View>
      {leasing.renewalsDue.length > 0 ? (
        <View className="mt-3">
          <Text variant="mono.label" tone="subtle">
            Renewal radar · soonest first
          </Text>
          <View className="mt-2 gap-2">
            {leasing.renewalsDue.slice(0, 3).map(r => (
              <View key={r.accountName} className="flex-row items-center justify-between">
                <Text variant="body.sm" numberOfLines={1} className="flex-1 pr-2">
                  {r.accountName}
                </Text>
                <Text variant="mono.sm" tone="warning">
                  {`${r.paymentsRemaining} payments left`}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Card>
  );
}
