import { useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { toolLabel } from '@/lib/prime/toolLabels';
import { useThemeMode } from '@/hooks/useThemeMode';
import type { ToolCallRecord } from '@/api/hooks/chatHooks';

interface PrimeToolPanelProps {
  /** The streaming turn's tool calls, in the order Prime issued them. */
  tools: ToolCallRecord[];
  /**
   * The latest `status` SSE message. Rendered as the trailing in-flight row —
   * the deck's "Preparing recommendation…".
   */
  statusMessage?: string;
}

/** Milliseconds between rows in the opening stagger. */
const STAGGER = 60;
const ROW_DURATION = 240;

type RowState = 'pending' | 'success' | 'error';

interface Row {
  key: string;
  label: string;
  state: RowState;
}

/**
 * A single step. Its own component so each row owns one `entering` animation
 * and nothing above it re-animates when a new step arrives.
 */
function StepRow({
  row,
  delay,
  animate,
}: {
  row: Row;
  delay: number;
  animate: boolean;
}) {
  const { colors } = useThemeMode();

  const icon =
    row.state === 'success' ? (
      <Ionicons name="checkmark" size={13} color={colors.successBright} />
    ) : row.state === 'error' ? (
      <Ionicons name="alert-circle" size={13} color={colors.danger} />
    ) : animate ? (
      <ActivityIndicator size="small" color={colors.accent2} />
    ) : (
      // Reduce-motion: a hollow ring holds the same slot as the spinner, so the
      // in-flight step is still distinguishable without anything rotating.
      <View
        style={{
          width: 9,
          height: 9,
          borderRadius: 5,
          borderWidth: 1.4,
          borderColor: colors.accent2,
        }}
      />
    );

  return (
    <Animated.View
      entering={animate ? FadeInDown.duration(ROW_DURATION).delay(delay) : undefined}
      className="flex-row items-center py-[3px]"
      accessibilityRole="text"
      accessibilityLabel={`${row.label}, ${row.state === 'pending' ? 'in progress' : row.state}`}
    >
      {/* Fixed gutter so every label starts on the same x, whatever the glyph. */}
      <View className="w-4 items-center justify-center">{icon}</View>
      <Text
        variant="mono.sm"
        tone={row.state === 'error' ? 'danger' : row.state === 'success' ? 'muted' : 'default'}
        className="ml-2 flex-1"
        numberOfLines={2}
      >
        {row.label}
      </Text>
    </Animated.View>
  );
}

/**
 * The deck's `PRIME · WORKING` panel — the app's signature moment.
 *
 *   PRIME · WORKING
 *   ✓ Reading agent logs
 *   ✓ Checking escalation queue
 *   ◌ Preparing recommendation…
 *
 * Replaces the single-line "Prime is thinking" indicator whenever a turn has
 * actual work to show. Each tool call is one row: a green check once it lands, a
 * spinner while it is in flight, red and an alert glyph if it failed. The step
 * text is mono — this is a record of work, not prose — and mutes once done, so
 * the eye lands on whatever is still running.
 *
 * ## Motion
 * Rows enter with `FadeInDown`, staggered `STAGGER` ms apart, but only for the
 * rows present on first paint. A step that arrives later is already separated in
 * time by the network, so it enters immediately — a delay there would read as
 * lag rather than as rhythm. `useReducedMotion` drops the entrance animations
 * and swaps the spinner for a static ring.
 */
export function PrimeToolPanel({ tools, statusMessage }: PrimeToolPanelProps) {
  const reduceMotion = useReducedMotion();
  const animate = !reduceMotion;

  // The same first-paint guard Sparkline and CountUp use: capture how many rows
  // existed on mount so the opening stagger applies to those and nothing else.
  const initialCount = useRef<number | null>(null);
  if (initialCount.current === null) {
    initialCount.current = tools.length;
  }

  const rows: Row[] = tools.map((tool) => ({
    key: tool.id,
    label: toolLabel(tool.name),
    state: tool.status,
  }));

  const trailing = statusMessage?.trim();
  if (trailing) {
    rows.push({ key: 'status', label: `${trailing.replace(/[.…]+$/, '')}…`, state: 'pending' });
  }

  if (rows.length === 0) return null;

  return (
    // A message row, never a hero surface — no gloss.
    <Card padding="sm">
      {/* Run state, not prose — the deck's mono eyebrow. */}
      <Text variant="mono.label" tone="subtle" className="mb-2">
        Prime · Working
      </Text>
      {rows.map((row, i) => (
        <StepRow
          key={row.key}
          row={row}
          delay={i < (initialCount.current ?? 0) ? i * STAGGER : 0}
          animate={animate}
        />
      ))}
    </Card>
  );
}
