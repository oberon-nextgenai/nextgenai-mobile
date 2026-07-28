import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
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

/** Metrics render as figures, so they get the serif treatment. */
function MetricsGrid({ items }: { items: PrimeSectionItem[] }) {
  return (
    <View className="flex-row flex-wrap -mx-1.5">
      {items.map((m, i) => {
        const onlyText = !m.label && !m.value && !!m.text;
        if (onlyText) {
          return (
            <View key={i} className="w-full px-1.5 mb-2">
              <Text variant="body.sm">{m.text}</Text>
            </View>
          );
        }
        return (
          <View key={i} className="w-1/2 px-1.5 mb-3">
            {m.label ? (
              <Text variant="mono.label" tone="subtle" numberOfLines={1}>
                {m.label}
              </Text>
            ) : null}
            <Text variant="display.sm" className="mt-1" numberOfLines={1}>
              {m.value ?? m.text ?? '—'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ListSection({ items }: { items: PrimeSectionItem[] }) {
  const { colors } = useThemeMode();
  return (
    <View className="gap-2.5">
      {items.map((it, i) => (
        <View key={i} className="flex-row items-start">
          <View
            className="w-1 h-1 rounded-full mt-2 mr-2.5"
            style={{ backgroundColor: colors.accent2 }}
          />
          <View className="flex-1">
            {it.label && it.value ? (
              <>
                <Text variant="body.semibold">{it.label}</Text>
                <Text variant="body.sm" tone="muted" className="mt-0.5">
                  {it.value}
                </Text>
              </>
            ) : (
              <Text variant="body.sm">{it.text ?? it.label ?? it.value}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function SectionRenderer({ section }: { section: PrimeSection }) {
  return (
    <View className="mb-3">
      <Text variant="mono.label" tone="subtle" className="mb-2">
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

/**
 * Renders a UCOF-1 structured reply.
 *
 * Schema-driven on purpose — it switches on `kind`, never on which tool produced
 * the payload — so a new Prime capability that returns UCOF renders here with no
 * client change. See `PRIME_STREAMING_CONTRACT.md`.
 */
export function StructuredCard({ data, fallbackMarkdown, onActionTap }: StructuredCardProps) {
  const { colors } = useThemeMode();

  // The response type tints the left rail: analytics reads, errors, and
  // completed actions should be distinguishable before you read the title.
  const rail: string | undefined = {
    analytics: colors.steel,
    error: colors.danger,
    'action-result': colors.successBright,
    status: undefined,
    info: undefined,
  }[data.responseType];

  const summaryLines = data.summary?.filter(Boolean) ?? [];
  const insightLines = data.insights?.filter(Boolean) ?? [];
  // Capped to keep the card scannable on a phone.
  const actions = (data.actions?.filter(Boolean) ?? []).slice(0, 3);

  return (
    <Card rail={rail}>
      <Text variant="display.sm">{data.title}</Text>

      {summaryLines.length > 0 ? (
        <View className="mt-1.5 mb-3">
          {summaryLines.map((line, i) => (
            <Text key={i} variant="body.sm" tone="muted">
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
        <View
          className="mt-1 mb-1 rounded-xl p-3"
          style={{ backgroundColor: colors.surface2, borderLeftWidth: 2, borderLeftColor: colors.accent2 }}
        >
          <Text variant="mono.label" tone="accent" className="mb-1.5">
            Insights
          </Text>
          {insightLines.map((line, i) => (
            <Text key={i} variant="body.sm" className="mb-1">
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      {/* `actions` are ready-to-send replies, so they read as things you say. */}
      {actions.length > 0 ? (
        <View className="mt-3 gap-2">
          {actions.map((a, i) => (
            <Pressable
              key={i}
              onPress={() => onActionTap?.({ label: a, prompt: a })}
              accessibilityRole="button"
              className="flex-row items-center rounded-xl px-3 py-2.5 active:opacity-80"
              style={{
                backgroundColor: colors.chipSelectedBg,
                borderWidth: 1,
                borderColor: colors.chipSelectedBorder,
              }}
            >
              <Text variant="body.sm" tone="accent" numberOfLines={2} className="flex-1">
                {a}
              </Text>
              <Ionicons name="arrow-forward" size={13} color={colors.accent2} style={{ marginLeft: 8 }} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {fallbackMarkdown ? (
        <View
          className="mt-3 pt-3"
          style={{ borderTopWidth: 1, borderTopColor: colors.borderSubtle }}
        >
          <MarkdownRenderer source={fallbackMarkdown} />
        </View>
      ) : null}
    </Card>
  );
}
