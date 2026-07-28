import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ScreenHeading } from '@/components/common/ScreenHeading';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { TimeWindowPicker } from '@/components/ui/TimeWindowPicker';
import { useDevices, useUpdateDevicePreferences } from '@/api/hooks/pushHooks';
import { NOTIFICATION_CLASSES, type Device, type NotificationClass } from '@/api/services/devices';
import { useThemeMode } from '@/hooks/useThemeMode';

/**
 * What each class actually means, in the reader's terms rather than the
 * system's. `critical` deliberately says it ignores quiet hours — a promise the
 * backend keeps (`QUIET_HOURS_EXEMPT`), and one worth stating so nobody silences
 * the app expecting silence and gets woken anyway.
 */
const CLASS_COPY: Record<
  NotificationClass,
  { label: string; description: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  critical: {
    label: 'Critical escalations',
    description: 'Decisions that need you now. Always delivered, including during quiet hours.',
    icon: 'alert-circle-outline',
  },
  cost: {
    label: 'Cost anomalies',
    description: 'An agent spending well above its forecast.',
    icon: 'trending-up-outline',
  },
  sla_risk: {
    label: 'SLA risk',
    description: 'A queue or item projected to breach.',
    icon: 'time-outline',
  },
  workflow: {
    label: 'Workflow failures',
    description: 'Runs that failed after exhausting retries.',
    icon: 'git-branch-outline',
  },
  brief: {
    label: 'Daily brief',
    description: 'Your morning read on the AI workforce.',
    icon: 'today-outline',
  },
};

