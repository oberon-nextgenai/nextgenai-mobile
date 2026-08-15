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
// DEMO ONLY — DO NOT MERGE: metric gap-fill + local pause state for the demo.
import Toast from 'react-native-toast-message';
import { DEMO_APPROVALS } from '@/api/demo/flags';
import { demoAgentDetails } from '@/api/demo/metricsDemo';
import { canonicalNameFor, profileForName } from '@/api/demo/agentProfiles';
import { useDemoOverrides } from '@/store/demoOverrides';
import { useConversationFeed } from '@/api/hooks/conversationHooks';
import { useAgentAudit } from '@/api/hooks/auditHooks';
import { ConversationRow } from '@/components/executive/ConversationRow';
import { fmtCurrency, fmtNumber, fmtPct, fmtDuration, fmtRelative } from '@/lib/formatters';
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

  // Same key the Workforce roster row uses, so pause state follows the agent
  // between the list and this screen.
  const agentKey = agent?._id ?? agent?.id ?? id ?? '';
  // DEMO ONLY — DO NOT MERGE: local pause/resume override + KPI gap-fill.
  const statusOverride = useDemoOverrides((s) =>
    DEMO_APPROVALS && agentKey ? s.status[agentKey] : undefined,
  );
  const setStatusOverride = useDemoOverrides((s) => s.setStatus);
  const details =
    detailsQuery.data ??
    (DEMO_APPROVALS && agentKey ? demoAgentDetails(agentKey) : undefined);

  // DEMO ONLY — DO NOT MERGE: canonical presentation + per-agent live data.
  const canonicalName = DEMO_APPROVALS && agent ? canonicalNameFor(agent) : null;
  const profile = canonicalName ? profileForName(canonicalName) : undefined;
  const conversations = useConversationFeed(activeOrgId, agentKey || undefined);
  const audit = useAgentAudit(
    activeOrgId,
    agentKey || undefined,
    canonicalName ?? agent?.name,
  );

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

  // A hidden agent is a moderation decision made on the web console — treat it
  // exactly like an agent that does not exist, even on a direct link.
  if (!agent || agent.hidden) {
    return shell(
      <EmptyState
        icon={<Ionicons name="help-circle-outline" size={26} color={colors.fgMuted} />}
        title="Agent not found"
        description="This agent may have been removed or is no longer available."
      />,
    );
  }

  const status =
    statusOverride === 'paused'
      ? 'paused'
      : statusOverride === 'active'
        ? 'healthy'
        : lifecycleStatus(agent);
  const meta = status ? statusMeta(status) : null;
  const role = roleLabel(agent);
  const paused = status === 'paused';
  // The demo presents canonical names — "Ava", not "Ava (Nurture Text)".
  const displayName = canonicalName ?? agent.name;
  const displayRole = profile?.role ?? role;
  const recentConversations = (conversations.data ?? []).slice(0, 3);
  const auditItems = audit.data ?? [];

  return shell(
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="pt-4">
        <ScreenHeading
          eyebrow={[displayRole, agent.departmentId ? 'Assigned' : null]
            .filter(Boolean)
            .join(' · ')}
          title={displayName}
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
        {profile ? (
          // DEMO ONLY — DO NOT MERGE: the minutes-based plan is the cost story
          // for the board — allowance, remaining minutes, monthly price.
          <>
            <View className="flex-row gap-3">
              <StatTile
                label="Success rate"
                value={fmtPct(details?.successRate)}
                count={{ to: details?.successRate, format: fmtPct }}
                tone="success"
                index={0}
              />
              <StatTile
                label="Calls handled"
                value={fmtNumber(profile.monthlyCalls)}
                caption="this month"
                count={{ to: profile.monthlyCalls, format: n => fmtNumber(Math.round(n)) }}
                tone="accent"
                index={1}
              />
            </View>
            <View className="flex-row gap-3">
              <StatTile
                label="Minutes left"
                value={fmtNumber(
                  Math.round(profile.includedMinutes * (1 - profile.minutesUsedPct)),
                )}
                caption={`of ${Math.round(profile.includedMinutes / 1000)}K included`}
                count={{
                  to: Math.round(profile.includedMinutes * (1 - profile.minutesUsedPct)),
                  format: n => fmtNumber(Math.round(n)),
                }}
                tone="neutral"
                index={2}
              />
              <StatTile
                label="Cost this month"
                value={fmtCurrency(profile.monthlyCost)}
                caption="minutes-based plan"
                count={{ to: profile.monthlyCost, format: fmtCurrency }}
                tone="warning"
                index={3}
              />
            </View>
          </>
        ) : (
          <>
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
          </>
        )}
      </Animated.View>

      {/* Configuration, in the audit-record idiom: mono label, mono value. */}
      <Animated.View entering={enter(3)} className="mt-4">
        <Card>
          <Text variant="mono.label" tone="subtle">
            Configuration
          </Text>
          <View className="mt-3 gap-2.5">
            {/* Demo-gated fallbacks: the board demo must never show a dash. */}
            <DetailRow
              label="Type"
              value={agent.type ?? (DEMO_APPROVALS ? (role ?? 'Chat agent') : '—')}
            />
            <DetailRow
              label="Model"
              value={agent.llmModel ?? (DEMO_APPROVALS ? 'gpt-4o' : '—')}
            />
            <DetailRow
              label="Status"
              value={statusOverride ?? agent.status ?? (DEMO_APPROVALS ? 'active' : '—')}
            />
          </View>
        </Card>
      </Animated.View>

      {/* What this agent has been doing — live feed, filtered to this agent. */}
      {recentConversations.length > 0 ? (
        <Animated.View entering={enter(4)} className="mt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text variant="mono.label" tone="subtle">
              Recent conversations
            </Text>
            <Text
              variant="mono.label"
              tone="accent"
              onPress={() =>
                router.push({
                  pathname: '/(root)/communications',
                  params: { agentId: agentKey },
                } as never)
              }
            >
              View all
            </Text>
          </View>
          <View className="gap-2">
            {recentConversations.map((item) => (
              <ConversationRow key={item.id} item={item} />
            ))}
          </View>
        </Animated.View>
      ) : null}

      {/* The agent's audit trail — Prime is the orchestrator, people decide. */}
      {auditItems.length > 0 ? (
        <Animated.View entering={enter(5)} className="mt-4">
          <Card>
            <Text variant="mono.label" tone="subtle">
              Audit trail
            </Text>
            <View className="mt-3 gap-3">
              {auditItems.map((item) => (
                <View key={item.id} className="flex-row">
                  <View
                    className="w-1.5 h-1.5 rounded-full mt-1.5 mr-2.5"
                    style={{
                      backgroundColor:
                        item.tone === 'success'
                          ? colors.success
                          : item.tone === 'danger'
                            ? colors.danger
                            : colors.accent2,
                    }}
                  />
                  <View className="flex-1 min-w-0">
                    <Text variant="body.sm" numberOfLines={2}>
                      {item.text}
                    </Text>
                    <Text variant="mono.label" tone="subtle" className="mt-0.5">
                      {`${item.actor} · ${fmtRelative(item.at)}`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>
      ) : null}

      <Animated.View entering={enter(6)} className="mt-5 gap-2.5">
        <GradientButton
          fullWidth
          leftIcon={<Ionicons name="sparkles" size={16} color="#FFFFFF" />}
          onPress={() =>
            // `navigate`, not `push` — pushing stacks a second Prime screen
            // with its own empty conversation (the "chat reset" bug).
            router.navigate({
              pathname: '/(root)/(tabs)/prime',
              params: {
                prompt: `How is ${displayName} performing, and what should I change?`,
              },
            } as never)
          }
        >
          {`Ask Prime about ${displayName}`}
        </GradientButton>

        {DEMO_APPROVALS ? (
          // DEMO ONLY — DO NOT MERGE: pause/resume is a local, instantly
          // reversible flip. No confirm dialog — `window.confirm` on the web
          // build would surface browser chrome mid-presentation — and no
          // backend call, so live traffic is never at risk on stage.
          <Button
            variant="secondary"
            fullWidth
            onPress={() => {
              const next = paused ? 'active' : 'paused';
              setStatusOverride(agentKey, next);
              Toast.show({
                type: 'success',
                text1: next === 'paused' ? 'Paused' : 'Resumed',
                text2:
                  next === 'paused'
                    ? `${displayName} is off live traffic.`
                    : `${displayName} is back on live traffic.`,
              });
            }}
          >
            {paused ? `Resume ${displayName}` : `Pause ${displayName}`}
          </Button>
        ) : (
          /* Pausing an agent takes it off live traffic, so it stays on the web
             console until the mobile confirm flow exists. */
          <Button variant="secondary" fullWidth disabled>
            {paused ? 'Resume agent — on web' : 'Pause agent — on web'}
          </Button>
        )}
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
