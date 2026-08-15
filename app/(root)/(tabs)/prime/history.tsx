import { Fragment, useMemo } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { format, isToday, isYesterday } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { MarkdownRenderer } from '@/components/prime/MarkdownRenderer';
import { usePrimeHistory } from '@/api/hooks/chatHooks';
import { clearPrimeHistory } from '@/api/services/chat';
import { useActiveOrg } from '@/store/org';
import { QUERY_KEYS } from '@/lib/constants';
import { fmtRelative } from '@/lib/formatters';
import { useThemeMode } from '@/hooks/useThemeMode';
import {
  pickFallbackMarkdown,
  tryParsePrimeStructured,
  type PrimeSectionItem,
} from '@/lib/primeStructuredSchema';
// DEMO ONLY — DO NOT MERGE: presentation belt over archived Prime output.
import { DEMO_APPROVALS } from '@/api/demo/flags';
import { sanitizeDemoText } from '@/lib/prime/demoPresentation';
import type { StoredPrimeMessage } from '@/api/services/types';

const present = (v: string): string => (DEMO_APPROVALS ? sanitizeDemoText(v) : v);

type Preview =
  | { kind: 'structured'; title: string; body: string }
  | { kind: 'markdown'; body: string }
  | { kind: 'plain'; body: string };

/**
 * Backend persists assistant messages with `format: 'structured'` as a JSON
 * string in `content` (UCOF v1 envelope). Render a compact title + summary
 * preview instead of the raw JSON. System welcome messages are markdown —
 * render them via MarkdownRenderer so `**bold**` etc. actually format.
 * User messages are plain text already.
 */
function buildPreview(m: StoredPrimeMessage): Preview {
  if (m.role === 'system') {
    return { kind: 'markdown', body: present(m.content) };
  }

  if (m.role === 'assistant' && m.format === 'structured') {
    const parsed = tryParsePrimeStructured(m.content);
    if (parsed) {
      const summary = parsed.summary?.find(Boolean);
      const firstSectionText = (() => {
        const sec = parsed.sections?.[0];
        const item = sec?.items?.[0] as PrimeSectionItem | undefined;
        if (!item) return '';
        return item.text || [item.label, item.value].filter(Boolean).join(': ');
      })();
      return {
        kind: 'structured',
        title: present(parsed.title),
        body: present(summary ?? firstSectionText ?? ''),
      };
    }
    const fallback = pickFallbackMarkdown(m.content);
    if (fallback) {
      return { kind: 'markdown', body: present(fallback) };
    }
  }

  return { kind: 'plain', body: present(m.content) };
}

/** Who said it, in the user's vocabulary — not the wire-format role. */
const ROLE_NAME: Record<string, string> = {
  user: 'You',
  assistant: 'Prime',
  system: 'System',
};

function dayLabel(ts?: string | number | Date): string {
  if (!ts) return 'Earlier';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return 'Earlier';
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEE, MMM d');
}

export default function PrimeHistoryScreen() {
  const qc = useQueryClient();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const history = usePrimeHistory(activeOrgId);

  const clear = useMutation({
    mutationFn: () => clearPrimeHistory(activeOrgId as string),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      if (activeOrgId) {
        qc.invalidateQueries({ queryKey: QUERY_KEYS.primeHistory(activeOrgId) });
      }
    },
  });

  const items = useMemo(() => history.data ?? [], [history.data]);

  const right =
    items.length > 0 ? (
      <IconButton
        icon="trash-outline"
        size={36}
        onPress={() =>
          Alert.alert(
            'Clear Prime history',
            'This removes all saved Prime console messages for this organization.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => clear.mutate() },
            ],
          )
        }
      />
    ) : undefined;

  return (
    <Screen>
      <AppHeader title="Prime history" showBack right={right} showOrgPill={false} />
      {history.isError ? (
        <ErrorState
          message={(history.error as Error).message}
          onRetry={() => history.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="time-outline" size={28} color={colors.accent} />}
          title="No saved Prime messages"
          description="Once you chat with Prime, your console history shows up here."
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={history.isFetching}
              onRefresh={() => history.refetch()}
              tintColor={colors.accent}
            />
          }
        >
          {items.map((m, i) => {
            // Violet is the AI's color in this app — Prime gets it, you stay neutral.
            const roleDot =
              m.role === 'assistant'
                ? colors.accent2
                : m.role === 'user'
                  ? colors.fgMuted
                  : colors.fgSubtle;
            const preview = buildPreview(m);
            const label = dayLabel(m.timestamp ?? m.createdAt);
            const prevLabel =
              i > 0 ? dayLabel(items[i - 1].timestamp ?? items[i - 1].createdAt) : null;
            const key = m._id ?? m.id ?? `${m.timestamp}-${m.role}`;
            return (
              <Fragment key={key}>
                {label !== prevLabel ? (
                  <View className="flex-row items-center my-3">
                    <View className="flex-1 h-px" style={{ backgroundColor: colors.borderSubtle }} />
                    {/* A date is provenance — mono, like every audit field. */}
                    <Text variant="mono.label" tone="subtle" className="mx-3">
                      {label}
                    </Text>
                    <View className="flex-1 h-px" style={{ backgroundColor: colors.borderSubtle }} />
                  </View>
                ) : null}
                <Card padding="sm" className="mb-2">
                  <View className="flex-row items-center mb-2">
                    <View
                      className="w-1.5 h-1.5 rounded-full mr-2"
                      style={{ backgroundColor: roleDot }}
                    />
                    {/* Who said it and when — both audit fields, both mono. */}
                    <Text variant="mono.label" tone="muted">
                      {ROLE_NAME[m.role] ?? m.role}
                    </Text>
                    <Text variant="mono.sm" tone="subtle" className="ml-auto">
                      {fmtRelative(m.timestamp ?? m.createdAt)}
                    </Text>
                  </View>

                {preview.kind === 'structured' ? (
                  <>
                    <Text variant="display.sm" numberOfLines={2}>
                      {preview.title}
                    </Text>
                    {preview.body ? (
                      <Text
                        variant="body.sm"
                        tone="muted"
                        className="mt-1"
                        numberOfLines={3}
                      >
                        {preview.body}
                      </Text>
                    ) : null}
                  </>
                ) : preview.kind === 'markdown' ? (
                  <MarkdownRenderer source={preview.body} />
                  ) : (
                    <Text variant="body.md" numberOfLines={6}>
                      {preview.body}
                    </Text>
                  )}
                </Card>
              </Fragment>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
