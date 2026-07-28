import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
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
    <Card padding="sm">
      <View className="flex-row items-center justify-between mb-2 px-1">
        <Text variant="mono.label" tone="muted">
          Top agents this week
        </Text>
        <Pressable onPress={() => router.push('/(root)/(tabs)/agents' as never)}>
          <Text variant="body.sm" tone="accent">
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
              <Text variant="body.medium" numberOfLines={1}>
                {name}
              </Text>
              <Text variant="mono.sm" tone="muted" className="mt-0.5">
                {a.totalCalls ?? 0} calls · {successPct} success
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.fgSubtle} />
          </Pressable>
        );
      })}
    </Card>
  );
}
