import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useThemeMode } from '@/hooks/useThemeMode';
import type { BriefingTone, OperationalBriefing } from '@/api/services/briefings';

interface OperationalBriefCardProps {
  briefing: OperationalBriefing;
  onAskPrime?: (prompt: string) => void;
  onOpenDashboard?: () => void;
}

/** Signed, because a bare "4" does not say whether the day got better or worse. */
export function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}

/** A zero movement is real information, but it is not good or bad news. */
export function deltaTone(delta: number): 'subtle' | 'success' | 'danger' {
  if (delta === 0) return 'subtle';
  return delta > 0 ? 'success' : 'danger';
}

function metaTone(tone: BriefingTone | undefined): 'subtle' | 'warning' | 'success' | 'danger' {
  switch (tone) {
    case 'warning':
      return 'warning';
    case 'positive':
      return 'success';
    case 'negative':
      return 'danger';
    default:
      return 'subtle';
  }
}

/**
 * One dashboard's morning read.
 *
 * Renders the envelope and nothing else — no dashboard-specific labels, no
 * knowledge of what a "queue" or a "check" is. That is the whole point: a new
 * dashboard's briefing appears here the day its backend provider ships, with no
 * mobile release.
 */
export function OperationalBriefCard({
  briefing,
  onAskPrime,
  onOpenDashboard,
}: OperationalBriefCardProps) {
  const { colors } = useThemeMode();
  const showActions = Boolean(onOpenDashboard || (onAskPrime && briefing.primePrompt));

  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <Text variant="mono.label" tone="subtle">
          {briefing.title}
        </Text>
        <Text variant="mono.label" tone="subtle">
          {briefing.date}
        </Text>
      </View>

      <Text variant="body.lg" className="mt-3">
        {briefing.headline}
      </Text>

      {briefing.stats.length > 0 ? (
        <View className="mt-4 flex-row flex-wrap gap-y-3">
          {briefing.stats.map((stat) => (
            <View key={stat.key} className="w-1/2">
              <Text variant="mono.label" tone="subtle">
                {stat.label}
              </Text>
              <View className="flex-row items-baseline gap-1.5">
                <Text variant="display.sm">{String(stat.value)}</Text>
                {stat.delta !== undefined ? (
                  <Text variant="mono.label" tone={deltaTone(stat.delta)}>
                    {formatDelta(stat.delta)}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {briefing.groups.map((group) => (
        <View key={group.key} className="mt-4">
          <Text variant="mono.label" tone="subtle">
            {group.label}
          </Text>
          {group.items.map((item) => (
            <View key={item.id} className="mt-2 flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text variant="body.md">{item.title}</Text>
                {item.subtitle ? (
                  <Text variant="body.sm" tone="muted">
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
              {item.meta ? (
                <Text variant="mono.label" tone={metaTone(item.tone)}>
                  {item.meta}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ))}

      {showActions ? (
        <View className="mt-4 flex-row gap-4">
          {onOpenDashboard ? (
            <Pressable onPress={onOpenDashboard} accessibilityRole="button">
              <Text variant="mono.label" tone="accent">
                Open dashboard
              </Text>
            </Pressable>
          ) : null}
          {onAskPrime && briefing.primePrompt ? (
            <Pressable
              onPress={() => onAskPrime(briefing.primePrompt as string)}
              accessibilityRole="button"
              className="flex-row items-center"
            >
              <Text variant="mono.label" tone="accent">
                Ask Prime
              </Text>
              <Ionicons
                name="arrow-forward"
                size={12}
                color={colors.accent}
                style={{ marginLeft: 4 }}
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
