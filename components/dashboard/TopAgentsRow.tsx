import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { useAgentsAnalytics } from '@/api/hooks/analyticsHooks';
import { useActiveOrg } from '@/store/org';
import { useThemeMode } from '@/hooks/useThemeMode';

export function TopAgentsRow() {
  const router = useRouter();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const q = useAgentsAnalytics(activeOrgId);

  const top = (q.data ?? [])
    .slice()
    .sort((a, b) => (b.totalCalls ?? 0) - (a.totalCalls ?? 0))
    .slice(0, 3);

  if (q.isPending || top.length === 0) return null;

  return (
    <View className="bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-dark-subtle rounded-xl p-3">
      <View className="flex-row items-center justify-between mb-2 px-1">
        <Text
          className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          Top agents this week
        </Text>
        <Pressable onPress={() => router.push('/(root)/(tabs)/agents' as never)}>
          <Text
            className="text-accent dark:text-accent-dark text-[11px]"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            View all
          </Text>
        </Pressable>
      </View>
      {top.map((a, idx) => {
        const name = a.agentName ?? 'Unknown';
        const successPct =
          a.successRate != null
            ? `${Number(a.successRate).toFixed(0)}%`
            : '—';
        return (
          <Pressable
            key={a.agentId}
            onPress={() => {
              if (a.agentId) {
                router.push(`/(root)/(tabs)/agents/${a.agentId}` as never);
              }
            }}
            className={
              'flex-row items-center px-1 py-2 ' +
              (idx < top.length - 1
                ? 'border-b border-border-subtle dark:border-border-dark-subtle'
                : '')
            }
          >
            <Avatar name={name} size={32} />
            <View className="flex-1 ml-3">
              <Text
                className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                style={{ fontFamily: 'Inter_500Medium' }}
                numberOfLines={1}
              >
                {name}
              </Text>
              <Text
                className="text-fg-muted dark:text-fg-dark-muted text-[11px] mt-0.5"
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                {a.totalCalls ?? 0} calls · {successPct} success
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.fgSubtle} />
          </Pressable>
        );
      })}
    </View>
  );
}
