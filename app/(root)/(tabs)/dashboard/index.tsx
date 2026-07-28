import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { KpiStrip } from '@/components/dashboard/KpiStrip';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { TopAgentsRow } from '@/components/dashboard/TopAgentsRow';
import { useActiveOrg } from '@/store/org';
import { useDashboard } from '@/api/hooks/analyticsHooks';
import { useThemeMode } from '@/hooks/useThemeMode';
import { fmtCurrency } from '@/lib/formatters';

export default function DashboardScreen() {
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const router = useRouter();
  const dashboard = useDashboard(activeOrgId);

  return (
    <Screen edges={{ top: true, bottom: false }}>
      <AppHeader brand showOrgPill />
      {!activeOrgId ? (
        <EmptyState title="Choose an organization" />
      ) : dashboard.isPending ? (
        <View className="py-12 items-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : dashboard.isError ? (
        <ErrorState
          message={(dashboard.error as Error).message}
          onRetry={() => dashboard.refetch()}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={dashboard.isFetching}
              onRefresh={() => dashboard.refetch()}
              tintColor={colors.accent}
            />
          }
        >
          <Text variant="display.lg" className="mb-1">
            Overview
          </Text>
          <Text variant="body.sm" tone="muted" className="mb-4">
            What&apos;s happening across this org right now.
          </Text>

          <KpiStrip
            tiles={[
              {
                label: 'Total calls',
                value: String(dashboard.data?.metrics?.totalCalls ?? 0),
                hint:
                  dashboard.data?.metrics?.callSuccessRate != null
                    ? `${Number(dashboard.data.metrics.callSuccessRate).toFixed(0)}% success`
                    : undefined,
              },
              {
                label: 'Active agents',
                value: String(dashboard.data?.metrics?.activeAgents ?? 0),
                hint:
                  dashboard.data?.metrics?.agentUtilizationPercent != null
                    ? `${Number(dashboard.data.metrics.agentUtilizationPercent).toFixed(0)}% util`
                    : undefined,
              },
              {
                label: 'Live sessions',
                value: String(dashboard.data?.metrics?.liveActiveSessions ?? 0),
              },
              {
                label: 'Total cost',
                value: fmtCurrency(dashboard.data?.metrics?.totalCost ?? 0),
              },
            ]}
          />

          <View className="mt-4 gap-2">
            <Text variant="mono.label" tone="muted" className="mb-1.5 px-1">
              Shortcuts
            </Text>
            <View className="flex-row flex-wrap -mx-1">
              {[
                {
                  label: 'Campaigns',
                  icon: 'megaphone-outline' as const,
                  onPress: () => router.push('/(root)/campaigns' as never),
                },
                {
                  label: 'Knowledge',
                  icon: 'library-outline' as const,
                  onPress: () => router.push('/(root)/knowledge-bases' as never),
                },
                {
                  label: 'Calls',
                  icon: 'call-outline' as const,
                  onPress: () => router.push('/(root)/(tabs)/analytics/calls' as never),
                },
                {
                  label: 'Plugins',
                  icon: 'extension-puzzle-outline' as const,
                  onPress: () => router.push('/(root)/plugins' as never),
                },
              ].map((s) => (
                <View key={s.label} className="w-1/2 px-1 mb-2">
                  <Card padding="sm">
                    <View className="flex-row items-center">
                      <View className="w-9 h-9 rounded-lg bg-accent-soft dark:bg-accent-soft-dark items-center justify-center mr-2">
                        <Ionicons name={s.icon} size={16} color={colors.accent} />
                      </View>
                      <Text variant="body.medium" onPress={s.onPress}>
                        {s.label}
                      </Text>
                    </View>
                  </Card>
                </View>
              ))}
            </View>
          </View>

          <Text variant="mono.label" tone="muted" className="mt-3 mb-2 px-1">
            Recent activity
          </Text>
          <RecentActivity />

          <View className="mt-4">
            <TopAgentsRow />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
