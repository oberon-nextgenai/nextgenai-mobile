import { ReactNode } from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '@/lib/cn';
import { Elevation } from '@/constants/Colors';
import { useThemeMode } from '@/hooks/useThemeMode';

export type CardVariant = 'default' | 'prime' | 'raised' | 'plain';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends ViewProps {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  /**
   * Adds a specular sheen across the top of the card.
   *
   * Off by default: it costs an extra gradient layer, which is wasteful in a
   * list. Turn it on for hero surfaces — the morning brief, a run-in-progress
   * card, an approval — where the card is the thing you are looking at.
   */
  gloss?: boolean;
  /** Left severity rail, as on escalation and priority cards. Pass a colour. */
  rail?: string;
  className?: string;
}

const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

/**
 * The deck's card: a stepped surface, a hairline border, and a 16px radius.
 *
 * The detail that makes it read as *lit* rather than painted is the top border
 * being a shade lighter than the other three (`colors.borderGloss`). It implies a
 * light source above the surface, and unlike an overlay gradient it adds no views
 * — which is why every card can have it, including rows inside a list.
 */
export function Card({
  children,
  variant = 'default',
  padding = 'md',
  gloss = false,
  rail,
  className,
  style,
  ...rest
}: CardProps) {
  const { colors } = useThemeMode();

  const background: Record<CardVariant, string> = {
    default: colors.surface,
    prime: colors.surfacePrime,
    raised: colors.surface2,
    plain: 'transparent',
  };

  const borderStyle: ViewStyle =
    variant === 'plain'
      ? {}
      : {
          borderWidth: 1,
          borderColor: colors.border,
          borderTopColor: colors.borderGloss,
        };

  return (
    <View
      {...rest}
      style={[
        { backgroundColor: background[variant], borderRadius: 16, overflow: 'hidden' },
        borderStyle,
        variant === 'plain' ? undefined : Elevation.sm,
        style,
      ]}
      className={cn(className)}
    >
      {gloss ? (
        <LinearGradient
          colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          pointerEvents="none"
          // Only the top third — a sheen that falls off, not a wash over the card.
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 72 }}
        />
      ) : null}

      {rail ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, backgroundColor: rail }}
        />
      ) : null}

      <View className={cn(PADDING[padding], rail ? 'pl-4' : undefined)}>{children}</View>
    </View>
  );
}
