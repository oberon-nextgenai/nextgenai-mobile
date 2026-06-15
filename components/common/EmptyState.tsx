import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { cn } from '@/lib/cn';

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
      <Text
        className="text-fg dark:text-fg-dark-DEFAULT text-base text-center"
        style={{ fontFamily: 'Inter_600SemiBold' }}
      >
        {title}
      </Text>
      {description ? (
        <Text
          className="text-fg-muted dark:text-fg-dark-muted text-[13px] text-center mt-1.5 max-w-[280px]"
          style={{ fontFamily: 'Inter_400Regular' }}
        >
          {description}
        </Text>
      ) : null}
      {action ? <View className="mt-5">{action}</View> : null}
    </View>
  );
}
