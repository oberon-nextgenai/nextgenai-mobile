import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Card } from '@/components/ui/Card';
import { Tag, type TagTone } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { CallFilters, type CallDateRange, type CallStatusFilter } from '@/components/analytics/CallFilters';
import { CallTranscriptModal } from '@/components/analytics/CallTranscriptModal';
import { useActiveOrg } from '@/store/org';
import { useCalls } from '@/api/hooks/analyticsHooks';
import { fmtDateTime, fmtDuration, fmtCurrency } from '@/lib/formatters';
import { useThemeMode } from '@/hooks/useThemeMode';
import type { AnalyticsCallSummary } from '@/api/services/types';

function statusOf(c: AnalyticsCallSummary): {
  label: string;
  tone: 'positive' | 'negative' | 'neutral';
  bucket: CallStatusFilter;
} {
  if (c.evalSuccessful === true)
    return { label: 'Successful', tone: 'positive', bucket: 'successful' };
  if (c.evalSuccessful === false)
    return { label: 'Unsuccessful', tone: 'negative', bucket: 'unsuccessful' };
  if (c.status === 'failed')
    return { label: c.disconnectionReason ?? 'failed', tone: 'negative', bucket: 'failed' };
  return { label: c.disconnectionReason ?? c.status ?? 'ended', tone: 'neutral', bucket: 'all' };
}

const TONE_TAG: Record<string, TagTone> = {
  positive: 'success',
  negative: 'danger',
  neutral: 'neutral',
};

const RANGE_MS: Record<Exclude<CallDateRange, 'all'>, number> = {
  '7d': 7 * 86_400_000,
  '30d': 30 * 86_400_000,
  '90d': 90 * 86_400_000,
};

export default function CallsScreen() {
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const calls = useCalls(activeOrgId);

  const [range, setRange] = useState<CallDateRange>('30d');
  const [statusFilter, setStatusFilter] = useState<CallStatusFilter>('all');
  const [selected, setSelected] = useState<AnalyticsCallSummary | null>(null);

  const filtered = useMemo(() => {
    const list = calls.data ?? [];
    const cutoff = range === 'all' ? null : Date.now() - RANGE_MS[range];
    return list.filter((c) => {
      const t = c.startedAt ? Date.parse(c.startedAt) : null;
      if (cutoff != null && (t == null || t < cutoff)) return false;
      if (statusFilter !== 'all' && statusOf(c).bucket !== statusFilter) return false;
      return true;
    });
  }, [calls.data, range, statusFilter]);

  return (
    <Screen>
      <AppHeader title="Calls" showBack showOrgPill={false} />
      {!activeOrgId ? (
        <EmptyState title="Choose an organization" />
      ) : calls.isPending ? (
        <View className="py-12 items-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : calls.isError ? (
        <ErrorState
          message={(calls.error as Error).message}
          onRetry={() => calls.refetch()}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={calls.isFetching}
              onRefresh={() => calls.refetch()}
              tintColor={colors.accent}
            />
          }
        >
          <View className="mb-4">
            <CallFilters
              range={range}
              onRange={setRange}
              status={statusFilter}
              onStatus={setStatusFilter}
            />
          </View>

          {filtered.length === 0 ? (
            <EmptyState
              variant="accent"
              icon={<Ionicons name="call-outline" size={22} color={colors.accent} />}
              title="No calls match"
              description={
                (calls.data ?? []).length === 0
                  ? "Once your agents take calls, they'll appear here."
                  : 'Try a different date range or status.'
              }
            />
          ) : (
            filtered.map((c) => {
              const status = statusOf(c);
              const start = c.startedAt;
              const minutes = c.durationSec != null ? c.durationSec / 60 : undefined;
              const transcriptExcerpt = c.summary;
              const hasRecording = Boolean(c.recordingUrl);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setSelected(c)}
                  className="mb-2 active:opacity-80"
                >
                  {/* No gloss: this renders once per call in a scrolling list. */}
                  <Card padding="sm">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text variant="body.semibold" numberOfLines={1}>
                        {c.agentName ?? fmtDateTime(start)}
                      </Text>
                      <Tag label={status.label} tone={TONE_TAG[status.tone]} />
                    </View>
                    <View className="flex-row gap-4 mt-1 items-center flex-wrap">
                      {start ? (
                        <Text variant="mono.sm" tone="muted">
                          {fmtDateTime(start)}
                        </Text>
                      ) : null}
                      <Text variant="mono.sm" tone="muted">
                        Duration · {fmtDuration(minutes)}
                      </Text>
                      <Text variant="mono.sm" tone="muted">
                        Cost · {fmtCurrency(c.cost)}
                      </Text>
                      {hasRecording ? (
                        <View className="flex-row items-center">
                          <Ionicons name="play-circle-outline" size={12} color={colors.accent} />
                          <Text variant="body.xs" tone="accent" className="ml-1">
                            Recording
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {transcriptExcerpt ? (
                      <Text variant="body.sm" tone="muted" className="mt-2" numberOfLines={2}>
                        {transcriptExcerpt}
                      </Text>
                    ) : null}
                  </Card>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      <CallTranscriptModal call={selected} onClose={() => setSelected(null)} />
    </Screen>
  );
}
