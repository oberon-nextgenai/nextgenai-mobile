import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/cn';
import type { ToolCallRecord } from '@/api/hooks/chatHooks';
import { useThemeMode } from '@/hooks/useThemeMode';

interface ToolCallBadgeProps {
  tool: ToolCallRecord;
}

export function ToolCallBadge({ tool }: ToolCallBadgeProps) {
  const router = useRouter();
  const { colors } = useThemeMode();
  const isPending = tool.status === 'pending';
  const isError = tool.status === 'error';
  const iconColor = isError
    ? colors.danger
    : isPending
      ? colors.fgMuted
      : colors.success;

  return (
    <Pressable
      onPress={() => {
        if (tool.status !== 'pending') {
          router.push(`/tool-result/${tool.id}`);
        }
      }}
      disabled={isPending}
      className={cn(
        'flex-row items-center self-start rounded-md px-2 py-1 mb-1.5 border',
        isPending && 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark',
        isError && 'bg-danger-soft border-danger/40',
        tool.status === 'success' && 'bg-success-soft border-success/40',
      )}
    >
      {isPending ? (
        <ActivityIndicator size="small" color={colors.fgMuted} />
      ) : (
        <Ionicons
          name={isError ? 'alert-circle' : 'checkmark-circle'}
          size={12}
          color={iconColor}
        />
      )}
      <Text
        className={cn(
          'text-[11px] ml-1.5 uppercase tracking-wider',
          isError ? 'text-danger' : isPending ? 'text-fg-muted dark:text-fg-dark-muted' : 'text-success',
        )}
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        {tool.name}
      </Text>
      {!isPending ? (
        <Ionicons
          name="chevron-forward"
          size={10}
          color={iconColor}
          style={{ marginLeft: 4, opacity: 0.7 }}
        />
      ) : null}
    </Pressable>
  );
}
