import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import { FilterChipRow, type FilterOption } from '@/components/ui/FilterChipRow';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { MmrProgressHeader } from '@/components/mmr/MmrProgressHeader';
import { MmrContactGroupRow } from '@/components/mmr/MmrContactGroupRow';
import { MmrPluginGate } from '@/components/mmr/MmrPluginGate';
import { MmrGroupActionSheet } from '@/components/mmr/MmrGroupActionSheet';
import { useActiveOrg } from '@/store/org';
import { useCampaign } from '@/api/hooks/campaignHooks';
import { useMmrDetails, useStartCampaign, useStopCampaign } from '@/api/hooks/mmrHooks';
import { MMR_STATUS_LABEL, type MmrContactGroup, type MmrGroupStatus } from '@/api/services/mmr';
import { fmtDateTime } from '@/lib/formatters';
import { confirmAction } from '@/lib/confirm';
import { useThemeMode } from '@/hooks/useThemeMode';

type StatusFilter = MmrGroupStatus | 'all';

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const q = useCampaign(activeOrgId, id);

  const isMmr = q.data?.type === 'mmr';

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
      <AppHeader title={isMmr ? 'Meter reading' : 'Campaign'} showBack showOrgPill={false} />
      {q.isPending ? (
        <View className="py-12 items-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : q.isError ? (
        <ErrorState message={(q.error as Error).message} onRetry={() => void q.refetch()} />
      ) : !q.data ? (
        <EmptyState title="Campaign not found" />
      ) : isMmr ? (
        // An MMR campaign the workspace is not entitled to see still exists and
        // still appears in the list; the gate explains why its detail is
        // withheld rather than pretending the campaign is missing.
        <MmrPluginGate orgId={activeOrgId}>
          <MmrCampaignView
            campaignId={id}
            orgId={activeOrgId}
            name={q.data.name}
            status={q.data.status}
          />
        </MmrPluginGate>
      ) : (
        <StandardCampaignView campaign={q.data} />
      )}
    </Screen>
  );
}

/* ---------------------------------------------------------------- MMR view */

interface MmrCampaignViewProps {
  campaignId: string;
  orgId: string;
  name: string;
  status: string;
}

