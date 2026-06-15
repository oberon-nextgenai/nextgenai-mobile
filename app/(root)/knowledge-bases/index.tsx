import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Input } from '@/components/ui/Input';
import { useActiveOrg } from '@/store/org';
import { useKnowledgeBases } from '@/api/hooks/agentHooks';
import { useThemeMode } from '@/hooks/useThemeMode';

function fmtBytes(n?: number): string {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KnowledgeBasesListScreen() {
  const router = useRouter();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const q = useKnowledgeBases(activeOrgId);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const list = q.data ?? [];
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter((k) => k.name.toLowerCase().includes(s));
  }, [q.data, search]);

  return (
    <Screen edges={{ top: true, bottom: false }}>
      <AppHeader title="Knowledge bases" showBack showOrgPill={false} />
      {!activeOrgId ? (
        <EmptyState title="Choose an organization" />
      ) : q.isPending ? (
        <View className="py-12 items-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : q.isError ? (
        <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />
      ) : (
        <View className="flex-1">
          <View className="px-4 pt-3 pb-2">
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder="Search knowledge bases…"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<Ionicons name="search" size={16} color={colors.fgMuted} />}
            />
          </View>
          {filtered.length === 0 ? (
            <EmptyState
              variant="accent"
              icon={<Ionicons name="library-outline" size={22} color={colors.accent} />}
              title={(q.data ?? []).length === 0 ? 'No knowledge bases' : 'No matches'}
              description={
                (q.data ?? []).length === 0
                  ? 'Upload documents on the web; they appear here automatically.'
                  : 'Try a different search.'
              }
            />
          ) : (
            <ScrollView
              contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
              refreshControl={
                <RefreshControl
                  refreshing={q.isFetching}
                  onRefresh={() => q.refetch()}
                  tintColor={colors.accent}
                />
              }
            >
              {filtered.map((kb) => (
                <Pressable
                  key={kb._id}
                  onPress={() => router.push(`/(root)/knowledge-bases/${kb._id}` as never)}
                  className="flex-row items-center bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3 mb-2 active:opacity-80"
                >
                  <View className="w-9 h-9 rounded-lg bg-accent-soft dark:bg-accent-soft-dark items-center justify-center mr-3">
                    <Ionicons name="document-text-outline" size={16} color={colors.accent} />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                      style={{ fontFamily: 'Inter_500Medium' }}
                      numberOfLines={1}
                    >
                      {kb.name}
                    </Text>
                    <Text
                      className="text-fg-muted dark:text-fg-dark-muted text-xs mt-0.5"
                      style={{ fontFamily: 'Inter_400Regular' }}
                      numberOfLines={1}
                    >
                      {[kb.type, kb.status, fmtBytes(kb.size)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.fgSubtle} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </Screen>
  );
}
