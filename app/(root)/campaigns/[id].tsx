import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
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
          <Text
            className="text-fg dark:text-fg-dark-DEFAULT text-2xl mb-1"
            style={{ fontFamily: 'Inter_700Bold' }}
            numberOfLines={2}
          >
            {q.data.name}
          </Text>
          <View className="flex-row items-center gap-2 mb-4">
            <View className="px-2 py-0.5 rounded-full bg-surface-2 dark:bg-surface-2-dark">
              <Text
                className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-wider"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                {q.data.status}
              </Text>
            </View>
            {q.data.contacts ? (
              <Text
                className="text-fg-muted dark:text-fg-dark-muted text-xs"
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                {q.data.contacts.length} contacts
              </Text>
            ) : null}
          </View>

          {q.data.description ? (
            <SectionCard label="Description">
              <Text
                className="text-fg dark:text-fg-dark-DEFAULT text-sm leading-5"
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                {q.data.description}
              </Text>
            </SectionCard>
          ) : null}

          <SectionCard label="Details">
            <View className="gap-2.5">
              <DetailRow label="Created" value={fmtDateTime(q.data.createdAt)} />
              <DetailRow label="Updated" value={fmtDateTime(q.data.updatedAt)} />
              {q.data.assistantId ? (
                <DetailRow label="Assistant" value={q.data.assistantId} mono />
              ) : null}
              {q.data.vapiCampaignId ? (
                <DetailRow label="VAPI ID" value={q.data.vapiCampaignId} mono />
              ) : null}
            </View>
          </SectionCard>

          <Text
            className="text-fg-subtle dark:text-fg-dark-subtle text-[11px] text-center mt-2"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            Edit campaigns on the web platform.
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View className="flex-row items-start">
      <Text
        className="text-fg-muted dark:text-fg-dark-muted text-[11px] uppercase tracking-widest w-24"
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        {label}
      </Text>
      <Text
        className="text-fg dark:text-fg-dark-DEFAULT text-sm flex-1"
        style={{ fontFamily: mono ? 'Menlo' : 'Inter_500Medium' }}
        numberOfLines={2}
      >
        {value || '—'}
      </Text>
    </View>
  );
}
