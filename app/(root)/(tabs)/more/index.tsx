import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/common/Screen';
import { MoreMenuRow } from '@/components/executive/MoreMenuRow';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { fmtCurrency, fmtNumber } from '@/lib/formatters';
import { useThemeMode } from '@/hooks/useThemeMode';
import { useAuthStore } from '@/store/auth';
import { useActiveOrg } from '@/store/org';
import { useNotifications } from '@/store/notifications';
import { useEscalationCounts } from '@/api/hooks/escalationHooks';
import { useWorkforce } from '@/api/hooks/executiveHooks';
import { useDashboard } from '@/api/hooks/analyticsHooks';

/**
 * Nothing new here — this screen is a menu, and a menu should be legible before
 * it is interesting. The existing stagger was five blocks 60ms apart at 340ms
 * each, which kept the last group moving until ~580ms; that is long enough to
 * read as a cascade rather than as the page arriving. Retimed to a 25ms beat at
 * 240ms, so the whole list is settled inside ~340ms.
 */
const BEAT = 25;
const enter = (step: number) => FadeInDown.duration(240).delay(step * BEAT);

/** The window every live figure in this menu is measured over. */
const SPEND_PERIOD = '30d';
const SPEND_LABEL = 'last 30 days';

function GroupLabel({ children }: { children: string }) {
  return (
    <Text variant="mono.label" tone="subtle" className="mb-2 mt-6 px-1">
      {children}
    </Text>
  );
}

/** Initials for the avatar. Falls back to the email when there is no name. */
function initials(name?: string, email?: string): string {
  const source = name?.trim() || email?.split('@')[0] || '';
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '·';
  return (parts[0]![0]! + (parts[1]?.[0] ?? '')).toUpperCase();
}

/**
 * The tab sitting underneath the menu.
 *
 * The deck highlights the row you are currently on. This screen is a tab rather
 * than an overlay, so the only honest reading of "currently on" is the tab the
 * close button hands you back to. It is read from the tab navigator's own
 * history when the menu takes focus, and left undefined whenever that cannot be
 * read — a highlight on the wrong row is worse than no highlight at all.
 */
function useTabBeneath(): string | undefined {
  const navigation = useNavigation();
  const [name, setName] = useState<string>();

  useFocusEffect(
    useCallback(() => {
      const state = navigation.getParent()?.getState();
      const history = state?.history;
      if (!state || !Array.isArray(history) || history.length < 2) return;
      const previous = history[history.length - 2] as { key?: unknown } | undefined;
      const key = typeof previous?.key === 'string' ? previous.key : undefined;
      setName(key ? state.routes.find((r) => r.key === key)?.name : undefined);
    }, [navigation]),
  );

  return name;
}

