import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { useNotifications, type AppNotification } from '@/store/notifications';
import { fmtRelative } from '@/lib/formatters';
import { cn } from '@/lib/cn';
import { useThemeMode } from '@/hooks/useThemeMode';

const ICON_BY_TYPE: Record<AppNotification['type'], keyof typeof Ionicons.glyphMap> = {
  prime: 'sparkles',
  analytics: 'pulse',
  system: 'information-circle',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const items = useNotifications((s) => s.items);
  const markRead = useNotifications((s) => s.markRead);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const clear = useNotifications((s) => s.clear);

  const right =
    items.length > 0 ? <IconButton icon="trash-outline" size={36} onPress={clear} /> : undefined;

  return (
    <Screen>
      <AppHeader
        title="Notifications"
        showBack
        showOrgPill={false}
        showNotifications={false}
        right={right}
      />
      {items.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="notifications-off-outline" size={28} color={colors.accent} />}
          title="No notifications yet"
          description="Tool results from Prime and live analytics events will appear here."
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {items.some((i) => !i.read) ? (
            <Pressable
              onPress={markAllRead}
              className="self-end bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-full px-3 py-1.5 mb-3"
            >
              <Text
                className="text-fg-muted dark:text-fg-dark-muted text-xs"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                Mark all as read
              </Text>
            </Pressable>
          ) : null}
          {items.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => {
                markRead(n.id);
                if (n.deepLink) router.push(n.deepLink as never);
              }}
              className={cn(
                'flex-row items-start bg-surface dark:bg-surface-dark border rounded-xl p-3 mb-2',
                n.read
                  ? 'border-border dark:border-border-dark'
                  : 'border-accent/40 dark:border-accent-dark/40',
              )}
            >
              <View className="w-8 h-8 rounded-lg bg-accent-soft dark:bg-accent-soft-dark items-center justify-center mr-3 mt-0.5">
                <Ionicons name={ICON_BY_TYPE[n.type]} size={15} color={colors.accent} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text
                    className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                    style={{ fontFamily: 'Inter_600SemiBold' }}
                  >
                    {n.title}
                  </Text>
                  <Text
                    className="text-fg-subtle dark:text-fg-dark-subtle text-[10px] ml-2"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  >
                    {fmtRelative(n.timestamp)}
                  </Text>
                </View>
                {n.body ? (
                  <Text
                    className="text-fg-muted dark:text-fg-dark-muted text-xs mt-0.5"
                    style={{ fontFamily: 'Inter_400Regular' }}
                    numberOfLines={3}
                  >
                    {n.body}
                  </Text>
                ) : null}
              </View>
              {!n.read ? (
                <View className="w-2 h-2 rounded-full bg-accent ml-2 mt-2" />
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