function MmrCampaignView({ campaignId, orgId, name, status }: MmrCampaignViewProps) {
  const router = useRouter();
  const { colors } = useThemeMode();
  const details = useMmrDetails(orgId, campaignId);
  const start = useStartCampaign({ orgId, campaignId });
  const stop = useStopCampaign({ orgId, campaignId });

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<MmrContactGroup | null>(null);

  const groups = useMemo(
    () => details.data?.campaign?.mmrData?.contactGroups ?? [],
    [details.data],
  );

  const statusCounts = useMemo(
    () =>
      groups.reduce<Record<string, number>>((acc, group) => {
        const key = group.status ?? 'pending';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    [groups],
  );

  const filterOptions = useMemo<FilterOption<StatusFilter>[]>(() => {
    const options: FilterOption<StatusFilter>[] = [
      { value: 'all', label: 'All', count: groups.length },
    ];
    // Only statuses actually present get a chip — a row of zeroes is noise.
    for (const key of Object.keys(MMR_STATUS_LABEL) as MmrGroupStatus[]) {
      if (statusCounts[key]) {
        options.push({ value: key, label: MMR_STATUS_LABEL[key], count: statusCounts[key] });
      }
    }
    return options;
  }, [groups.length, statusCounts]);

  const visible = useMemo(
    () => (filter === 'all' ? groups : groups.filter(g => (g.status ?? 'pending') === filter)),
    [groups, filter],
  );

  const isRunning = status === 'active' || status === 'scheduled';
  const isTerminal = status === 'completed' || status === 'cancelled' || status === 'failed';

  function onStop() {
    confirmAction({
      title: 'Stop this campaign?',
      // Deliberately blunt: there is no pause. `CampaignStatus.PAUSED` exists in
      // the enum and nothing ever sets it; stop is terminal and releases the
      // number. An action that looks reversible and isn't is the worse failure.
      message:
        'Stopping is permanent. The campaign is cancelled, its phone number is released, and no further readings are collected. It cannot be resumed.',
      confirmLabel: 'Stop campaign',
      onConfirm: () => stop.mutate(),
    });
  }

  function onStart() {
    confirmAction({
      title: 'Start this campaign?',
      message: `This begins contacting ${groups.length} customer${groups.length === 1 ? '' : 's'} by email and phone to collect meter readings.`,
      confirmLabel: 'Start campaign',
      destructive: false,
      onConfirm: () => start.mutate(),
    });
  }

  if (details.isPending) {
    return (
      <View className="py-12 items-center">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (details.isError) {
    return (
      <ErrorState
        message={(details.error as Error).message}
        onRetry={() => void details.refetch()}
      />
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text variant="display.md" className="mb-1" numberOfLines={2}>
          {name}
        </Text>
        <View className="flex-row items-center gap-2 mb-4">
          <Tag label={status} />
          <Text variant="mono.value" tone="muted">
            {groups.length} contact {groups.length === 1 ? 'group' : 'groups'}
          </Text>
        </View>

        <MmrProgressHeader
          stats={details.data?.stats}
          statusCounts={statusCounts}
          totalGroups={groups.length}
        />

        {isRunning ? (
          <Button
            variant="outline-danger"
            size="sm"
            fullWidth
            className="mb-2"
            loading={stop.isPending}
            onPress={onStop}
            leftIcon={<Ionicons name="stop-circle-outline" size={14} color={colors.danger} />}
          >
            Stop campaign
          </Button>
        ) : isTerminal ? null : (
          <Button
            variant="primary"
            size="sm"
            fullWidth
            className="mb-2"
            loading={start.isPending}
            onPress={onStart}
            leftIcon={<Ionicons name="play-outline" size={14} color="#fff" />}
          >
            Start campaign
          </Button>
        )}

        <Button
          variant="secondary"
          size="sm"
          fullWidth
          className="mb-4"
          onPress={() => router.push(`/campaigns/status/${campaignId}` as never)}
          leftIcon={<Ionicons name="pulse-outline" size={14} color={colors.fg} />}
        >
          Call and email status
        </Button>

        <Text variant="mono.label" tone="subtle" className="mb-2">
          Contact groups
        </Text>

        {groups.length > 0 ? (
          <FilterChipRow
            options={filterOptions}
            value={filter}
            onChange={setFilter}
            className="mb-3"
          />
        ) : null}

        {visible.length === 0 ? (
          <EmptyState
            title={groups.length === 0 ? 'No contact groups' : 'Nothing in this status'}
            description={
              groups.length === 0 ? 'This campaign has no meters attached yet.' : undefined
            }
          />
        ) : (
          visible.map(group => (
            <MmrContactGroupRow
              key={group.groupId}
              group={group}
              onPress={() => setSelected(group)}
            />
          ))
        )}
      </ScrollView>

      <MmrGroupActionSheet
        group={selected}
        orgId={orgId}
        campaignId={campaignId}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

/* ----------------------------------------------------------- Standard view */

interface StandardCampaign {
  name: string;
  status: string;
  description?: string;
  contacts?: string[];
  assistantId?: string;
  vapiCampaignId?: string;
  createdAt?: string;
  updatedAt?: string;
}

function StandardCampaignView({ campaign }: { campaign: StandardCampaign }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text variant="display.lg" className="mb-1" numberOfLines={2}>
        {campaign.name}
      </Text>
      <View className="flex-row items-center gap-2 mb-4">
        <Tag label={campaign.status} />
        {campaign.contacts ? (
          <Text variant="mono.value" tone="muted">
            {campaign.contacts.length} contacts
          </Text>
        ) : null}
      </View>

      {campaign.description ? (
        <SectionCard label="Description">
          <Text variant="body.sm">{campaign.description}</Text>
        </SectionCard>
      ) : null}

      <SectionCard label="Details">
        <View className="gap-2.5">
          <DetailRow label="Created" value={fmtDateTime(campaign.createdAt)} />
          <DetailRow label="Updated" value={fmtDateTime(campaign.updatedAt)} />
          {campaign.assistantId ? (
            <DetailRow label="Assistant" value={campaign.assistantId} />
          ) : null}
          {campaign.vapiCampaignId ? (
            <DetailRow label="VAPI ID" value={campaign.vapiCampaignId} />
          ) : null}
        </View>
      </SectionCard>

      <Text variant="body.xs" tone="subtle" className="text-center mt-2">
        Edit campaigns on the web platform.
      </Text>
    </ScrollView>
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
