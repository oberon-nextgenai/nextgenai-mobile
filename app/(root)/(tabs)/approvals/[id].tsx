import { ActivityIndicator, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ScreenHeading } from '@/components/common/ScreenHeading';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { GradientButton } from '@/components/ui/GradientButton';
import { useDecideEscalation, useEscalation } from '@/api/hooks/escalationHooks';
import { useActiveOrg } from '@/store/org';
import { useAuthStore } from '@/store/auth';
import { useThemeMode } from '@/hooks/useThemeMode';
import { fmtDateTime, fmtPct, fmtRelative } from '@/lib/formatters';
import { redactSensitiveDeep } from '@/lib/redactSensitive';
import { TOOL_GRANT_ACTION, type Approval, type Escalation } from '@/api/services/escalations';

/** `cost_anomaly` → `cost anomaly`. The Tag uppercases it. */
function kindLabel(kind: string): string {
  return kind.replace(/_/g, ' ');
}

/**
 * Money at risk, in the queue's idiom — `$284,000 at risk`.
 *
 * Only stamps a `$` for USD; anything else carries its own code rather than
 * being silently re-denominated.
 */
function riskLabel(escalation: Escalation): string {
  const amount = Math.round(escalation.impactAmount).toLocaleString('en-US');
  const currency = (escalation.currency || '').toUpperCase();
  return currency && currency !== 'USD'
    ? `${amount} ${currency} at risk`
    : `$${amount} at risk`;
}

