import { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/Text';

interface ScreenHeadingProps {
  /** Mono uppercase line above the title — AI WORKFORCE · MSH INC. */
  eyebrow?: string;
  /** The serif line. Short and declarative: "14 active agents". */
  title: string;
  /** Optional second serif line, as on the brief's two-line greeting. */
  titleSecondLine?: string;
  /** Sans supporting line beneath. */
  subtitle?: string;
  /** Trailing control — a filter button, a count, an action. */
  right?: ReactNode;
  /** Entrance stagger position. Set to `null` to render without animation. */
  delay?: number | null;
  className?: string;
}

/**
 * The title block every screen in the deck opens with: a mono eyebrow that says
 * where you are, a serif line that says what is true, and an optional sans line
 * that explains it.
 *
 * Having this as one component is what keeps thirty screens consistent — the
 * hierarchy is decided once here rather than re-derived per screen.
 */
export function ScreenHeading({
  eyebrow,
  title,
  titleSecondLine,
  subtitle,
  right,
  delay = 0,
  className,
}: ScreenHeadingProps) {
  const body = (
    <View className={cn('flex-row items-start justify-between', className)}>
      <View className="flex-1 pr-3">
        {eyebrow ? (
          <Text variant="mono.label" tone="subtle" numberOfLines={1}>
            {eyebrow}
          </Text>
        ) : null}

        <Text variant="display.lg" className={eyebrow ? 'mt-2' : undefined}>
          {title}
        </Text>
        {titleSecondLine ? <Text variant="display.lg">{titleSecondLine}</Text> : null}

        {subtitle ? (
          <Text variant="body.sm" tone="muted" className="mt-2">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View className="pt-1">{right}</View> : null}
    </View>
  );

  if (delay === null) return body;
  return <Animated.View entering={FadeInDown.duration(340).delay(delay)}>{body}</Animated.View>;
}
