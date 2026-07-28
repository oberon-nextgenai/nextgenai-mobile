import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Tag } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { useActiveOrg } from '@/store/org';
import { useCampaign } from '@/api/hooks/campaignHooks';
import { fmtDateTime } from '@/lib/formatters';
import { useThemeMode } from '@/hooks/useThemeMode';

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const q = useCampaign(activeOrgId, id);

  if (!activeOrgId) {
    return (
      <Screen>
        <AppHeader title="Campaign" showBack showOrgPill={false} />
        <EmptyState title="Choose an organization" />
      </Screen>
    );
  }

  return (
    <Screen edges={{ top: true, bottom: false }}>
      <AppHeader title="Campaign" showBack showOrgPill={false} />
      {q.isPending ? (
        <View className="py-12 items-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : q.isError ? (
        <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />
      ) : !q.data ? (
        <EmptyState title="Campaign not found" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <Text variant="display.lg" className="mb-1" numberOfLines={2}>
            {q.data.name}
          </Text>
          <View className="flex-row items-center gap-2 mb-4">
            <Tag label={q.data.status} />
            {q.data.contacts ? (
              <Text variant="mono.value" tone="muted">
                {q.data.contacts.length} contacts
              </Text>
            ) : null}
          </View>

          {q.data.description ? (
            <SectionCard label="Description">
              <Text variant="body.sm">{q.data.description}</Text>
            </SectionCard>
          ) : null}

          <SectionCard label="Details">
            <View className="gap-2.5">
              <DetailRow label="Created" value={fmtDateTime(q.data.createdAt)} />
              <DetailRow label="Updated" value={fmtDateTime(q.data.updatedAt)} />
              {q.data.assistantId ? (
                <DetailRow label="Assistant" value={q.data.assistantId} />
              ) : null}
              {q.data.vapiCampaignId ? (
                <DetailRow label="VAPI ID" value={q.data.vapiCampaignId} />
              ) : null}
            </View>
          </SectionCard>

          <Text variant="body.xs" tone="subtle" className="text-center mt-2">
            Edit campaigns on the web platform.
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}

/** Mono label left, mono value right — the audit-record row. */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start">
      <Text variant="mono.label" tone="muted" className="w-24">
        {label}
      </Text>
      <Text variant="mono.value" className="flex-1" numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}
