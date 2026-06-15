import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
      <View className="bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-dark-subtle rounded-xl p-4 items-center">
        <Ionicons name="sparkles-outline" size={18} color={colors.fgSubtle} />
        <Text
          className="text-fg-muted dark:text-fg-dark-muted text-[13px] mt-2 text-center"
          style={{ fontFamily: 'Inter_400Regular' }}
        >
          No recent activity yet. Prime tool results show up here.
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-dark-subtle rounded-xl overflow-hidden">
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
            <Text
              className="text-fg dark:text-fg-dark-DEFAULT text-sm"
              style={{ fontFamily: 'Inter_500Medium' }}
              numberOfLines={1}
            >
              {n.title}
            </Text>
            {n.body ? (
              <Text
                className="text-fg-muted dark:text-fg-dark-muted text-xs mt-0.5"
                style={{ fontFamily: 'Inter_400Regular' }}
                numberOfLines={2}
              >
                {n.body}
              </Text>
            ) : null}
            <Text
              className="text-fg-subtle dark:text-fg-dark-subtle text-[11px] mt-1"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {fmtRelative(new Date(n.timestamp).toISOString())}
            </Text>
          </View>
          {!n.read ? (
            <View className="w-1.5 h-1.5 rounded-full bg-accent dark:bg-accent-dark mt-1.5 ml-2" />
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}
