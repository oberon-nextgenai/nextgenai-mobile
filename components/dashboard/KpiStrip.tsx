import { Text, View } from 'react-native';
import { cn } from '@/lib/cn';
import { Elevation } from '@/constants/Colors';

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
          <View
            style={Elevation.sm}
            className={cn(
              'bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-dark-subtle rounded-3xl p-3',
            )}
          >
            <Text
              className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest"
              style={{ fontFamily: 'Inter_500Medium' }}
              numberOfLines={1}
            >
              {t.label}
            </Text>
            <Text
              className="text-fg dark:text-fg-dark-DEFAULT text-xl mt-1"
              style={{ fontFamily: 'Inter_700Bold' }}
              numberOfLines={1}
            >
              {t.value}
            </Text>
            {t.hint ? (
              <Text
                className="text-fg-subtle dark:text-fg-dark-subtle text-[11px] mt-0.5"
                style={{ fontFamily: 'Inter_400Regular' }}
                numberOfLines={1}
              >
                {t.hint}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}
