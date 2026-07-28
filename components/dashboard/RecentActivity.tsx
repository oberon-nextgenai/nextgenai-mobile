import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useNotifications } from '@/store/notifications';
import { fmtRelative } from '@/lib/formatters';
import { useThemeMode } from '@/hooks/useThemeMode';

export function RecentActivity({ limit = 6 }: { limit?: number }) {
  const router = useRouter();
  // Select the raw array (stable reference); slice in the component body so the
  // selector doesn't return a fresh array on every render and loop forever.
  const allItems = useNotifications((s) => s.items);
  const markRead = useNotifications((s) => s.markRead);
  const items = useMemo(() => allItems.slice(0, limit), [allItems, limit]);
  const { colors } = useThemeMode();

  if (items.length === 0) {
    return (
      <Card padding="md" className="items-center">
        <Ionicons name="sparkles-outline" size={18} color={colors.fgSubtle} />
        <Text variant="body.sm" tone="muted" className="mt-2 text-center">
          No recent activity yet. Prime tool results show up here.
        </Text>
      </Card>
    );
  }

  return (
    <Card padding="none">
      {items.map((n, idx) => (
        <Pressable
          key={n.id}
          onPress={() => {
            markRead(n.id);
            if (n.deepLink) router.push(n.deepLink as never);
          }}
          className={
            'flex-row items-start px-3 py-3 ' +
            (idx < items.length - 1
              ? 'border-b border-border-subtle dark:border-border-dark-subtle'
              : '')
          }
        >
          <View className="w-7 h-7 rounded-full bg-accent-soft dark:bg-accent-soft-dark items-center justify-center mt-0.5 mr-3">
            <Ionicons
              name={
                n.type === 'prime'
                  ? 'flash-outline'
                  : n.type === 'analytics'
                    ? 'bar-chart-outline'
                    : 'information-circle-outline'
              }
              size={13}
              color={colors.accent}
            />
          </View>
          <View className="flex-1">
            <Text variant="body.medium" numberOfLines={1}>
              {n.title}
            </Text>
            {n.body ? (
              <Text variant="body.xs" tone="muted" numberOfLines={2} className="mt-0.5">
                {n.body}
              </Text>
            ) : null}
            <Text variant="mono.sm" tone="subtle" className="mt-1">
              {fmtRelative(new Date(n.timestamp).toISOString())}
            </Text>
          </View>
          {!n.read ? (
            <View className="w-1.5 h-1.5 rounded-full bg-accent dark:bg-accent-dark mt-1.5 ml-2" />
          ) : null}
        </Pressable>
      ))}
    </Card>
  );
}
