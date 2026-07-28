import { View } from 'react-native';
import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/Text';

interface AvatarProps {
  name?: string | null;
  size?: 24 | 28 | 32 | 36 | 44 | 56;
  className?: string;
}

/**
 * Deterministic but muted palette so avatars feel consistent and serious.
 * These are categorical identities (like ChannelColors), not theme roles — an
 * avatar keeps its colour in both light and dark, so they stay literal here.
 */
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

/** Initial size tracks the circle, so the role is spread and the size pinned. */
const TEXT_SIZE: Record<number, number> = {
  24: 10,
  28: 11,
  32: 12,
  36: 14,
  44: 16,
  56: 18,
};

export function Avatar({ name, size = 36, className }: AvatarProps) {
  const bg = name ? hashColor(name) : '#64748B';
  return (
    <View
      className={cn('rounded-full items-center justify-center', className)}
      style={{ width: size, height: size, backgroundColor: bg }}
    >
      <Text variant="body.semibold" tone="onAccent" style={{ fontSize: TEXT_SIZE[size] ?? 14 }}>
        {initials(name)}
      </Text>
    </View>
  );
}
