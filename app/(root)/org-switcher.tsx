import { useQueryClient } from '@tanstack/react-query';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/IconButton';
import { useActiveOrg, useOrgStore } from '@/store/org';
import { cn } from '@/lib/cn';
import { useThemeMode } from '@/hooks/useThemeMode';

export default function OrgSwitcherScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { colors } = useThemeMode();
  const { organizations, activeOrgId } = useActiveOrg();
  const switchOrg = useOrgStore((s) => s.switchOrg);

  const handleSelect = async (orgId: string) => {
    if (orgId === activeOrgId) {
      router.back();
      return;
    }
    if (activeOrgId) {
      const stale = activeOrgId;
      qc.removeQueries({
        predicate: (q) => q.queryKey.some((k) => k === stale),
      });
    }
    await switchOrg(orgId);
    router.back();
  };

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle dark:border-border-dark-subtle">
        <Text
          className="text-fg dark:text-fg-dark-DEFAULT text-lg"
          style={{ fontFamily: 'Inter_600SemiBold' }}
        >
          Switch organization
        </Text>
        <IconButton icon="close" size={36} onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {organizations.length === 0 ? (
          <Text
            className="text-fg-muted dark:text-fg-dark-muted text-sm text-center mt-8"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            No organizations available for your account.
          </Text>
        ) : (
          organizations.map((o) => {
            const active = o._id === activeOrgId;
            return (
              <Pressable
                key={o._id}
                onPress={() => handleSelect(o._id)}
                className={cn(
                  'flex-row items-center bg-surface dark:bg-surface-dark border rounded-xl p-3 mb-2 active:bg-accent-soft dark:active:bg-accent-soft-dark',
                  active
                    ? 'border-accent dark:border-accent-dark'
                    : 'border-border dark:border-border-dark',
                )}
              >
                <Avatar name={o.name} size={36} />
                <Text
                  className="text-fg dark:text-fg-dark-DEFAULT text-sm flex-1 ml-3"
                  style={{ fontFamily: 'Inter_600SemiBold' }}
                >
                  {o.name}
                </Text>
                {active ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
