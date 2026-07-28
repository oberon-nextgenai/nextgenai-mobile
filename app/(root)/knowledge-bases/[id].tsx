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
import { useKnowledgeBases } from '@/api/hooks/agentHooks';
import { useThemeMode } from '@/hooks/useThemeMode';

function fmtBytes(n?: number): string {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KnowledgeBaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const q = useKnowledgeBases(activeOrgId);
  const kb = (q.data ?? []).find((x) => x._id === id);

  return (
    <Screen edges={{ top: true, bottom: false }}>
      <AppHeader title={kb?.name ?? 'Knowledge base'} showBack showOrgPill={false} />
      {q.isPending ? (
        <View className="py-12 items-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : q.isError ? (
        <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />
      ) : !kb ? (
        <EmptyState title="Knowledge base not found" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <Text variant="display.lg" className="mb-3" numberOfLines={2}>
            {kb.name}
          </Text>

          <SectionCard label="Details">
            <View className="gap-2.5">
              <Row label="Status" value={kb.status ?? '—'} />
              <Row label="Type" value={kb.type ?? '—'} />
              <Row label="Size" value={fmtBytes(kb.size)} />
              {kb.knowledgeBaseId ? <Row label="KB ID" value={kb.knowledgeBaseId} /> : null}
            </View>
          </SectionCard>

          {kb.tags && kb.tags.length > 0 ? (
            <SectionCard label="Tags">
              <View className="flex-row flex-wrap gap-2">
                {kb.tags.map((t) => (
                  <Tag key={t} label={t} tone="accent" />
                ))}
              </View>
            </SectionCard>
          ) : null}

          <Text variant="body.xs" tone="subtle" className="text-center mt-2">
            Upload and manage documents on the web platform.
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}

/** Mono label left, mono value right — the audit-record row. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start">
      <Text variant="mono.label" tone="muted" className="w-20">
        {label}
      </Text>
      <Text variant="mono.value" className="flex-1" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}
