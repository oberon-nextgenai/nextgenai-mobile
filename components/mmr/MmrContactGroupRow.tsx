import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useThemeMode } from '@/hooks/useThemeMode';
import { MMR_STATUS_LABEL, type MmrContactGroup, type MmrGroupStatus } from '@/api/services/mmr';

interface MmrContactGroupRowProps {
  group: MmrContactGroup;
  onPress: () => void;
}

/** Status → the colour that carries it, so the list scans without reading. */
function statusColor(
  status: MmrGroupStatus | undefined,
  colors: ReturnType<typeof useThemeMode>['colors'],
): string {
  switch (status) {
    case 'completed':
      return colors.success;
    case 'in-progress':
      return colors.accent;
    case 'failed':
      return colors.danger;
    case 'cant_collect':
      return colors.warning;
    default:
      return colors.fgSubtle;
  }
}

/**
 * One customer contact and the meters they owe.
 *
 * Shows what decides the next action: which channel is being used, how many
 * attempts have been spent, and how many of their meters are in. A bounced
 * email is called out because it silently rules out the primary channel — the
 * group looks merely slow otherwise.
 */
export function MmrContactGroupRow({ group, onPress }: MmrContactGroupRowProps) {
  const { colors } = useThemeMode();

  const status = group.status ?? 'pending';
  const meters = group.meterSerials?.length ?? group.totalCount ?? 0;
  const done = group.completedCount ?? 0;
  const attempts = group.attemptsCount ?? 0;

  return (
    <Pressable onPress={onPress} className="mb-2 active:opacity-80">
      <Card padding="sm">
        <View className="flex-row items-start">
          <View
            className="h-1.5 w-1.5 rounded-full mt-1.5 mr-2.5"
            style={{ backgroundColor: statusColor(status, colors) }}
          />

          <View className="flex-1">
            <View className="flex-row items-center justify-between">
              <Text variant="body.medium" numberOfLines={1} className="flex-1 mr-2">
                {group.contactName?.trim() || 'Unnamed contact'}
              </Text>
              <Text variant="mono.label" tone="muted">
                {MMR_STATUS_LABEL[status]}
              </Text>
            </View>

            <Text variant="body.xs" tone="muted" numberOfLines={1} className="mt-0.5">
              {group.preferredChannel === 'phone'
                ? group.contactPhone || 'No phone on file'
                : group.contactEmail || 'No email on file'}
            </Text>

            <View className="mt-1.5 flex-row items-center flex-wrap gap-x-3">
              <Text variant="mono.label" tone="subtle">
                {done}/{meters} meters
              </Text>
              <View className="flex-row items-center">
                <Ionicons
                  name={group.preferredChannel === 'phone' ? 'call-outline' : 'mail-outline'}
                  size={10}
                  color={colors.fgSubtle}
                />
                <Text variant="mono.label" tone="subtle" className="ml-1">
                  {attempts} {attempts === 1 ? 'attempt' : 'attempts'}
                </Text>
              </View>
              {group.emailBounced ? (
                <View className="flex-row items-center">
                  <Ionicons name="warning-outline" size={10} color={colors.warning} />
                  <Text variant="mono.label" tone="warning" className="ml-1">
                    Bounced
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={14}
            color={colors.fgSubtle}
            style={{ marginTop: 2 }}
          />
        </View>
      </Card>
    </Pressable>
  );
}
