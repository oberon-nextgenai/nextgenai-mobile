import { Text, View } from 'react-native';
import { cn } from '@/lib/cn';

interface ProviderChipProps {
  provider?: string | null;
  className?: string;
}

function normalize(provider?: string | null): string | null {
  if (!provider) return null;
  const p = provider.toLowerCase();
  if (p.includes('vapi')) return 'VAPI';
  if (p.includes('retell')) return 'Retell';
  if (p.includes('elevenlabs')) return 'ElevenLabs';
  if (p.includes('azure')) return 'Azure';
  if (p.includes('aws')) return 'AWS';
  if (p.includes('google')) return 'Google';
  return provider;
}

export function ProviderChip({ provider, className }: ProviderChipProps) {
  const label = normalize(provider);
  if (!label) return null;
  return (
    <View
      className={cn(
        'rounded px-1.5 py-0.5 bg-surface-2 dark:bg-surface-2-dark border border-border dark:border-border-dark',
        className,
      )}
    >
      <Text
        className="text-[10px] uppercase tracking-wider text-fg-muted dark:text-fg-dark-muted"
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        {label}
      </Text>
    </View>
  );
}
