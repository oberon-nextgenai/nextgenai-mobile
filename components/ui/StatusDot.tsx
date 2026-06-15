import { View } from 'react-native';
import { cn } from '@/lib/cn';

export type AgentStatus = 'online' | 'busy' | 'away' | 'offline' | 'active' | 'inactive' | 'paused' | 'training' | string;

interface StatusDotProps {
  status?: AgentStatus;
  size?: number;
  className?: string;
}

function colorClass(status?: AgentStatus): string {
  switch (status) {
    case 'online':
    case 'active':
      return 'bg-success';
    case 'busy':
    case 'training':
      return 'bg-warning';
    case 'away':
    case 'paused':
      return 'bg-warning';
    case 'offline':
    case 'inactive':
      return 'bg-fg-subtle';
    default:
      return 'bg-fg-subtle';
  }
}

export function StatusDot({ status, size = 8, className }: StatusDotProps) {
  return (
    <View
      className={cn('rounded-full', colorClass(status), className)}
      style={{ width: size, height: size }}
    />
  );
}
