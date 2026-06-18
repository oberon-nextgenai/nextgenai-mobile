import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { MetricCard } from '@/components/analytics/MetricCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { statusMeta, type AgentStatus } from '@/components/executive/AgentHealthRow';
import { useAgent } from '@/api/hooks/agentHooks';
import { useAgentDetails } from '@/api/hooks/analyticsHooks';
import { useActiveOrg } from '@/store/org';
import { useThemeMode } from '@/hooks/useThemeMode';
import { fmtCurrency, fmtNumber, fmtPct, fmtDuration } from '@/lib/formatters';
import type { Agent } from '@/api/services/types';

/** Map an agent's lifecycle state to one of the workforce health statuses. */
function lifecycleStatus(agent?: Agent): AgentStatus | null {
  const lifecycle = (agent?.status ?? '').toLowerCase();
  if (!lifecycle) return null;
  if (lifecycle === 'paused' || lifecycle === 'inactive') return 'paused';
  return 'healthy';
}

function roleLabel(agent?: Agent): string | null {
  switch (agent?.type) {
    case 'phone':
      return 'Voice agent';
    case 'text':
      return 'Chat agent';
    case 'external':
      return 'External agent';
    default:
      return agent?.agentType || null;
  }
}

export default function WorkforceAgentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();

  const agentQuery = useAgent(activeOrgId, id);
  const agent = agentQuery.data;
  const detailsQuery = useAgentDetails(activeOrgId, agent?.vapiAgentId);
  const details = detailsQuery.data;

  // ── States ────────────────────────────────────────────────────────────────
  if (agentQuery.isPending) {
    return (
      <Screen background="nebula" edges={{ top: true, bottom: false }}>
        <AppHeader title="Agent" showBack showOrgPill={false} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (agentQuery.isError) {
    return (
      <Screen background="nebula" edges={{ top: true, bottom: false }}>
        <AppHeader title="Agent" showBack showOrgPill={false} />
        <ErrorState
          message={agentQuery.error instanceof Error ? agentQuery.error.message : undefined}
          onRetry={agentQuery.refetch}
        />
      </Screen>
    );
  }

  if (!agent) {
    return (
      <Screen background="nebula" edges={{ top: true, bottom: false }}>
        <AppHeader title="Agent" showBack showOrgPill={false} />
        <EmptyState
          icon={<Ionicons name="help-circle-outline" size={26} color={colors.fgMuted} />}
          title="Agent not found"
          description="This agent may have been removed or is no longer available."
        />
      </Screen>
    );
  }

  const status = lifecycleStatus(agent);
  const meta = status ? statusMeta(status) : null;
  const role = roleLabel(agent);

  return (
    <Screen background="nebula" edges={{ top: true, bottom: false }}>
      <AppHeader title="Agent" showBack showOrgPill={false} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header block */}
        <Animated.View entering={FadeInDown.duration(320)} className="mt-1">
          <Text
            className="text-fg dark:text-fg-dark-DEFAULT"
            style={{ fontFamily: 'Inter_700Bold', fontSize: 24 }}
          >
            {agent.name}
          </Text>
          <View className="flex-row items-center flex-wrap mt-1.5 gap-x-2">
            {role ? (
              <Text
                className="text-fg-muted dark:text-fg-dark-muted text-[13px]"
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                {role}
              </Text>
            ) : null}
            {role && meta ? (
              <Text className="text-fg-subtle dark:text-fg-dark-subtle text-[13px]">·</Text>
            ) : null}
            {meta ? (
              <View className="flex-row items-center">
                <Ionicons
                  name={meta.icon}
                  size={13}
                  color={meta.color(colors)}
                  style={{ marginRight: 4 }}
                />
                <Text
                  className={`text-[13px] ${meta.colorClassText}`}
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  {meta.label}
                </Text>
              </View>
            ) : null}
          </View>
          {agent.description ? (
            <Text
              className="text-fg-muted dark:text-fg-dark-muted text-[13px] mt-2"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {agent.description}
            </Text>
          ) : null}
        </Animated.View>

        {/* KPI grid */}
        <Animated.View
          entering={FadeInDown.duration(320).delay(80)}
          className="flex-row flex-wrap gap-3 mt-5"
        >
          <MetricCard
            variant="compact"
            label="Success rate"
            value={fmtPct(details?.successRate)}
            icon="checkmark-circle-outline"
          />
          <MetricCard
            variant="compact"
            label="Total calls"
            value={fmtNumber(details?.totalCalls)}
            icon="call-outline"
          />
          <MetricCard
            variant="compact"
            label="Avg duration"
            value={fmtDuration(details?.averageDurationMinutes)}
            icon="time-outline"
          />
          <MetricCard
            variant="compact"
            label="Total cost"
            value={fmtCurrency(details?.totalCost)}
            icon="cash-outline"
          />
        </Animated.View>

        {/* Insight CTA */}
        <Animated.View entering={FadeInDown.duration(320).delay(160)} className="mt-6">
          <Button
            variant="primary"
            fullWidth
            leftIcon={<Ionicons name="sparkles" size={16} color="#FFFFFF" />}
            onPress={() =>
              router.push({
                pathname: '/(root)/(tabs)/prime',
                params: {
                  prompt: `How is ${agent?.name ?? 'this agent'} performing and what should I improve?`,
                },
              } as never)
            }
          >
            Ask Prime about this agent
          </Button>

          {/* Quieter, secondary affordance — placeholder only, no mutation. */}
          <View className="mt-2.5">
            <Button variant="ghost" disabled>
              Pause agent
            </Button>
          </View>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
