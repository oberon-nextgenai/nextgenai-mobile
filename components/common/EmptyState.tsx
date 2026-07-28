import { ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/Text';

type Variant = 'neutral' | 'accent';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: Variant;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'neutral',
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      {icon ? (
        <View
          className={cn(
            'mb-4 items-center justify-center rounded-full w-14 h-14',
            variant === 'accent'
              ? 'bg-accent-soft dark:bg-accent-soft-dark'
              : 'bg-surface-2 dark:bg-surface-2-dark',
          )}
        >
          {icon}
        </View>
      ) : null}
      <Text variant="display.sm" className="text-center">
        {title}
      </Text>
      {description ? (
        <Text variant="body.sm" tone="muted" className="text-center mt-2 max-w-[280px]">
          {description}
        </Text>
      ) : null}
      {action ? <View className="mt-5">{action}</View> : null}
    </View>
  );
}
