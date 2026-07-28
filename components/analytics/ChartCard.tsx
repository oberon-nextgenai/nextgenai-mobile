import { ReactNode } from 'react';
import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}

export function ChartCard({ title, subtitle, right, children }: ChartCardProps) {
  return (
    <Card padding="md">
      <View className="flex-row items-center justify-between mb-3">
        <View>
          <Text variant="display.sm">{title}</Text>
          {subtitle ? (
            <Text variant="body.sm" tone="muted" className="mt-0.5">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
      <View>{children}</View>
    </Card>
  );
}