/** Minutes from midnight → `22:00`. */
function formatMinute(minute?: number): string | null {
  if (minute == null || !Number.isFinite(minute)) return null;
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function NotificationPreferencesScreen() {
  const { colors } = useThemeMode();
  const devicesQuery = useDevices();
  const update = useUpdateDevicePreferences();

  // Preferences are per device. This screen edits the one you are holding —
  // identified as the most recently seen, which is the device that just
  // registered on launch.
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const device: Device | undefined = useMemo(() => {
    const list = devicesQuery.data ?? [];
    if (list.length === 0) return undefined;
    return list.find(d => d.pushToken === selectedToken) ?? list[0];
  }, [devicesQuery.data, selectedToken]);

  const shell = (children: React.ReactNode) => (
    <Screen background="nebula" edges={{ top: true, bottom: false }}>
      <AppHeader title="Notifications" showBack showOrgPill={false} />
      {children}
    </Screen>
  );

  if (devicesQuery.isPending) {
    return shell(
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.accent} />
      </View>,
    );
  }

  if (devicesQuery.isError) {
    return shell(
      <ErrorState
        message={
          devicesQuery.error instanceof Error ? devicesQuery.error.message : undefined
        }
        onRetry={devicesQuery.refetch}
      />,
    );
  }

  if (!device) {
    return shell(
      <EmptyState
        icon={<Ionicons name="notifications-off-outline" size={26} color={colors.fgMuted} />}
        title="This device isn't registered"
        description="Allow notifications when prompted, then reopen the app to register it."
      />,
    );
  }

  const toggleClass = (cls: NotificationClass, enabled: boolean) => {
    const next = enabled
      ? [...new Set([...device.enabledClasses, cls])]
      : device.enabledClasses.filter(c => c !== cls);

    update.mutate({ pushToken: device.pushToken, enabledClasses: next });
  };

  const quietFrom = formatMinute(device.quietHoursStartMinute);
  const quietTo = formatMinute(device.quietHoursEndMinute);
  const quietConfigured = !!quietFrom && !!quietTo;

  return shell(
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="pt-4">
        <ScreenHeading
          eyebrow={device.deviceName ? `This device · ${device.deviceName}` : 'This device'}
          title="What reaches you"
          subtitle="Preferences apply to this device only. Each of your devices can differ."
        />
      </View>

      {/* Master switch. Off means this device receives nothing at all. */}
      <Animated.View entering={FadeInDown.duration(300).delay(50)} className="mt-5">
        <Card gloss>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text variant="body.medium">Notifications on this device</Text>
              <Text variant="body.xs" tone="muted" className="mt-0.5">
                {device.enabled ? 'Delivering' : 'Nothing will be delivered here'}
              </Text>
            </View>
            <Switch
              value={device.enabled}
              onValueChange={enabled => update.mutate({ pushToken: device.pushToken, enabled })}
              trackColor={{ true: colors.accent, false: colors.border }}
              ios_backgroundColor={colors.border}
            />
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(300).delay(100)}>
        <Text variant="mono.label" tone="subtle" className="mb-2 mt-6 px-1">
          Types
        </Text>
        <Card padding="sm">
          {NOTIFICATION_CLASSES.map(cls => {
            const copy = CLASS_COPY[cls];
            const on = device.enabledClasses.includes(cls);

            return (
              <View key={cls} className="flex-row items-center px-3 py-3">
                <View
                  className="h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: colors.surface2 }}
                >
                  <Ionicons name={copy.icon} size={17} color={colors.accent2} />
                </View>
                <View className="ml-3 flex-1 pr-3">
                  <Text variant="body.medium">{copy.label}</Text>
                  <Text variant="body.xs" tone="muted" className="mt-0.5">
                    {copy.description}
                  </Text>
                </View>
                <Switch
                  value={on}
                  // The whole device being off makes a per-type switch meaningless.
                  disabled={!device.enabled}
                  onValueChange={enabled => toggleClass(cls, enabled)}
                  trackColor={{ true: colors.accent, false: colors.border }}
                  ios_backgroundColor={colors.border}
                />
              </View>
            );
          })}
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(300).delay(150)}>
        <Text variant="mono.label" tone="subtle" className="mb-2 mt-6 px-1">
          Quiet hours
        </Text>
        <Card>
          {quietConfigured ? (
            <>
              <View className="flex-row items-center justify-between">
                <Text variant="body.medium">Silenced</Text>
                <Text variant="mono.value">{`${quietFrom} – ${quietTo}`}</Text>
              </View>
              {device.timeZone ? (
                <Text variant="mono.sm" tone="subtle" className="mt-1">
                  {device.timeZone}
                </Text>
              ) : null}
              <Text variant="body.xs" tone="muted" className="mt-3">
                Critical escalations still come through. Everything else waits until morning.
              </Text>
              <View className="mt-4 flex-row gap-2.5">
                <View className="flex-1">
                  <Button variant="secondary" fullWidth onPress={() => setPickerOpen(true)}>
                    Change
                  </Button>
                </View>
                <View className="flex-1">
                  <Button
                    variant="ghost"
                    fullWidth
                    onPress={() =>
                      update.mutate({
                        pushToken: device.pushToken,
                        quietHoursStartMinute: undefined,
                        quietHoursEndMinute: undefined,
                      })
                    }
                  >
                    Turn off
                  </Button>
                </View>
              </View>
            </>
          ) : (
            <>
              <Text variant="body.medium">Not set</Text>
              <Text variant="body.xs" tone="muted" className="mt-1">
                Hold everything except critical escalations overnight.
              </Text>
              <View className="mt-4">
                <Button variant="secondary" onPress={() => setPickerOpen(true)}>
                  Set quiet hours
                </Button>
              </View>
            </>
          )}
        </Card>
      </Animated.View>

      {/* Other devices, so it is obvious these settings are not global. */}
      {(devicesQuery.data?.length ?? 0) > 1 ? (
        <Animated.View entering={FadeInDown.duration(300).delay(200)}>
          <Text variant="mono.label" tone="subtle" className="mb-2 mt-6 px-1">
            Your other devices
          </Text>
          <Card padding="sm">
            {devicesQuery.data
              ?.filter(d => d.pushToken !== device.pushToken)
              .map(d => (
                <View key={d.pushToken} className="flex-row items-center px-3 py-3">
                  <View className="flex-1 pr-3">
                    <Text variant="body.medium">{d.deviceName ?? d.platform}</Text>
                    <Text variant="mono.sm" tone="subtle" className="mt-0.5">
                      {d.enabled ? `${d.enabledClasses.length} types on` : 'Notifications off'}
                    </Text>
                  </View>
                  <Button variant="ghost" size="sm" onPress={() => setSelectedToken(d.pushToken)}>
                    Edit
                  </Button>
                </View>
              ))}
          </Card>
        </Animated.View>
      ) : null}

      <TimeWindowPicker
        visible={pickerOpen}
        // Defaults to 22:00–07:00 when unset — the window the backend documents
        // as the common case, and a sane starting point to adjust from.
        initialStart={device.quietHoursStartMinute ?? 22 * 60}
        initialEnd={device.quietHoursEndMinute ?? 7 * 60}
        onCancel={() => setPickerOpen(false)}
        onConfirm={(startMinute, endMinute) => {
          setPickerOpen(false);
          update.mutate({
            pushToken: device.pushToken,
            quietHoursStartMinute: startMinute,
            quietHoursEndMinute: endMinute,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
        }}
      />
    </ScrollView>,
  );
}