export default function ApprovalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();

  const query = useEscalation(activeOrgId, id);
  const escalation = query.data?.escalation;
  const approval = query.data?.approval ?? null;
  const decide = useDecideEscalation(activeOrgId);

  // The backend enforces org-admin-only decide (`hitlGrants.assertOrgAdmin`);
  // this mirrors it so non-admins see the truth instead of a button that 403s.
  const role = useAuthStore((s) => s.user?.role);
  const canDecide = role === 'org_admin' || role === 'superadmin';

  const shell = (children: React.ReactNode) => (
    <Screen background="nebula" edges={{ top: true, bottom: false }}>
      <AppHeader title="Approval" showBack showOrgPill={false} />
      {children}
    </Screen>
  );

  if (query.isPending) {
    return shell(
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.accent} />
      </View>,
    );
  }

  if (query.isError) {
    return shell(
      <ErrorState
        message={query.error instanceof Error ? query.error.message : undefined}
        onRetry={query.refetch}
      />,
    );
  }

  if (!escalation) {
    return shell(
      <EmptyState
        icon={<Ionicons name="help-circle-outline" size={26} color={colors.fgMuted} />}
        title="Approval not found"
        description="This escalation may have been resolved or is no longer available."
      />,
    );
  }

  const projections = approval?.projections ?? [];
  // The spread of the estimates Prime showed at decision time: the best case is
  // tinted as the win, the worst as the exposure. Anything between stays quiet.
  const best = projections.length ? Math.max(...projections.map((p) => p.probability)) : 0;
  const worst = projections.length ? Math.min(...projections.map((p) => p.probability)) : 0;

  const pending = approval?.decision === 'pending';
  const submitting = decide.isPending ? decide.variables?.decision : undefined;

  const submit = (decision: 'approve' | 'reject') => {
    if (!id || decide.isPending) return;
    decide.mutate(
      // Biometric re-auth is not wired on mobile yet, so the receipt records
      // what actually happened: a password-authenticated session.
      { id, decision, authMethod: 'password' },
      { onSuccess: () => router.replace(`/(root)/approval-receipt/${id}` as never) },
    );
  };

  return shell(
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="pt-4">
        <ScreenHeading
          eyebrow={`${escalation.ref} · ${escalation.severity}`}
          title={escalation.title}
          subtitle={escalation.context || undefined}
        />
      </View>

      <Animated.View
        entering={FadeInDown.duration(340).delay(60)}
        className="mt-3 flex-row flex-wrap gap-2"
      >
        {escalation.impactAmount > 0 ? (
          <Tag label={riskLabel(escalation)} tone="danger" />
        ) : null}
        <Tag label={kindLabel(escalation.kind)} />
        {escalation.accountName ? <Tag label={escalation.accountName} /> : null}
      </Animated.View>

      {/* The record behind the ask: who it concerns, who raised it, and by when. */}
      <Animated.View entering={FadeInDown.duration(340).delay(120)} className="mt-5">
        <Card>
          <Text variant="mono.label" tone="subtle">
            Account
          </Text>
          <View className="mt-3 gap-2.5">
            {escalation.accountName ? (
              <DetailRow label="Account" value={escalation.accountName} />
            ) : null}
            {escalation.agentName ? (
              <DetailRow label="Agent" value={escalation.agentName} />
            ) : null}
            <DetailRow label="Raised" value={fmtRelative(escalation.createdAt)} />
            <DetailRow label="SLA due" value={fmtDateTime(escalation.slaDueAt)} />
          </View>
        </Card>
      </Animated.View>

      {approval?.action === TOOL_GRANT_ACTION ? (
        <Animated.View entering={FadeInDown.duration(340).delay(150)} className="mt-4">
          <ProposedActionCard approval={approval} />
        </Animated.View>
      ) : null}

      {approval ? (
        <Animated.View entering={FadeInDown.duration(340).delay(180)} className="mt-4">
          <Card variant="prime" gloss>
            <Text variant="mono.label" tone="accent">
              Prime · recommendation
            </Text>

            {approval.recommendation ? (
              <Text variant="body.md" className="mt-2.5">
                {approval.recommendation}
              </Text>
            ) : null}

            {projections.length ? (
              <View className="mt-4 gap-2.5">
                {projections.map((projection) => (
                  <View
                    key={projection.label}
                    className="flex-row items-center justify-between"
                  >
                    <Text variant="mono.sm" tone="subtle" className="flex-1 pr-3">
                      {projection.label}
                    </Text>
                    <Text
                      variant="mono.value"
                      tone={
                        projection.probability === best
                          ? 'success'
                          : projection.probability === worst
                            ? 'danger'
                            : 'muted'
                      }
                    >
                      {fmtPct(projection.probability * 100, 0)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
        </Animated.View>
      ) : null}

      {pending && !canDecide ? (
        // Read-only for org members: the decision is real work product, and the
        // backend would 403 the buttons anyway.
        <Animated.View entering={FadeInDown.duration(340).delay(240)} className="mt-5">
          <Card>
            <View className="flex-row items-center gap-2.5">
              <Ionicons name="lock-closed-outline" size={16} color={colors.fgMuted} />
              <Text variant="body.sm" tone="muted" className="flex-1">
                An organization admin decides this approval.
              </Text>
            </View>
          </Card>
        </Animated.View>
      ) : pending ? (
        <Animated.View entering={FadeInDown.duration(340).delay(240)} className="mt-5 gap-2.5">
          <GradientButton
            tone="success"
            fullWidth
            loading={submitting === 'approve'}
            disabled={decide.isPending}
            onPress={() => submit('approve')}
            leftIcon={<Ionicons name="checkmark" size={16} color="#FFFFFF" />}
          >
            Approve
          </GradientButton>
          <Button
            variant="outline-danger"
            fullWidth
            loading={submitting === 'reject'}
            disabled={decide.isPending}
            onPress={() => submit('reject')}
          >
            Reject
          </Button>
        </Animated.View>
      ) : approval ? (
        // Already answered — state the verdict rather than offering a control
        // that would 404 against an approval the backend has closed.
        <Animated.View entering={FadeInDown.duration(340).delay(240)} className="mt-5">
          <Tag
            label={
              approval.decidedAt
                ? `${approval.decision} · ${fmtDateTime(approval.decidedAt)}`
                : approval.decision
            }
            tone={approval.decision === 'approved' ? 'success' : 'danger'}
          />
        </Animated.View>
      ) : null}
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

/** A grant's lifecycle, phrased for the person deciding, not the state machine. */
const GRANT_STATUS_LABEL: Record<string, { label: string; tone: 'success' | 'danger' | undefined }> = {
  none: { label: 'awaiting decision', tone: undefined },
  issued: { label: 'grant issued', tone: 'success' },
  consumed: { label: 'action executed', tone: 'success' },
  expired: { label: 'grant expired', tone: 'danger' },
  revoked: { label: 'grant revoked', tone: 'danger' },
};

/** A frozen argument, rendered flat; nested shapes come through as compact JSON. */
function argValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '[unrenderable]';
  }
}

/**
 * What a HITL tool approval is actually asking: the gated tool and the exact
 * frozen arguments it will run with. Approving mints a one-time grant bound to
 * this payload's hash — the agent cannot swap arguments after the fact, which
 * is what makes showing them here meaningful.
 *
 * Values are server-redacted and re-redacted client-side before render.
 */
function ProposedActionCard({ approval }: { approval: Approval }) {
  const payload = (redactSensitiveDeep(approval.actionPayload) ?? {}) as Record<string, unknown>;
  const entries = Object.entries(payload);
  const status = approval.grantStatus ? GRANT_STATUS_LABEL[approval.grantStatus] : undefined;

  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <Text variant="mono.label" tone="subtle">
          Proposed action
        </Text>
        {status ? <Tag label={status.label} tone={status.tone} /> : null}
      </View>

      <View className="mt-3 gap-2.5">
        {approval.toolName ? <DetailRow label="Tool" value={approval.toolName} /> : null}
        {entries.map(([key, value]) => (
          <View key={key} className="flex-row items-start justify-between">
            <Text variant="mono.sm" tone="subtle" className="pr-3">
              {key}
            </Text>
            <Text variant="mono.value" className="flex-1 text-right" numberOfLines={3}>
              {argValue(value)}
            </Text>
          </View>
        ))}
        {approval.consumedAt ? (
          <DetailRow label="Executed" value={fmtDateTime(approval.consumedAt)} />
        ) : null}
      </View>
    </Card>
  );
}
