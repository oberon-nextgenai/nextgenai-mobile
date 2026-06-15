import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Elevation } from '@/constants/Colors';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}

export function ChartCard({ title, subtitle, right, children }: ChartCardProps) {
  return (
    <View
      style={Elevation.sm}
      className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-3xl p-4"
    >
      <View className="flex-row items-center justify-between mb-3">
        <View>
          <Text
            className="text-fg dark:text-fg-dark-DEFAULT text-sm"
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              className="text-fg-muted dark:text-fg-dark-muted text-xs mt-0.5"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
      <View>{children}</View>
    </View>
  );
}