export default function MoreScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const user = useAuthStore(s => s.user);
  const { activeOrgId, active } = useActiveOrg();
  const unread = useNotifications(s => s.unreadCount());
  // Same cached counts the tab badge reads — the menu answers "what needs me?"
  // before you tap anything.
  const escalations = useEscalationCounts(activeOrgId);
  // The fleet size the Workforce screen itself reports, so the row and the
  // screen it opens never disagree.
  const workforce = useWorkforce(activeOrgId);
  // One dashboard read covers both depth rows: spend for Outcomes, volume for
  // Analytics. Its own cache key, so it does not disturb either screen.
  const dashboard = useDashboard(activeOrgId, SPEND_PERIOD);

  const beneath = useTabBeneath();
  const go = (path: string) => () => router.push(path as never);

  // A tab has no drawer to dismiss, so "close" is a genuine back. When there is
  // nothing behind it — a cold deep link straight onto More — fall through to
  // the app's home destination rather than leave a dead control.
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(root)/(tabs)/brief' as never);
  };

  const displayName = user?.name?.trim() || user?.email || 'Signed in';
  const affiliation = [user?.role, active?.name].filter(Boolean).join(' · ');

  const pending = escalations.data?.total;
  const metrics = dashboard.data?.metrics;

  return (
    <Screen background="nebula" edges={{ top: true, bottom: false }}>
      <View className="flex-row items-center justify-between px-4 pb-1 pt-3">
        <Text variant="mono.label" tone="subtle">
          MENU
        </Text>
        <IconButton
          icon="close"
          size={32}
          variant="ghost"
          onPress={close}
          accessibilityLabel="Close menu"
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Who you are signed in as, and where. Tapping it opens your profile. */}
        <Animated.View entering={enter(0)} className="mt-3">
          <Pressable
            onPress={go('/(root)/(tabs)/settings')}
            accessibilityRole="button"
            accessibilityLabel={`${displayName}. Open settings`}
          >
            <Card gloss>
              <View className="flex-row items-center">
                <View
                  className="h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.accentSoft }}
                >
                  <Text variant="body.semibold" tone="accent">
                    {initials(user?.name, user?.email)}
                  </Text>
                </View>
                <View className="ml-3 flex-1 min-w-0">
                  <Text variant="display.sm" numberOfLines={1}>
                    {displayName}
                  </Text>
                  {affiliation ? (
                    <Text variant="mono.label" tone="subtle" numberOfLines={1} className="mt-1">
                      {affiliation}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.fgSubtle} />
              </View>
            </Card>
          </Pressable>
        </Animated.View>

        {/* The five destinations the tab bar carries, restated so the menu is a
            complete map of the product rather than a drawer of leftovers. */}
        <Animated.View entering={enter(1)} className="mt-6">
          <Card padding="sm">
            <MoreMenuRow
              icon="today-outline"
              label="Brief"
              description="Today's read"
              active={beneath === 'brief'}
              onPress={go('/(root)/(tabs)/brief')}
            />
            <MoreMenuRow
              icon="sparkles-outline"
              label="Prime Command"
              description="Ask · brief · plan"
              active={beneath === 'prime'}
              onPress={go('/(root)/(tabs)/prime')}
            />
            <MoreMenuRow
              icon="checkmark-circle-outline"
              label="Approvals"
              description={
                pending != null ? `${pending} awaiting decision` : 'Decisions waiting on you'
              }
              badge={pending ? String(pending) : undefined}
              active={beneath === 'approvals'}
              onPress={go('/(root)/(tabs)/approvals')}
            />
            <MoreMenuRow
              icon="people-outline"
              label="AI Workforce"
              description={
                workforce.isPending || workforce.isError
                  ? 'Agents, health, and performance'
                  : `${workforce.summary.total} active agents`
              }
              active={beneath === 'workforce'}
              onPress={go('/(root)/(tabs)/workforce')}
            />
          </Card>
        </Animated.View>

        {/* Depth: the surfaces you go to when the brief raises a question. */}
        <Animated.View entering={enter(2)} className="mt-3">
          <Card padding="sm">
            <MoreMenuRow
              icon="trending-up-outline"
              label="Outcomes"
              description={
                metrics?.totalCost != null
                  ? `${fmtCurrency(metrics.totalCost)} spend · ${SPEND_LABEL}`
                  : 'What the workforce achieved, and at what cost'
              }
              onPress={go('/(root)/outcomes')}
            />
            <MoreMenuRow
              icon="bar-chart-outline"
              label="Analytics"
              description={
                metrics?.totalCalls != null
                  ? `${fmtNumber(metrics.totalCalls)} calls · ${SPEND_LABEL}`
                  : 'Calls · agents · trends'
              }
              active={beneath === 'analytics'}
              onPress={go('/(root)/(tabs)/analytics')}
            />
            <MoreMenuRow
              icon="grid-outline"
              label="Dashboard"
              description="Operational overview"
              active={beneath === 'dashboard'}
              onPress={go('/(root)/(tabs)/dashboard')}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={enter(3)}>
          <GroupLabel>WORKSPACE</GroupLabel>
          <Card padding="sm">
            <MoreMenuRow
              icon="hardware-chip-outline"
              label="Agents"
              description="Create and configure"
              active={beneath === 'agents'}
              onPress={go('/(root)/(tabs)/agents')}
            />
            <MoreMenuRow
              icon="megaphone-outline"
              label="Campaigns"
              description="Voice · email · SMS"
              onPress={go('/(root)/campaigns')}
            />
            <MoreMenuRow
              icon="extension-puzzle-outline"
              label="Plugins"
              description="Integrations · marketplace"
              onPress={go('/(root)/plugins')}
            />
            <MoreMenuRow
              icon="library-outline"
              label="Knowledge bases"
              description="Documents agents can read"
              onPress={go('/(root)/knowledge-bases')}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={enter(4)}>
          <GroupLabel>GOVERNANCE</GroupLabel>
          <Card padding="sm">
            <MoreMenuRow
              icon="shield-checkmark-outline"
              label="Security"
              description="2FA · password · sessions"
              onPress={go('/(root)/security')}
            />
            <MoreMenuRow
              icon="business-outline"
              label="Organization"
              description={active?.name ? `Active · ${active.name}` : 'Switch workspace'}
              onPress={go('/(root)/org-switcher')}
            />
            {/* Same destination as the Approvals row above, entered for its
                record rather than its queue — so it carries no count. */}
            <MoreMenuRow
              icon="receipt-outline"
              label="Approvals & audit"
              description="Every decision and its receipt"
              onPress={go('/(root)/(tabs)/approvals')}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={enter(5)}>
          <GroupLabel>ACCOUNT</GroupLabel>
          <Card padding="sm">
            <MoreMenuRow
              icon="notifications-outline"
              label="Notifications"
              description={unread > 0 ? `${unread} unread` : 'All caught up'}
              badge={unread > 0 ? String(unread) : undefined}
              onPress={go('/(root)/notifications')}
            />
            <MoreMenuRow
              icon="settings-outline"
              label="Settings"
              description="Profile · appearance · biometrics"
              active={beneath === 'settings'}
              onPress={go('/(root)/(tabs)/settings')}
            />
          </Card>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
