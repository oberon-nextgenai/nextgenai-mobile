import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';

export interface KpiTile {
  label: string;
  value: string;
  hint?: string;
}

interface KpiStripProps {
  tiles: KpiTile[];
}

export function KpiStrip({ tiles }: KpiStripProps) {
  return (
    <View className="flex-row flex-wrap -mx-1">
      {tiles.map((t, i) => (
        <View key={i} className="w-1/2 px-1 mb-2">
          <Card padding="sm">
            <Text variant="mono.label" tone="muted" numberOfLines={1}>
              {t.label}
            </Text>
            <Text variant="display.md" numberOfLines={1} className="mt-1">
              {t.value}
            </Text>
            {t.hint ? (
              <Text variant="mono.sm" tone="subtle" numberOfLines={1} className="mt-0.5">
                {t.hint}
              </Text>
            ) : null}
          </Card>
        </View>
      ))}
    </View>
  );
}
