import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { StatusDot } from '@/components/ui/StatusDot';
import { ProviderChip } from '@/components/ui/ProviderChip';
import { Text } from '@/components/ui/Text';
import { useThemeMode } from '@/hooks/useThemeMode';
import type { Agent } from '@/api/services/types';

interface AgentRowProps {
  agent: Agent;
  onPress: () => void;
}

function describe(agent: Agent): string {
  if (agent.description?.trim()) return agent.description.trim();
  if (agent.agentType) return agent.agentType;
  if (agent.type) return agent.type;
  return 'Agent';
}

function statusLabel(agent: Agent): string {
  switch (agent.status) {
    case 'active':
      return 'Online';
    case 'inactive':
      return 'Offline';
    case 'paused':
      return 'Away';
    case 'training':
      return 'Busy';
    default:
      return agent.status ?? 'Offline';
  }
}

export function AgentRow({ agent, onPress }: AgentRowProps) {
  const { colors } = useThemeMode();
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3 mb-2 active:bg-accent-soft dark:active:bg-accent-soft-dark"
    >
      <Avatar name={agent.name} size={36} />
      <View className="flex-1 mx-3">
        <Text variant="body.semibold" numberOfLines={1}>
          {agent.name}
        </Text>
        <Text variant="body.xs" tone="muted" numberOfLines={1} className="mt-0.5">
          {describe(agent)}
        </Text>
      </View>
      <View className="items-end gap-1">
        <ProviderChip provider={agent.provider ?? agent.agentType} />
        <View className="flex-row items-center">
          <StatusDot status={agent.status} />
          {/* Status is a machine fact about the agent, so it reads as mono. */}
          <Text variant="mono.label" tone="muted" className="ml-1.5">
            {statusLabel(agent)}
          </Text>
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={14}
        color={colors.fgSubtle}
        style={{ marginLeft: 8 }}
      />
    </Pressable>
  );
}
