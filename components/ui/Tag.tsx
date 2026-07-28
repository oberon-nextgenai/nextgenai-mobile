import { View, ViewProps } from 'react-native';
import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/Text';
import { useThemeMode } from '@/hooks/useThemeMode';

export type TagTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

interface TagProps extends ViewProps {
  label: string;
  tone?: TagTone;
  className?: string;
}

/**
 * A small, non-interactive status chip — `COST +38%`, `SLA ON TRACK`, `NA-WEST`.
 *
 * Mono and uppercase, because these are machine facts about a record rather than
 * prose about it. That is also what distinguishes a Tag from a `Pill` (tappable,
 * sans, a control) and from a `Chip` (a filter). Reach for the right one:
 * a Tag never responds to a tap.
 */
export function Tag({ label, tone = 'neutral', className, style, ...rest }: TagProps) {
  const { colors } = useThemeMode();

  const palette: Record<TagTone, { bg: string; border: string }> = {
    neutral: { bg: colors.surface2, border: colors.border },
    accent: { bg: colors.accentSoft, border: colors.chipSelectedBorder },
    success: { bg: colors.successSoft, border: colors.success },
    warning: { bg: colors.warningSoft, border: colors.warning },
    danger: { bg: colors.dangerSoft, border: colors.danger },
  };

  const textTone = {
    neutral: 'muted',
    accent: 'accent',
    success: 'success',
    warning: 'warning',
    danger: 'danger',
  } as const;

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: palette[tone].bg,
          borderColor: palette[tone].border,
          borderWidth: 1,
        },
        style,
      ]}
      className={cn('self-start rounded-md px-2 py-1', className)}
    >
      <Text variant="mono.label" tone={textTone[tone]}>
        {label}
      </Text>
    </View>
  );
}
