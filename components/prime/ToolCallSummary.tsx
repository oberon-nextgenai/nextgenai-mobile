import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/cn';
import { useThemeMode } from '@/hooks/useThemeMode';
import { ToolCallBadge } from './ToolCallBadge';
import type { ToolCallRecord } from '@/api/hooks/chatHooks';

interface ToolCallSummaryProps {
  tools: ToolCallRecord[];
}

/**
 * Collapsed view of a high-fanout Prime turn (≥3 tool calls). One compact
 * row showing the aggregate result. Tap to expand to the existing per-tool
 * badge list — no information lost, just folded by default.
 */
export function ToolCallSummary({ tools }: ToolCallSummaryProps) {
  const { colors } = useThemeMode();
  const [expanded, setExpanded] = useState(false);

  const errored = tools.some((t) => t.status === 'error');
  const tone: 'success' | 'danger' | 'neutral' = errored ? 'danger' : 'success';

  const iconColor = tone === 'danger' ? colors.danger : colors.success;
  const bg =
    tone === 'danger'
      ? 'bg-danger-soft border-danger/40'
      : 'bg-success-soft border-success/40';
  const textColor =
    tone === 'danger' ? 'text-danger' : 'text-success';

  return (
    <View className="mb-1.5">
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        className={cn(
          'flex-row items-center self-start rounded-md px-2.5 py-1.5 border',
          bg,
        )}
      >
        <Ionicons
          name={errored ? 'alert-circle' : 'checkmark-circle'}
          size={12}
          color={iconColor}
        />
        <Text
          className={cn(
            'text-[11px] ml-1.5 uppercase tracking-wider',
            textColor,
          )}
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          Used {tools.length} tools
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={11}
          color={iconColor}
          style={{ marginLeft: 6, opacity: 0.7 }}
        />
      </Pressable>

      {expanded ? (
        <View className="mt-1.5 flex-row flex-wrap gap-1.5">
          {tools.map((t) => (
            <ToolCallBadge key={t.id} tool={t} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
