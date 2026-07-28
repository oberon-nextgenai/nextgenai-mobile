import { ActivityIndicator, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { AuditReceiptCard } from '@/components/executive/AuditReceiptCard';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useEscalation } from '@/api/hooks/escalationHooks';
import { useActiveOrg } from '@/store/org';
import { useThemeMode } from '@/hooks/useThemeMode';
import { fmtDateTime } from '@/lib/formatters';
import type { ApprovalAuthMethod } from '@/api/services/escalations';

/** How the decider authenticated, spelled out for the record. */
const AUTH_METHOD_LABEL: Record<ApprovalAuthMethod, string> = {
  password: 'Password',
  sso: 'SSO',
  biometric_sso: 'Biometric + SSO',
  api_key: 'API key',
};

export default function ApprovalReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();

  const query = useEscalation(activeOrgId, id);
  const escalation = query.data?.escalation;
  const approval = query.data?.approval ?? null;

  const shell = (children: React.ReactNode) => (
    <Screen background="nebula">
      <AppHeader title="Audit record" showBack showOrgPill={false} showNotifications={false} />
      {children}
    </Screen>
  );

  const settled = !!approval && approval.decision !== 'pending';

  // The decision was just written; the detail query is being invalidated behind
  // this modal. Hold the spinner until the refetch lands rather than flashing
  // "no decision recorded" at someone who just made one.
  if (query.isPending || (!settled && query.isFetching)) {
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

  if (!escalation || !approval || !settled) {
    return shell(
      <EmptyState
        icon={<Ionicons name="document-text-outline" size={26} color={colors.fgMuted} />}
        title="No decision recorded"
        description="There is no audit record for this escalation yet."
        action={
          <Button variant="secondary" onPress={() => router.back()}>
            Done
          </Button>
        }
      />,
    );
  }

  // The button said "Approve", so the receipt says "Approved".
  const verdict = approval.decision === 'approved' ? 'Approved' : 'Rejected';

  const reverseUntil = approval.reverseWindowEndsAt;
  const reversible = !!reverseUntil && new Date(reverseUntil).getTime() > Date.now();

  return shell(
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* The verdict, asserted once and centred. */}
      <Animated.View entering={FadeInDown.duration(340)} className="items-center pt-8 pb-6">
        <Ionicons name="checkmark-circle" size={46} color={colors.success} />
        <Text variant="display.lg" className="mt-3 text-center">
          {verdict}
        </Text>
        <Text variant="body.sm" tone="muted" className="mt-2 text-center">
          Your decision has been recorded.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(340).delay(80)}>
        <AuditReceiptCard
          action={approval.action}
          reference={escalation.ref}
          // Drives the card's accent, icon, and actor label — so a rejection
          // reads "Rejected by", not "Approved by".
          decision={approval.decision === 'rejected' ? 'rejected' : 'approved'}
          // Left undefined when absent: the card omits the row entirely rather
          // than printing a blank into an audit record.
          decidedBy={approval.decidedByEmail ?? approval.decidedBy}
          authMethod={approval.authMethod ? AUTH_METHOD_LABEL[approval.authMethod] : undefined}
          tenant={escalation.organizationId}
          timestamp={approval.decidedAt ? fmtDateTime(approval.decidedAt) : undefined}
          policy={approval.policyRef}
          auditId={approval.auditId}
        />
      </Animated.View>

      {/* Stated, not offered: there is no reverse endpoint to call. */}
      {reversible ? (
        <Animated.View entering={FadeInDown.duration(340).delay(140)} className="mt-4 px-1">
          <Text variant="mono.label" tone="warning">
            {`This decision can still be reversed until ${fmtDateTime(reverseUntil)}`}
          </Text>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.duration(340).delay(200)} className="mt-6">
        <Button variant="secondary" fullWidth onPress={() => router.back()}>
          Done
        </Button>
      </Animated.View>
    </ScrollView>,
  );
}
