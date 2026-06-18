import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { useActiveOrg } from '@/store/org';
import { useAgentsAnalytics } from '@/api/hooks/analyticsHooks';
import { fmtNumber, fmtPct, fmtDuration, fmtCurrency } from '@/lib/formatters';
import { useThemeMode } from '@/hooks/useThemeMode';

export default function AgentsAnalyticsScreen() {
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const query = useAgentsAnalytics(activeOrgId);
  const rows = query.data ?? [];

  return (
    <Screen>
      <AppHeader title="Agent analytics" showBack showOrgPill={false} />
      {!activeOrgId ? (
        <EmptyState title="Choose an organization" />
      ) : query.isPending ? (
        <View className="py-12 items-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : query.isError ? (
        <ErrorState
          message={(query.error as Error).message}
          onRetry={() => query.refetch()}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching}
              onRefresh={() => query.refetch()}
              tintColor={colors.accent}
            />
          }
        >
          {rows.length === 0 ? (
            <EmptyState
              title="No agent metrics yet"
              description="As agents take calls, performance metrics will appear here."
            />
          ) : (
            rows.map((a) => {
              const avgMinutes = a.averageDurationMinutes ?? undefined;
              const name = a.agentName ?? 'Unnamed agent';
              return (
                <View
                  key={a.agentId}
                  className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3 mb-2"
                >
                  <View className="flex-row items-center mb-2">
                    <Avatar name={name} size={28} />
                    <Text
                      className="text-fg dark:text-fg-dark-DEFAULT text-sm ml-2.5"
                      style={{ fontFamily: 'Inter_600SemiBold' }}
                    >
                      {name}
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-x-4 gap-y-1">
                    <Text
                      className="text-fg-muted dark:text-fg-dark-muted text-xs"
                      style={{ fontFamily: 'Inter_400Regular' }}
                    >
                      Calls · {fmtNumber(a.totalCalls ?? 0)}
                    </Text>
                    <Text
                      className="text-fg-muted dark:text-fg-dark-muted text-xs"
                      style={{ fontFamily: 'Inter_400Regular' }}
                    >
                      Success · {fmtPct(a.successRate)}
                    </Text>
                    <Text
                      className="text-fg-muted dark:text-fg-dark-muted text-xs"
                      style={{ fontFamily: 'Inter_400Regular' }}
                    >
                      Avg dur · {fmtDuration(avgMinutes)}
                    </Text>
                    <Text
                      className="text-fg-muted dark:text-fg-dark-muted text-xs"
                      style={{ fontFamily: 'Inter_400Regular' }}
                    >
                      Cost · {fmtCurrency(a.totalCost)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
