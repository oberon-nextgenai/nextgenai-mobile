import { useState } from 'react';
import { Platform, View } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { fetchVapidPublicKey, registerDevice } from '@/api/services/devices';
import { subscribeWebPush, webNotificationPermission } from '@/lib/push/webPush';
import { deviceLabel } from '@/lib/push/pushTokens';
// DEMO ONLY — DO NOT MERGE: the fixture build must never show a permission
// prompt mid-presentation.
import { DEMO_APPROVALS } from '@/api/demo/flags';
import { useThemeMode } from '@/hooks/useThemeMode';

/**
 * The web build's one-time "turn on push" affordance.
 *
 * Browsers only allow the notification-permission prompt from a user gesture,
 * so the silent registration path (`usePushRegistration`) can never ask — this
 * card is where asking happens. It renders exactly while asking is possible
 * and meaningful: on web, permission still `'default'`, demo fixtures off.
 * After the user answers — either way — the card's moment has passed;
 * a granted permission hands the job back to the silent path on next launch.
 */
export function EnableNotificationsCard({ organizationId }: { organizationId: string }) {
  const { colors } = useThemeMode();
  const [visible, setVisible] = useState(
    () => Platform.OS === 'web' && !DEMO_APPROVALS && webNotificationPermission() === 'default',
  );
  const [busy, setBusy] = useState(false);

  if (!visible) return null;

  const enable = async () => {
    setBusy(true);
    const result = await subscribeWebPush({
      getVapidPublicKey: fetchVapidPublicKey,
      requestPermission: true,
    });
    if (result.ok) {
      try {
        await registerDevice({
          organizationId,
          platform: 'web',
          webPushSubscription: result.subscription,
          appVersion: Constants.expoConfig?.version,
          deviceName: deviceLabel() ?? 'Web browser',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      } catch {
        // The subscription is live in the browser; the silent path re-registers
        // it on the next launch, so a failed round trip is not worth a banner.
      }
    }
    setBusy(false);
    setVisible(false);
  };

  return (
    <View className="px-4 pt-4">
      <Card>
        <View className="flex-row items-center gap-3">
        <Ionicons name="notifications-outline" size={22} color={colors.accent} />
          <View className="flex-1">
            <Text variant="body.md">Get notified of new approvals</Text>
            <Text variant="body.sm" tone="muted">
              Pushes open the approval, even with this tab in the background.
            </Text>
          </View>
        </View>
        <View className="mt-3">
          <Button variant="secondary" onPress={enable} loading={busy} fullWidth>
            Enable notifications
          </Button>
        </View>
      </Card>
    </View>
  );
}
