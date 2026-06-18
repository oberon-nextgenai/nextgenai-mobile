import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { MoreMenuRow } from '@/components/executive/MoreMenuRow';
import { CommandSearchButton } from '@/components/executive/CommandSearchButton';

function GroupLabel({ children }: { children: string }) {
  return (
    <Text
      className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest mb-2 mt-5 px-1"
      style={{ fontFamily: 'Inter_500Medium' }}
    >
      {children}
    </Text>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const go = (path: string) => () => router.push(path as never);

  return (
    <Screen background="nebula" edges={{ top: true, bottom: false }}>
      <AppHeader
        title="More"
        right={<CommandSearchButton onPress={go('/(root)/command-search')} />}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <GroupLabel>Insights</GroupLabel>
        <View className="gap-2">
          <MoreMenuRow
            icon="bar-chart-outline"
            label="Analytics & Outcomes"
            description="Resolution, intervention, cost"
            onPress={go('/(root)/(tabs)/analytics')}
          />
          <MoreMenuRow
            icon="grid-outline"
            label="Dashboard"
            description="Operational overview"
            onPress={go('/(root)/(tabs)/dashboard')}
          />
        </View>

        <GroupLabel>Manage</GroupLabel>
        <View className="gap-2">
          <MoreMenuRow
            icon="people-outline"
            label="Agents"
            description="Create and configure agents"
            onPress={go('/(root)/(tabs)/agents')}
          />
          <MoreMenuRow
            icon="extension-puzzle-outline"
            label="Plugins"
            description="Integrations & marketplace"
            onPress={go('/(root)/plugins')}
          />
          <MoreMenuRow
            icon="megaphone-outline"
            label="Campaigns"
            onPress={go('/(root)/campaigns')}
          />
          <MoreMenuRow
            icon="library-outline"
            label="Knowledge Bases"
            onPress={go('/(root)/knowledge-bases')}
          />
        </View>

        <GroupLabel>Governance</GroupLabel>
        <View className="gap-2">
          <MoreMenuRow
            icon="shield-checkmark-outline"
            label="Security"
            description="2FA, sessions, password"
            onPress={go('/(root)/security')}
          />
          <MoreMenuRow
            icon="business-outline"
            label="Organization"
            description="Switch active workspace"
            onPress={go('/(root)/org-switcher')}
          />
          <MoreMenuRow
            icon="receipt-outline"
            label="Audit & Approvals"
            description="Coming soon"
            tone="muted"
            trailing="none"
          />
        </View>

        <GroupLabel>Account</GroupLabel>
        <View className="gap-2">
          <MoreMenuRow
            icon="notifications-outline"
            label="Notifications"
            onPress={go('/(root)/notifications')}
          />
          <MoreMenuRow
            icon="settings-outline"
            label="Settings"
            description="Profile, appearance, biometrics"
            onPress={go('/(root)/(tabs)/settings')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
