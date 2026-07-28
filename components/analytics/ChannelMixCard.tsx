import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { ChannelColors } from '@/constants/Colors';
import { useThemeMode } from '@/hooks/useThemeMode';
import {
  CHANNEL_LABEL,
  CHANNEL_UNIT,
  type ChannelMix,
  type ChannelMixChannel,
} from '@/api/services/channelMix';

const CHANNEL_ICON: Record<ChannelMixChannel, keyof typeof Ionicons.glyphMap> = {
  calls: 'call',
  email: 'mail',
  sms: 'chatbox',
  whatsapp: 'logo-whatsapp',
  teams: 'people',
};

interface ChannelMixCardProps {
  data: ChannelMix;
}

/**
 * Where the work happened, by channel.
 *
 * Two things this card is careful about, because the data is:
 *
 * 1. **A channel absent from `channels` is not zero.** The backend omits any
 *    channel it cannot count rather than reporting `0`, so an absent row means
 *    "we don't know" and a `0` row means "we counted, there were none". Rendering
 *    a placeholder row for the missing ones would erase that distinction.
 * 2. **The unit is not uniform.** Voice and email count messages; SMS, WhatsApp
 *    and Teams count conversations with activity in the window. The footnote says
 *    so, because five bars side by side otherwise imply five comparable numbers.
 */
export function ChannelMixCard({ data }: ChannelMixCardProps) {
  const { colors } = useThemeMode();

  if (data.channels.length === 0) return null;

  // Share is of the counted total, which is what the bars can honestly compare.
  const total = data.channels.reduce((sum, c) => sum + c.count, 0);
  const rows = [...data.channels].sort((a, b) => b.count - a.count);

  const units = new Set(rows.map(r => CHANNEL_UNIT[r.channel]));
  const mixedUnits = units.size > 1;

  return (
    <Card gloss>
      <Text variant="mono.label" tone="subtle">
        Channel mix
      </Text>

      <View className="mt-3 gap-3">
        {rows.map(row => {
          const tint = ChannelColors[row.channel];
          const share = total > 0 ? row.count / total : 0;

          return (
            <View key={row.channel}>
              <View className="flex-row items-center">
                <Ionicons name={CHANNEL_ICON[row.channel]} size={14} color={tint} />
                <Text variant="body.sm" className="ml-2 flex-1">
                  {CHANNEL_LABEL[row.channel]}
                </Text>
                <Text variant="body.semibold">{row.count.toLocaleString()}</Text>
                {row.aiHandledPct != null ? (
                  <Text variant="mono.label" tone="subtle" className="ml-2">
                    {`${Math.round(row.aiHandledPct)}% AI`}
                  </Text>
                ) : null}
              </View>

              <View
                className="mt-1.5 h-1 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: colors.surface2 }}
                accessibilityRole="progressbar"
                accessibilityLabel={`${CHANNEL_LABEL[row.channel]}: ${row.count} of ${total}`}
              >
                <View
                  style={{
                    width: `${Math.max(share * 100, share > 0 ? 2 : 0)}%`,
                    backgroundColor: tint,
                    height: '100%',
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>

      {mixedUnits ? (
        <Text variant="mono.sm" tone="subtle" className="mt-3">
          Calls and email count messages; SMS, WhatsApp and Teams count conversations.
        </Text>
      ) : null}
    </Card>
  );
}
