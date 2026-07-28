import { ActivityIndicator, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ScreenHeading } from '@/components/common/ScreenHeading';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { GradientButton } from '@/components/ui/GradientButton';
import { StatTile } from '@/components/executive/StatTile';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { statusMeta, type AgentStatus } from '@/components/executive/AgentHealthRow';
import { useAgent } from '@/api/hooks/agentHooks';
import { useAgentDetails } from '@/api/hooks/analyticsHooks';
import { useActiveOrg } from '@/store/org';
import { useThemeMode } from '@/hooks/useThemeMode';
import { fmtCurrency, fmtNumber, fmtPct, fmtDuration } from '@/lib/formatters';
import type { Agent } from '@/api/services/types';

/**
 * The page assembles in one quick sweep — done inside ~500ms — so that the four
 * KPI numerals counting up are the thing you actually watch. Reanimated's layout
 * animations default to `ReduceMotion.System`, so the sweep is skipped entirely
 * when the OS setting is on.
 */
const BEAT = 50;
const enter = (step: number) => FadeInDown.duration(300).delay(step * BEAT);

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

  const shell = (children: React.ReactNode) => (
    <Screen background="nebula" edges={{ top: true, bottom: false }}>
      <AppHeader title="Agent" showBack showOrgPill={false} />
      {children}
    </Screen>
  );

  if (agentQuery.isPending) {
    return shell(
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.accent} />
      </View>,
    );
  }

  if (agentQuery.isError) {
    return shell(
      <ErrorState
        message={agentQuery.error instanceof Error ? agentQuery.error.message : undefined}
        onRetry={agentQuery.refetch}
      />,
    );
  }

  if (!agent) {
    return shell(
      <EmptyState
        icon={<Ionicons name="help-circle-outline" size={26} color={colors.fgMuted} />}
        title="Agent not found"
        description="This agent may have been removed or is no longer available."
      />,
    );
  }

  const status = lifecycleStatus(agent);
  const meta = status ? statusMeta(status) : null;
  const role = roleLabel(agent);
  const paused = status === 'paused';

  return shell(
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="pt-4">
        <ScreenHeading
          eyebrow={[role, agent.departmentId ? 'Assigned' : null].filter(Boolean).join(' · ')}
          title={agent.name}
          subtitle={agent.description || undefined}
        />
      </View>

      {meta ? (
        <Animated.View entering={enter(1)} className="mt-3 flex-row flex-wrap gap-2">
          <Tag
            label={meta.slaLabel}
            tone={
              meta.tone === 'success'
                ? 'success'
                : meta.tone === 'warning'
                  ? 'warning'
                  : meta.tone === 'danger'
                    ? 'danger'
                    : 'neutral'
            }
          />
          {agent.llmModel ? <Tag label={agent.llmModel} /> : null}
        </Animated.View>
      ) : null}

      {/* Performance — the numbers that decide whether to intervene, so they are
          the one thing on this screen that moves under its own steam. The details
          query resolves after mount; each numeral counts once, when its real value
          arrives, and a later refetch updates it in place without recounting. */}
      <Animated.View entering={enter(2)} className="mt-5 gap-3">
        <View className="flex-row gap-3">
          <StatTile
            label="Success rate"
            value={fmtPct(details?.successRate)}
            count={{ to: details?.successRate, format: fmtPct }}
            tone="success"
            index={0}
          />
          <StatTile
            label="Total calls"
            value={fmtNumber(details?.totalCalls)}
            // Rounded per step: a part-way value would otherwise render as
            // "1,204.37" and the numeral would jitter in width as it counts.
            count={{ to: details?.totalCalls, format: n => fmtNumber(Math.round(n)) }}
            tone="accent"
            index={1}
          />
        </View>
        <View className="flex-row gap-3">
          <StatTile
            label="Avg duration"
            value={fmtDuration(details?.averageDurationMinutes)}
            count={{ to: details?.averageDurationMinutes, format: fmtDuration }}
            tone="neutral"
            index={2}
          />
          <StatTile
            label="Total cost"
            value={fmtCurrency(details?.totalCost)}
            count={{ to: details?.totalCost, format: fmtCurrency }}
            tone="warning"
            index={3}
          />
        </View>
      </Animated.View>

      {/* Configuration, in the audit-record idiom: mono label, mono value. */}
      <Animated.View entering={enter(3)} className="mt-4">
        <Card>
          <Text variant="mono.label" tone="subtle">
            Configuration
          </Text>
          <View className="mt-3 gap-2.5">
            <DetailRow label="Type" value={agent.type ?? '—'} />
            <DetailRow label="Model" value={agent.llmModel ?? '—'} />
            <DetailRow label="Status" value={agent.status ?? '—'} />
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={enter(4)} className="mt-5 gap-2.5">
        <GradientButton
          fullWidth
          leftIcon={<Ionicons name="sparkles" size={16} color="#FFFFFF" />}
          onPress={() =>
            router.push({
              pathname: '/(root)/(tabs)/prime',
              params: {
                prompt: `How is ${agent.name} performing, and what should I change?`,
              },
            } as never)
          }
        >
          {`Ask Prime about ${agent.name}`}
        </GradientButton>

        {/* Pausing an agent takes it off live traffic, so it stays on the web
            console until the mobile confirm flow exists. */}
        <Button variant="secondary" fullWidth disabled>
          {paused ? 'Resume agent — on web' : 'Pause agent — on web'}
        </Button>
      </Animated.View>
    </ScrollView>,
  );
}

/** Mono label left, mono value right — the deck's audit-record row. */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text variant="mono.sm" tone="subtle">
        {label}
      </Text>
      <Text variant="mono.value" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
