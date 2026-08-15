import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useThemeMode } from '@/hooks/useThemeMode';
import { fmtRelative } from '@/lib/formatters';
import type { ConversationFeedItem } from '@/api/services/conversationFeed';

/** 254 → "4m 14s"; keeps a call's length in the record line. */
function fmtDurationSec(sec?: number): string | null {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * One conversation in the feed: who it was with leads, which agent handled it
 * and how it ended are provenance (mono), and the summary is the sentence the
 * reader actually came for.
 */
export function ConversationRow({ item }: { item: ConversationFeedItem }) {
  const { colors } = useThemeMode();
  const duration = fmtDurationSec(item.durationSec);

  const provenance = [item.agentName, item.status, duration]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card padding="sm">
      <View className="flex-row items-center">
        <View
          className="h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: colors.surface2 }}
        >
          <Ionicons
            name={item.channel === 'email' ? 'mail-outline' : 'call-outline'}
            size={15}
            color={colors.accent2}
          />
        </View>
        <View className="ml-2.5 flex-1 min-w-0">
          <Text variant="body.semibold" numberOfLines={1}>
            {item.contact}
          </Text>
          <Text variant="mono.label" tone="subtle" numberOfLines={1} className="mt-0.5">
            {provenance}
          </Text>
        </View>
        <Text variant="mono.sm" tone="subtle" className="ml-2">
          {fmtRelative(item.date)}
        </Text>
      </View>

      {item.emailSubject ? (
        <Text variant="body.sm" numberOfLines={1} className="mt-2">
          {item.emailSubject}
        </Text>
      ) : null}

      {item.summary ? (
        <Text variant="body.sm" tone="muted" numberOfLines={2} className="mt-1.5">
          {item.summary}
        </Text>
      ) : null}
    </Card>
  );
}
