import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { AgentRow } from '@/components/agents/AgentRow';
import { useActiveOrg } from '@/store/org';
import { useAgentsList } from '@/api/hooks/agentHooks';
import { useThemeMode } from '@/hooks/useThemeMode';
import type { Agent } from '@/api/services/types';

type Filter = 'all' | 'voice' | 'text';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'voice', label: 'Voice' },
  { key: 'text', label: 'Text' },
];

function matchesFilter(agent: Agent, filter: Filter): boolean {
  if (filter === 'all') return true;
  const t = (agent.agentType ?? agent.type ?? '').toLowerCase();
  if (filter === 'voice') return t === 'phone' || t === 'voice';
  if (filter === 'text') return t === 'text';
  return true;
}

export default function AgentsScreen() {
  const router = useRouter();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const query = useAgentsList({ orgId: activeOrgId, search: search.trim() || undefined });

  const allAgents = useMemo<Agent[]>(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  const filteredAgents = useMemo(
    () => allAgents.filter((a) => matchesFilter(a, filter)),
    [allAgents, filter],
  );
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <Screen edges={{ top: true, bottom: false }}>
      <AppHeader title="Agents" showOrgPill={false} />
      {!activeOrgId ? (
        <EmptyState title="Choose an organization" />
      ) : (
        <>
          <View className="px-4 pt-3 pb-2 gap-3">
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <Input
                  placeholder="Search agents…"
                  value={search}
                  onChangeText={setSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon={
                    <Ionicons name="search" size={16} color={colors.fgMuted} />
                  }
                />
              </View>
              <IconButton icon="options-outline" size={40} variant="surface" />
            </View>
            <View className="flex-row flex-wrap gap-2">
              {FILTERS.map((f) => (
                <Chip
                  key={f.key}
                  label={f.label}
                  selected={filter === f.key}
                  onPress={() => setFilter(f.key)}
                />
              ))}
            </View>
          </View>

          <View className="absolute right-4 bottom-20 z-10">
            <Pressable
              onPress={() => router.push('/(root)/agents/new' as never)}
              className="w-12 h-12 rounded-full bg-accent dark:bg-accent-dark items-center justify-center"
              style={{
                shadowColor: colors.accent,
                shadowOpacity: 0.32,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 10,
                elevation: 4,
              }}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          {query.isPending ? (
            <View className="py-12 items-center">
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : query.isError ? (
            <ErrorState
              message={(query.error as Error).message}
              onRetry={() => query.refetch()}
            />
          ) : filteredAgents.length === 0 ? (
            <EmptyState
              icon={<Ionicons name="people-outline" size={28} color={colors.accent} />}
              title="No agents"
              description={
                search || filter !== 'all'
                  ? 'Try a different search or filter.'
                  : 'Your organization has no agents yet.'
              }
            />
          ) : (
            <>
              <FlashList
                data={filteredAgents}
                keyExtractor={(a) => a._id ?? a.id ?? a.name}
                renderItem={({ item }) => (
                  <AgentRow
                    agent={item}
                    onPress={() =>
                      router.push(`/(root)/(tabs)/agents/${item._id ?? item.id}`)
                    }
                  />
                )}
                estimatedItemSize={72}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}
                onEndReached={() => {
                  if (query.hasNextPage && !query.isFetchingNextPage) {
                    void query.fetchNextPage();
                  }
                }}
                onEndReachedThreshold={0.4}
                ListFooterComponent={
                  query.isFetchingNextPage ? (
                    <View className="py-3 items-center">
                      <ActivityIndicator color={colors.accent} />
                    </View>
                  ) : null
                }
                refreshControl={
                  <RefreshControl
                    refreshing={query.isFetching && !query.isFetchingNextPage}
                    onRefresh={() => query.refetch()}
                    tintColor={colors.accent}
                  />
                }
              />
              <View className="absolute bottom-0 left-0 right-0 bg-bg dark:bg-bg-dark border-t border-border-subtle dark:border-border-dark-subtle px-4 py-2.5">
                <Text
                  className="text-fg-muted dark:text-fg-dark-muted text-xs text-center"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  Showing {filteredAgents.length} of {total} agents
                </Text>
              </View>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
