import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useToolResults } from '@/store/toolResults';
import { useAuthStore } from '@/store/auth';
import { useActiveOrg } from '@/store/org';
import { useAuditLogList } from '@/api/hooks/auditHooks';
import { findAuditFallback, AUDIT_FALLBACK_WINDOW_MS } from '@/lib/prime/auditFallback';
import { fmtDateTime } from '@/lib/formatters';
import { useThemeMode } from '@/hooks/useThemeMode';
import { isEnvelopeFailure } from '@/lib/mcpEnvelope';

export default function ToolResultScreen() {
  const { id, tool, at } = useLocalSearchParams<{ id: string; tool?: string; at?: string }>();
  const record = useToolResults((s) => (id ? s.byId[id] : undefined));
  const { colors } = useThemeMode();
  const user = useAuthStore((s) => s.user);
  const { activeOrgId } = useActiveOrg();

  // The audit trail (`GET /api/audit-log`) is gated at `org_admin`+ on the
  // backend, and only carries a row at all for the subset of Prime tools that
  // mutate something (`McpService.stampAudit`) — read-only tool calls are never
  // audited. Without `tool`/`at` (older notifications minted before this
  // fallback existed) there is nothing to match against either. Any of those
  // makes the fallback query pointless, so it's simply not issued.
  const atMs = at ? Number(at) : NaN;
  const canAttemptAudit =
    !record &&
    Boolean(tool) &&
    Boolean(activeOrgId) &&
    Number.isFinite(atMs) &&
    (user?.role === 'org_admin' || user?.role === 'superadmin');

  const userId = user?._id ?? user?.id ?? user?.userId;
  const auditQuery = useAuditLogList(canAttemptAudit ? activeOrgId : null, {
    userId,
    from: canAttemptAudit ? new Date(atMs - AUDIT_FALLBACK_WINDOW_MS).toISOString() : undefined,
    to: canAttemptAudit ? new Date(atMs + AUDIT_FALLBACK_WINDOW_MS).toISOString() : undefined,
  });

  if (!record) {
    const auditMatch =
      canAttemptAudit && tool && auditQuery.isSuccess
        ? findAuditFallback(auditQuery.entries, tool, atMs)
        : null;

    return (
      <Screen>
        <AppHeader title="Tool result" showBack showOrgPill={false} showNotifications={false} />
        {/* flex-1 wrapper is reserved up front so swapping between the spinner,
            the audit-record card and the empty state never reflows the header
            above it or causes a visible jump. */}
        <View className="flex-1">
          {canAttemptAudit && auditQuery.isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="small" color={colors.fgMuted} />
              <Text variant="body.sm" tone="muted" className="mt-3">
                Checking the audit trail…
              </Text>
            </View>
          ) : auditMatch ? (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Card padding="md">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="time-outline" size={16} color={colors.warning} />
                  <Text variant="mono.label" tone="warning" className="ml-1.5">
                    Audit record
                  </Text>
                  <Text variant="mono.sm" tone="subtle" className="ml-auto">
                    {fmtDateTime(auditMatch.createdAt)}
                  </Text>
                </View>
                <Text variant="body.md" className="mb-1">
                  Prime ran {tool}
                </Text>
                <Text variant="body.sm" tone="muted" className="mb-3">
                  This local result aged out, so what follows comes from the audit trail
                  instead — it is a record that this call happened, not the tool&apos;s
                  output. Run the tool again to see fresh data.
                </Text>
                {auditMatch.details?.payload != null ? (
                  <View>
                    <Text variant="mono.label" tone="muted" className="mb-1.5">
                      Submitted parameters
                    </Text>
                    <Card padding="sm" variant="raised">
                      <Text variant="mono.code">
                        {JSON.stringify(auditMatch.details.payload, null, 2)}
                      </Text>
                    </Card>
                  </View>
                ) : null}
              </Card>
            </ScrollView>
          ) : (
            <EmptyState
              icon={<Ionicons name="time-outline" size={28} color={colors.fgMuted} />}
              title="Older results aren't retained"
              description={
                canAttemptAudit
                  ? "Prime keeps only your most recent tool results on this device, and no matching record turned up in the audit trail either. Run the tool again to see current data."
                  : "Prime keeps only your most recent tool results on this device. Once one ages out — or after a fresh install — the original output can't be recovered. Run the tool again to see current data."
              }
            />
          )}
        </View>
      </Screen>
    );
  }

  // The API increasingly reports tool failures as payloads — `{ success:
  // false, errorCode, message, retryable }` — with no transport-level
  // `error` at all, so a refusal or a miss must be read out of the result
  // too, not just off `record.error`.
  const isError = Boolean(record.error) || isEnvelopeFailure(record.result);

  return (
    <Screen>
      <AppHeader title={record.toolName} showBack showOrgPill={false} showNotifications={false} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="flex-row items-center mb-3">
          <View
            className={`w-2 h-2 rounded-full mr-2 ${isError ? 'bg-danger' : 'bg-success'}`}
          />
          <Text variant="mono.label" tone={isError ? 'danger' : 'success'}>
            {isError ? 'Failed' : 'Success'}
          </Text>
          <Text variant="mono.sm" tone="subtle" className="ml-auto">
            {fmtDateTime(record.createdAt)}
          </Text>
        </View>

        {record.arguments != null ? (
          <View className="mb-3">
            <Text variant="mono.label" tone="muted" className="mb-1.5">
              Arguments
            </Text>
            <Card padding="sm">
              <Text variant="mono.code">{JSON.stringify(record.arguments, null, 2)}</Text>
            </Card>
          </View>
        ) : null}

        {record.error != null ? (
          <View className="mb-3">
            <Text variant="mono.label" tone="danger" className="mb-1.5">
              Error
            </Text>
            <View className="bg-danger-soft border border-danger/40 rounded-xl p-3">
              <Text variant="mono.code" tone="danger">
                {typeof record.error === 'string'
                  ? record.error
                  : JSON.stringify(record.error, null, 2)}
              </Text>
            </View>
          </View>
        ) : null}

        {record.result != null ? (
          <View className="mb-3">
            <Text variant="mono.label" tone="muted" className="mb-1.5">
              Result
            </Text>
            <Card padding="sm">
              <Text variant="mono.code">
                {typeof record.result === 'string'
                  ? record.result
                  : JSON.stringify(record.result, null, 2)}
              </Text>
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
