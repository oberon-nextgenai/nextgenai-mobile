import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import { useActiveOrg } from '@/store/org';
import { useKnowledgeBases } from '@/api/hooks/agentHooks';
import { useThemeMode } from '@/hooks/useThemeMode';
import { fmtDateTime } from '@/lib/formatters';

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
          <Text
            className="text-fg dark:text-fg-dark-DEFAULT text-2xl mb-3"
            style={{ fontFamily: 'Inter_700Bold' }}
            numberOfLines={2}
          >
            {kb.name}
          </Text>

          <SectionCard label="Details">
            <View className="gap-2.5">
              <Row label="Status" value={kb.status ?? '—'} />
              <Row label="Type" value={kb.type ?? '—'} />
              <Row label="Size" value={fmtBytes(kb.size)} />
              {kb.knowledgeBaseId ? <Row label="KB ID" value={kb.knowledgeBaseId} mono /> : null}
            </View>
          </SectionCard>

          {kb.tags && kb.tags.length > 0 ? (
            <SectionCard label="Tags">
              <View className="flex-row flex-wrap gap-2">
                {kb.tags.map((t) => (
                  <View
                    key={t}
                    className="bg-accent-soft dark:bg-accent-soft-dark rounded-full px-2.5 py-1"
                  >
                    <Text
                      className="text-accent dark:text-accent-dark text-xs"
                      style={{ fontFamily: 'Inter_500Medium' }}
                    >
                      {t}
                    </Text>
                  </View>
                ))}
              </View>
            </SectionCard>
          ) : null}

          <Text
            className="text-fg-subtle dark:text-fg-dark-subtle text-[11px] text-center mt-2"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            Upload and manage documents on the web platform.
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View className="flex-row items-start">
      <Text
        className="text-fg-muted dark:text-fg-dark-muted text-[11px] uppercase tracking-widest w-20"
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        {label}
      </Text>
      <Text
        className="text-fg dark:text-fg-dark-DEFAULT text-sm flex-1"
        style={{ fontFamily: mono ? 'Menlo' : 'Inter_500Medium' }}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}
