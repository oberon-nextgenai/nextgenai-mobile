import { ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';

interface SectionCardProps {
  /** Uppercase tracked caption above the card (10px). */
  label?: string;
  /** Bold heading inside the card (15px semibold). Replaces `title`. */
  heading?: string;
  /** Muted description below the heading (13px). */
  description?: string;
  /** @deprecated use `heading` */
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Reduces internal padding (used for tight tool-list sections). */
  dense?: boolean;
}

/**
 * Three-tier hierarchy:
 *   label   (caption, uppercase, 10px caps)
 *   heading (15px semibold, inside card)
 *   description (13px muted)
 */
export function SectionCard({
  label,
  heading,
  description,
  title,
  right,
  children,
  className,
  dense,
}: SectionCardProps) {
  const effectiveHeading = heading ?? title;
  return (
    <View className={cn('mb-4', className)}>
      {label ? (
        <Text variant="mono.label" tone="subtle" className="mb-2 px-1">
          {label}
        </Text>
      ) : null}
      <Card padding={dense ? 'sm' : 'md'}>
        {effectiveHeading || right ? (
          <View
            className={cn(
              'flex-row items-start justify-between',
              description ? 'mb-2' : 'mb-3',
            )}
          >
            {effectiveHeading ? (
              <View className="flex-1 pr-3">
                <Text variant="body.semibold">{effectiveHeading}</Text>
                {description ? (
                  <Text variant="body.sm" tone="muted" className="mt-1">
                    {description}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View />
            )}
            {right}
          </View>
        ) : null}
        {children}
      </Card>
    </View>
  );
}
