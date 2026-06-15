import { Text, View } from 'react-native';
import { cn } from '@/lib/cn';

interface AvatarProps {
  name?: string | null;
  size?: 24 | 28 | 32 | 36 | 44 | 56;
  className?: string;
}

// Deterministic but muted palette so avatars feel consistent and serious.
const PALETTE = [
  '#1E3A8A', // indigo
  '#2563EB', // steel blue
  '#15803D', // forest green
  '#B45309', // amber
  '#7C3AED', // purple
  '#0891B2', // cyan
  '#BE185D', // rose
];

function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (h << 5) - h + name.charCodeAt(i);
    h |= 0;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function initials(name?: string | null): string {
  if (!name) return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const TEXT_SIZE: Record<number, string> = {
  24: 'text-[10px]',
  28: 'text-[11px]',
  32: 'text-xs',
  36: 'text-sm',
  44: 'text-base',
  56: 'text-lg',
};

export function Avatar({ name, size = 36, className }: AvatarProps) {
  const bg = name ? hashColor(name) : '#64748B';
  return (
    <View
      className={cn('rounded-full items-center justify-center', className)}
      style={{ width: size, height: size, backgroundColor: bg }}
    >
      <Text
        className={cn('text-white font-semibold', TEXT_SIZE[size] ?? 'text-sm')}
        style={{ fontFamily: 'Inter_600SemiBold' }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}
