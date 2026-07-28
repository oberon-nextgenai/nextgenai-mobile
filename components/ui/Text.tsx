import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { cssInterop } from 'nativewind';
import { Type } from '@/constants/Typography';
import { useThemeMode } from '@/hooks/useThemeMode';

/**
 * The app's only text primitive.
 *
 * Every string in the product goes through here so the three-family split
 * (serif = the answer, sans = the explanation, mono = the provenance) is enforced
 * by the type system instead of by 355 hand-written `fontFamily` strings.
 *
 *   import { Text } from '@/components/ui/Text';   // not from 'react-native'
 *
 *   <Text variant="display.lg">Good morning, Sara.</Text>
 *   <Text variant="mono.label" tone="subtle">Fleet health</Text>
 *   <Text variant="body.md" tone="muted">{description}</Text>
 *
 * Colour is a `tone`, never a raw value — that is what keeps light and dark in
 * step, and what makes a palette change a one-file edit.
 */

type DisplayVariant = `display.${keyof typeof Type.display}`;
type BodyVariant = `body.${keyof typeof Type.body}`;
type MonoVariant = `mono.${keyof typeof Type.mono}`;

export type TextVariant = DisplayVariant | BodyVariant | MonoVariant;

export type TextTone =
  | 'default'
  | 'muted'
  | 'subtle'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'inverse'
  /** For text sitting on an accent or gradient fill. */
  | 'onAccent';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
}

function resolveVariant(variant: TextVariant) {
  const [group, key] = variant.split('.') as [keyof typeof Type, string];
  const styles = Type[group] as Record<string, object>;
  return styles[key] ?? Type.body.md;
}

export function Text({ variant = 'body.md', tone = 'default', style, ...rest }: TextProps) {
  const { colors } = useThemeMode();

  const color: string = {
    default: colors.fg,
    muted: colors.fgMuted,
    subtle: colors.fgSubtle,
    accent: colors.accent2,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    inverse: colors.fgInverse,
    onAccent: '#FFFFFF',
  }[tone];

  // Variant first so an explicit `style` (and any className NativeWind has
  // already folded into it) can still override — spacing utilities are the
  // common case, and a caller who reaches for `text-danger` means it.
  return <RNText {...rest} style={StyleSheet.compose({ ...resolveVariant(variant), color }, style)} />;
}

/**
 * NativeWind only converts `className` for components it knows about. Without
 * this registration, `<Text className="mt-2">` would silently do nothing —
 * the kind of failure that is invisible in review and obvious on device.
 */
cssInterop(Text, { className: 'style' });
