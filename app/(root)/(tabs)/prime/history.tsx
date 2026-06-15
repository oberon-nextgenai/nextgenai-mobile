import { useMemo } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
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
import type { StoredPrimeMessage } from '@/api/services/types';

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
    return { kind: 'markdown', body: m.content };
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
        title: parsed.title,
        body: summary ?? firstSectionText ?? '',
      };
    }
    const fallback = pickFallbackMarkdown(m.content);
    if (fallback) {
      return { kind: 'markdown', body: fallback };
    }
  }

  return { kind: 'plain', body: m.content };
}

export default function PrimeHistoryScreen() {
  const qc = useQueryClient();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const history = usePrimeHistory(activeOrgId);

  const clear = useMutation({
    mutationFn: () => clearPrimeHistory(activeOrgId as string),
    onSuccess: () => {
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
          {items.map((m) => {
            const roleColor =
              m.role === 'user'
                ? 'bg-accent'
                : m.role === 'assistant'
                  ? 'bg-success'
                  : 'bg-fg-subtle';
            const preview = buildPreview(m);
            return (
              <View
                key={m._id ?? m.id ?? `${m.timestamp}-${m.role}`}
                className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3 mb-2"
              >
                <View className="flex-row items-center mb-2">
                  <View className={`w-1.5 h-1.5 rounded-full mr-2 ${roleColor}`} />
                  <Text
                    className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest"
                    style={{ fontFamily: 'Inter_500Medium' }}
                  >
                    {m.role}
                  </Text>
                  <Text
                    className="text-fg-subtle dark:text-fg-dark-subtle text-[10px] ml-auto"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  >
                    {fmtRelative(m.timestamp ?? m.createdAt)}
                  </Text>
                </View>

                {preview.kind === 'structured' ? (
                  <>
                    <Text
                      className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                      style={{ fontFamily: 'Inter_600SemiBold' }}
                      numberOfLines={2}
                    >
                      {preview.title}
                    </Text>
                    {preview.body ? (
                      <Text
                        className="text-fg-muted dark:text-fg-dark-muted text-xs mt-1 leading-5"
                        style={{ fontFamily: 'Inter_400Regular' }}
                        numberOfLines={3}
                      >
                        {preview.body}
                      </Text>
                    ) : null}
                  </>
                ) : preview.kind === 'markdown' ? (
                  <MarkdownRenderer source={preview.body} />
                ) : (
                  <Text
                    className="text-fg dark:text-fg-dark-DEFAULT text-sm leading-5"
                    style={{ fontFamily: 'Inter_400Regular' }}
                    numberOfLines={6}
                  >
                    {preview.body}
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
