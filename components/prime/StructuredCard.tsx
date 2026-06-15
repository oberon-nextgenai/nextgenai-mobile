import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/cn';
import { useThemeMode } from '@/hooks/useThemeMode';
import type {
  PrimeStructuredResponse,
  PrimeSectionItem,
  PrimeSection,
  PrimeAction,
} from '@/lib/primeStructuredSchema';
import { MarkdownRenderer } from './MarkdownRenderer';

interface StructuredCardProps {
  data: PrimeStructuredResponse;
  fallbackMarkdown?: string | null;
  onActionTap?: (action: PrimeAction) => void;
}

const RESPONSE_BORDER: Record<string, string> = {
  status: 'border-border dark:border-border-dark',
  analytics: 'border-accent/30 dark:border-accent-dark/40',
  error: 'border-danger/40',
  'action-result': 'border-success/40',
  info: 'border-border dark:border-border-dark',
};

function MetricsGrid({ items }: { items: PrimeSectionItem[] }) {
  return (
    <View className="flex-row flex-wrap -mx-1.5">
      {items.map((m, i) => {
        const onlyText = !m.label && !m.value && !!m.text;
        if (onlyText) {
          return (
            <View key={i} className="w-full px-1.5 mb-2">
              <Text
                className="text-fg dark:text-fg-dark-DEFAULT text-sm leading-5"
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                {m.text}
              </Text>
            </View>
          );
        }
        return (
          <View key={i} className="w-1/2 px-1.5 mb-2">
            {m.label ? (
              <Text
                className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                {m.label}
              </Text>
            ) : null}
            <Text
              className="text-fg dark:text-fg-dark-DEFAULT text-lg mt-0.5"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              {m.value ?? m.text ?? '—'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ListSection({ items }: { items: PrimeSectionItem[] }) {
  return (
    <View className="gap-2.5">
      {items.map((it, i) => {
        const hasLabelValue = it.label && it.value;
        return (
          <View key={i} className="flex-row items-start">
            <View className="w-1 h-1 rounded-full bg-accent mt-2 mr-2.5" />
            <View className="flex-1">
              {hasLabelValue ? (
                <>
                  <Text
                    className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                    style={{ fontFamily: 'Inter_600SemiBold' }}
                  >
                    {it.label}
                  </Text>
                  <Text
                    className="text-fg-muted dark:text-fg-dark-muted text-xs mt-0.5"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  >
                    {it.value}
                  </Text>
                </>
              ) : (
                <Text
                  className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  {it.text ?? it.label ?? it.value}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function SectionRenderer({ section }: { section: PrimeSection }) {
  return (
    <View className="mb-3">
      <Text
        className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest mb-2"
        style={{ fontFamily: 'Inter_500Medium' }}
      >
        {section.name}
      </Text>
      {section.kind === 'metrics' ? (
        <MetricsGrid items={section.items} />
      ) : (
        <ListSection items={section.items} />
      )}
    </View>
  );
}

export function StructuredCard({
  data,
  fallbackMarkdown,
  onActionTap,
}: StructuredCardProps) {
  const { colors } = useThemeMode();
  const borderClass = RESPONSE_BORDER[data.responseType] ?? RESPONSE_BORDER.info;
  const summaryLines = data.summary?.filter(Boolean) ?? [];
  const insightLines = data.insights?.filter(Boolean) ?? [];
  const actions = data.actions?.filter(Boolean) ?? [];

  return (
    <View
      className={cn(
        'bg-surface dark:bg-surface-dark border rounded-2xl p-4',
        borderClass,
      )}
    >
      <Text
        className="text-fg dark:text-fg-dark-DEFAULT text-base"
        style={{ fontFamily: 'Inter_600SemiBold' }}
      >
        {data.title}
      </Text>

      {summaryLines.length > 0 ? (
        <View className="mt-1.5 mb-3">
          {summaryLines.map((line, i) => (
            <Text
              key={i}
              className="text-fg-muted dark:text-fg-dark-muted text-sm leading-5"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {line}
            </Text>
          ))}
        </View>
      ) : (
        <View className="h-3" />
      )}

      {data.sections.map((s, i) => (
        <SectionRenderer key={i} section={s} />
      ))}

      {insightLines.length > 0 ? (
        <View className="mt-1 mb-1 bg-surface-2 dark:bg-surface-2-dark rounded-lg p-3 border-l-2 border-accent">
          <Text
            className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest mb-1.5"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            Insights
          </Text>
          {insightLines.map((line, i) => (
            <Text
              key={i}
              className="text-fg dark:text-fg-dark-DEFAULT text-sm leading-5 mb-1"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      {actions.length > 0 ? (
        <View className="mt-3 gap-2">
          {actions.map((a, i) => (
            <Pressable
              key={i}
              onPress={() => onActionTap?.({ label: a, prompt: a })}
              className="flex-row items-center bg-accent-soft dark:bg-accent-soft-dark border border-accent/30 dark:border-accent-dark/40 rounded-xl px-3 py-2.5 active:opacity-80"
            >
              <Text
                className="flex-1 text-accent dark:text-accent-dark text-sm leading-5"
                style={{ fontFamily: 'Inter_500Medium' }}
                numberOfLines={2}
              >
                {a}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={13}
                color={colors.accent}
                style={{ marginLeft: 8, opacity: 0.7 }}
              />
            </Pressable>
          ))}
        </View>
      ) : null}

      {fallbackMarkdown ? (
        <View className="mt-3 pt-3 border-t border-border-subtle dark:border-border-dark-subtle">
          <MarkdownRenderer source={fallbackMarkdown} />
        </View>
      ) : null}
    </View>
  );
}
