import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Text } from '@/components/ui/Text';
import { MmrPluginGate } from '@/components/mmr/MmrPluginGate';
import { useActiveOrg } from '@/store/org';
import { useMmrCallStatus, useMmrEmailStatus } from '@/api/hooks/mmrHooks';
import { useThemeMode } from '@/hooks/useThemeMode';

/**
 * Channel health for one MMR campaign.
 *
 * Split from the campaign screen on purpose: this answers "is the machinery
 * working?", which is a different question from "are the readings in?" and is
 * only asked when the answer to the latter is disappointing.
 */
export default function MmrChannelStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeOrgId } = useActiveOrg();

  return (
    <Screen edges={{ top: true, bottom: false }}>
      <AppHeader title="Call and email status" showBack showOrgPill={false} />
      {!activeOrgId ? (
        <EmptyState title="Choose an organization" />
      ) : (
        <MmrPluginGate orgId={activeOrgId} feature="Channel status">
          <StatusBody orgId={activeOrgId} campaignId={id} />
        </MmrPluginGate>
      )}
    </Screen>
  );
}

function StatusBody({ orgId, campaignId }: { orgId: string; campaignId: string }) {
  const { colors } = useThemeMode();
  const calls = useMmrCallStatus(orgId, campaignId);
  const emails = useMmrEmailStatus(orgId, campaignId);

  if (calls.isPending || emails.isPending) {
    return (
      <View className="py-12 items-center">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Each channel fails independently, so one erroring must not blank the other.
  const bothFailed = calls.isError && emails.isError;
  if (bothFailed) {
    return (
      <ErrorState
        message={(calls.error as Error).message}
        onRetry={() => {
          void calls.refetch();
          void emails.refetch();
        }}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <SectionCard label="Email">
        {emails.isError ? (
          <Text variant="body.sm" tone="danger">
            Email status is unavailable right now.
          </Text>
        ) : (
          <View className="gap-2.5">
            <StatRow label="Sent" value={emails.data?.sent} />
            <StatRow label="Failed" value={emails.data?.failed} tone="danger" />
            <StatRow label="Pending" value={emails.data?.pending} />
            <StatRow label="Total" value={emails.data?.total} />
          </View>
        )}
      </SectionCard>

      <SectionCard label="Calls">
        {calls.isError ? (
          <Text variant="body.sm" tone="danger">
            Call status is unavailable right now.
          </Text>
        ) : (
          <View className="gap-2.5">
            <StatRow label="Total" value={calls.data?.totalCalls} />
            <StatRow label="Queued" value={calls.data?.queuedCalls} />
            <StatRow label="In progress" value={calls.data?.inProgressCalls} />
            <StatRow label="Completed" value={calls.data?.completedCalls} />
            <StatRow label="Failed" value={calls.data?.failedCalls} tone="danger" />
          </View>
        )}
      </SectionCard>

      <Text variant="body.xs" tone="subtle" className="text-center mt-2">
        Counts cover this campaign only.
      </Text>
    </ScrollView>
  );
}

/**
 * A single figure. Renders an em dash for a missing value rather than 0 — the
 * two mean different things, and showing "0 failed" for "we don't know" is the
 * kind of reassurance that costs a billing cycle.
 */
function StatRow({
  label,
  value,
  tone,
}: {
  label: string;
  value?: number;
  tone?: 'danger';
}) {
  const known = typeof value === 'number';
  return (
    <View className="flex-row items-center justify-between">
      <Text variant="mono.label" tone="muted">
        {label}
      </Text>
      <Text variant="mono.value" tone={known && tone && value > 0 ? tone : 'default'}>
        {known ? value : '—'}
      </Text>
    </View>
  );
}
