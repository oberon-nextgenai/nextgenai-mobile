import { useRouter } from 'expo-router';
import { useNotifications } from '@/store/notifications';
import { IconButton } from '@/components/ui/IconButton';

export function NotificationBell() {
  const router = useRouter();
  const unread = useNotifications((s) => s.items.filter((i) => !i.read).length);

  return (
    <IconButton
      icon="notifications-outline"
      size={36}
      badge={unread > 0}
      onPress={() => router.push('/notifications' as never)}
    />
  );
}
