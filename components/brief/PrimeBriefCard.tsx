import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { GradientButton } from '@/components/ui/GradientButton';
import { deltaTone, formatDelta } from '@/components/brief/OperationalBriefCard';
import { useThemeMode } from '@/hooks/useThemeMode';
import type { OperationalBriefing } from '@/api/services/briefings';

interface PrimeBriefCardProps {
  /**
   * Prime's own read of the workforce. The card falls back to this whenever the
   * workspace has no dashboard briefing — which is the common case, and must
   * stay the case while the briefings query is in flight or has failed.
   */
  summary: string;
  /** The workspace's primary dashboard briefing, when it has one. */
  briefing?: OperationalBriefing;
  /** Prompt is the briefing's, verbatim — undefined opens Prime cold. */
  onAskPrime: (prompt?: string) => void;
  onOpenDashboard: () => void;
}

/** Four is what fits two rows without the grid becoming the card. */
const MAX_STATS = 4;

/**
 * The morning brief — one card, not two.
 *
 * Prime's overnight read and the workspace's dashboard briefing are the same
 * statement about the same morning, so they share a surface: Prime's eyebrow and
 * CTA, the dashboard's headline and numbers. With no briefing this degrades to
 * exactly the hero that shipped before it existed.
 *
 * Every operational string here comes off the payload — `headline`, `stats[].label`.
 * The component knows nothing about what any given dashboard measures, which is
 * what lets a new provider appear the day its backend ships.
 */
export function PrimeBriefCard({
  summary,
  briefing,
  onAskPrime,
  onOpenDashboard,
}: PrimeBriefCardProps) {
  const { colors } = useThemeMode();

  // A card served from the 06:00 precomputed run is not live, and saying so
  // would be a lie told every morning. With no briefing at all, the hero is
  // Prime reading the workforce as of now — genuinely live.
  const live = !briefing || briefing.cached === false;
  const stats = briefing?.stats.slice(0, MAX_STATS) ?? [];

  return (
    <Card variant="prime" gloss>
      <View className="flex-row items-center justify-between">
        <Text variant="mono.label" tone="accent">
          Prime · Morning brief
        </Text>
        <View className="flex-row items-center">
          {briefing ? (
            <Text variant="mono.label" tone="muted" className={live ? 'mr-2' : undefined}>
              {briefing.date}
            </Text>
          ) : null}
          {live ? (
            <View className="flex-row items-center">
              <View
                className="h-1.5 w-1.5 rounded-full mr-1.5"
                style={{ backgroundColor: colors.successBright }}
              />
              <Text variant="mono.label" tone="success">
                Live
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Text variant="body.lg" className="mt-3">
        {briefing ? briefing.headline : summary}
      </Text>

      {stats.length > 0 ? (
        <View className="mt-4 flex-row flex-wrap gap-y-3">
          {stats.map((stat) => (
            <View key={stat.key} className="w-1/2">
              <Text variant="mono.label" tone="muted">
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

      <View className="mt-4 flex-row items-center gap-4">
        <GradientButton
          onPress={() => onAskPrime(briefing?.primePrompt)}
          rightIcon={<Ionicons name="arrow-forward" size={16} color="#FFFFFF" />}
        >
          Ask Prime
        </GradientButton>
        {briefing ? (
          <Pressable onPress={onOpenDashboard} accessibilityRole="button">
            <Text variant="mono.label" tone="accent">
              Open dashboard
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}
