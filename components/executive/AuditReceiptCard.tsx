import { Fragment } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Elevation } from '@/constants/Colors';
import { useThemeMode } from '@/hooks/useThemeMode';

interface AuditReceiptCardProps {
  action: string;
  reference?: string;
  approvedBy: string;
  authMethod?: string;
  tenant?: string;
  timestamp: string;
  policy?: string;
  auditId?: string;
  followUps?: string[];
}

interface Row {
  label: string;
  value: string;
}

export function AuditReceiptCard({
  action,
  reference,
  approvedBy,
  authMethod,
  tenant,
  timestamp,
  policy,
  auditId,
  followUps,
}: AuditReceiptCardProps) {
  const { colors } = useThemeMode();

  const rows: Row[] = [
    { label: 'Approved by', value: approvedBy },
    ...(authMethod ? [{ label: 'Auth method', value: authMethod }] : []),
    ...(tenant ? [{ label: 'Tenant', value: tenant }] : []),
    { label: 'Time', value: timestamp },
    ...(policy ? [{ label: 'Policy', value: policy }] : []),
    ...(auditId ? [{ label: 'Audit ID', value: auditId }] : []),
  ];

  return (
    <View
      style={Elevation.sm}
      className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-4xl overflow-hidden"
      accessibilityRole="summary"
      accessibilityLabel={`Audit receipt: ${action}${reference ? `, ${reference}` : ''}`}
    >
      {/* Thin mint confirmation accent at the top */}
      <View style={{ height: 3, backgroundColor: colors.success }} />

      <View className="p-5">
        {/* Centered success header */}
        <View className="items-center">
          <Ionicons name="shield-checkmark" size={34} color={colors.success} />
          <Text
            className="text-fg dark:text-fg-dark-DEFAULT text-[16px] text-center mt-2"
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            {action}
          </Text>
          {reference ? (
            <Text
              className="text-fg-muted dark:text-fg-dark-muted text-[13px] text-center mt-0.5"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {reference}
            </Text>
          ) : null}
        </View>

        {/* Key / value list */}
        <View className="mt-5">
          {rows.map((row, i) => (
            <Fragment key={row.label}>
              {i > 0 ? (
                <View className="h-px bg-border-subtle dark:bg-border-dark-subtle" />
              ) : null}
              <View className="flex-row items-center justify-between py-2.5">
                <Text
                  className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest pr-3"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  {row.label}
                </Text>
                <Text
                  className="text-fg dark:text-fg-dark-DEFAULT text-[13px] flex-1 text-right"
                  style={{ fontFamily: 'Inter_500Medium' }}
                  numberOfLines={2}
                >
                  {row.value}
                </Text>
              </View>
            </Fragment>
          ))}
        </View>

        {/* Follow-ups */}
        {followUps?.length ? (
          <View className="mt-4 pt-4 border-t border-border-subtle dark:border-border-dark-subtle">
            <Text
              className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest mb-2"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
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
                <Text
                  className="text-fg dark:text-fg-dark-DEFAULT text-[13px] ml-2 flex-1"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export type { AuditReceiptCardProps };
