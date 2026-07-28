import { Fragment } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useThemeMode } from '@/hooks/useThemeMode';

interface AuditReceiptCardProps {
  action: string;
  reference?: string;
  /**
   * What was decided. Drives the accent, the icon and the actor row's label —
   * a rejected decision must not read "Approved by".
   */
  decision?: 'approved' | 'rejected';
  /** Omitted from the record when absent, rather than rendered blank. */
  decidedBy?: string;
  authMethod?: string;
  tenant?: string;
  /** Omitted when absent. A placeholder in an audit row reads as a value. */
  timestamp?: string;
  policy?: string;
  auditId?: string;
  followUps?: string[];
}

interface Row {
  label: string;
  value: string;
}

/**
 * The immutable record of a decision.
 *
 * The verdict is serif and centred — it is the one thing being asserted. Below
 * it, every field is mono on both sides of a hairline: who decided, by what
 * method, under which policy, at what time. Mono is what makes this read as a
 * record rather than a caption, and it is what a screenshot of it has to prove.
 *
 * A field with no value is left out entirely. Rendering an em-dash or a blank
 * would put something in a record that looks like data and isn't.
 */
export function AuditReceiptCard({
  action,
  reference,
  decision = 'approved',
  decidedBy,
  authMethod,
  tenant,
  timestamp,
  policy,
  auditId,
  followUps,
}: AuditReceiptCardProps) {
  const { colors } = useThemeMode();

  const rejected = decision === 'rejected';
  const accent = rejected ? colors.danger : colors.success;

  const rows: Row[] = [
    ...(decidedBy ? [{ label: rejected ? 'Rejected by' : 'Approved by', value: decidedBy }] : []),
    ...(authMethod ? [{ label: 'Auth method', value: authMethod }] : []),
    ...(tenant ? [{ label: 'Tenant', value: tenant }] : []),
    ...(timestamp ? [{ label: 'Time', value: timestamp }] : []),
    ...(policy ? [{ label: 'Policy', value: policy }] : []),
    ...(auditId ? [{ label: 'Audit ID', value: auditId }] : []),
  ];

  return (
    <Card
      padding="none"
      accessibilityRole="summary"
      accessibilityLabel={`Audit receipt: ${action}${reference ? `, ${reference}` : ''}`}
    >
      {/* Confirmation accent — mint for approved, red for rejected. */}
      <View style={{ height: 3, backgroundColor: accent }} />

      <View className="p-5">
        <View className="items-center">
          <Ionicons
            name={rejected ? 'close-circle' : 'shield-checkmark'}
            size={34}
            color={accent}
          />
          <Text variant="display.sm" className="text-center mt-2">
            {action}
          </Text>
          {reference ? (
            <Text variant="mono.value" tone="muted" className="text-center mt-1">
              {reference}
            </Text>
          ) : null}
        </View>

        {rows.length > 0 ? (
          <View className="mt-5">
            {rows.map((row, i) => (
              <Fragment key={row.label}>
                {i > 0 ? (
                  <View className="h-px bg-border-subtle dark:bg-border-dark-subtle" />
                ) : null}
                <View className="flex-row items-start justify-between py-2.5">
                  <Text variant="mono.sm" tone="subtle" className="pr-3">
                    {row.label}
                  </Text>
                  <Text variant="mono.value" className="flex-1 text-right" numberOfLines={2}>
                    {row.value}
                  </Text>
                </View>
              </Fragment>
            ))}
          </View>
        ) : null}

        {followUps?.length ? (
          <View className="mt-4 pt-4 border-t border-border-subtle dark:border-border-dark-subtle">
            <Text variant="mono.label" tone="subtle" className="mb-2">
              Follow-ups
            </Text>
            {followUps.map((item, i) => (
              <View key={i} className="flex-row items-start py-1">
                <Ionicons
                  name="arrow-forward-circle"
                  size={16}
                  color={colors.fgSubtle}
                  style={{ marginTop: 1 }}
                />
                <Text variant="body.sm" className="ml-2 flex-1">
                  {item}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

export type { AuditReceiptCardProps };
