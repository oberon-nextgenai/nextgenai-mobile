import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { MoreMenuRow } from '@/components/executive/MoreMenuRow';
import { CommandSearchButton } from '@/components/executive/CommandSearchButton';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useThemeMode } from '@/hooks/useThemeMode';
import { useAuthStore } from '@/store/auth';
import { useActiveOrg } from '@/store/org';
import { useNotifications } from '@/store/notifications';
import { useEscalationCounts } from '@/api/hooks/escalationHooks';

/**
 * Nothing new here — this screen is a menu, and a menu should be legible before
 * it is interesting. The existing stagger was five blocks 60ms apart at 340ms
 * each, which kept the last group moving until ~580ms; that is long enough to
 * read as a cascade rather than as the page arriving. Retimed to a 25ms beat at
 * 240ms, so the whole list is settled inside ~340ms.
 */
const BEAT = 25;
const enter = (step: number) => FadeInDown.duration(240).delay(step * BEAT);

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

export default function MoreScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const user = useAuthStore(s => s.user);
  const { activeOrgId, active } = useActiveOrg();
  const unread = useNotifications(s => s.unreadCount());
  // Same cached counts the tab badge reads — the menu answers "what needs me?"
  // before you tap anything.
  const escalations = useEscalationCounts(activeOrgId);

  const go = (path: string) => () => router.push(path as never);

  const displayName = user?.name?.trim() || user?.email || 'Signed in';
  const affiliation = [user?.role, active?.name].filter(Boolean).join(' · ');

  return (
    <Screen background="nebula" edges={{ top: true, bottom: false }}>
      <AppHeader title="More" right={<CommandSearchButton onPress={go('/(root)/command-search')} />} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Who you are signed in as, and where. */}
        <Animated.View entering={enter(0)} className="mt-4">
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
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={enter(1)}>
          <GroupLabel>Insights</GroupLabel>
          <Card padding="sm">
            <MoreMenuRow
              icon="trending-up-outline"
              label="Outcomes"
              description="What the workforce achieved, and at what cost"
              onPress={go('/(root)/outcomes')}
            />
            <MoreMenuRow
              icon="bar-chart-outline"
              label="Analytics"
              description="Calls · agents · trends"
              onPress={go('/(root)/(tabs)/analytics')}
            />
            <MoreMenuRow
              icon="grid-outline"
              label="Dashboard"
              description="Operational overview"
              onPress={go('/(root)/(tabs)/dashboard')}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={enter(2)}>
          <GroupLabel>Manage</GroupLabel>
          <Card padding="sm">
            <MoreMenuRow
              icon="people-outline"
              label="Agents"
              description="Create and configure"
              onPress={go('/(root)/(tabs)/agents')}
            />
            <MoreMenuRow
              icon="extension-puzzle-outline"
              label="Plugins"
              description="Integrations · marketplace"
              onPress={go('/(root)/plugins')}
            />
            <MoreMenuRow
              icon="megaphone-outline"
              label="Campaigns"
              description="Voice · email · SMS"
              onPress={go('/(root)/campaigns')}
            />
            <MoreMenuRow
              icon="library-outline"
              label="Knowledge bases"
              description="Documents agents can read"
              onPress={go('/(root)/knowledge-bases')}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={enter(3)}>
          <GroupLabel>Governance</GroupLabel>
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
            <MoreMenuRow
              icon="receipt-outline"
              label="Approvals & audit"
              description={
                escalations.data
                  ? `${escalations.data.total} awaiting decision`
                  : 'Decisions and their audit trail'
              }
              badge={
                escalations.data && escalations.data.total > 0
                  ? String(escalations.data.total)
                  : undefined
              }
              onPress={go('/(root)/(tabs)/approvals')}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={enter(4)}>
          <GroupLabel>Account</GroupLabel>
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
              onPress={go('/(root)/(tabs)/settings')}
            />
          </Card>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
