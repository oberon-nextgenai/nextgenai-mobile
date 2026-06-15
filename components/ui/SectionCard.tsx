import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { cn } from '@/lib/cn';
import { Elevation } from '@/constants/Colors';

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
        <Text
          className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest mb-2 px-1"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={Elevation.sm}
        className={cn(
          'bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-3xl',
          dense ? 'p-3' : 'p-4',
        )}
      >
        {effectiveHeading || right ? (
          <View
            className={cn(
              'flex-row items-start justify-between',
              description ? 'mb-2' : 'mb-3',
            )}
          >
            {effectiveHeading ? (
              <View className="flex-1 pr-3">
                <Text
                  className="text-fg dark:text-fg-dark-DEFAULT text-[15px]"
                  style={{ fontFamily: 'Inter_600SemiBold' }}
                >
                  {effectiveHeading}
                </Text>
                {description ? (
                  <Text
                    className="text-fg-muted dark:text-fg-dark-muted text-[13px] mt-1"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  >
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
      </View>
    </View>
  );
}
