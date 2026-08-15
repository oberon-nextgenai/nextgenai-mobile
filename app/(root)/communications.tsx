import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ScreenHeading } from '@/components/common/ScreenHeading';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterChipRow, type FilterOption } from '@/components/ui/FilterChipRow';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { ConversationRow } from '@/components/executive/ConversationRow';
import { useConversationFeed } from '@/api/hooks/conversationHooks';
import { useActiveOrg } from '@/store/org';
import { useThemeMode } from '@/hooks/useThemeMode';
import { fmtNumber } from '@/lib/formatters';

/**
 * Communications Hub — the cross-channel conversation feed.
 *
 * Fed by `GET /api/conversations/export`, which normalizes voice and email
 * into one shape (agent, channel, contact, summary), newest first. Arriving
 * with `?agentId=` scopes the feed to one agent — that's how the agent detail
 * screen's "View all" lands here.
 */

type ChannelFilter = 'all' | 'phone' | 'email';

export default function CommunicationsScreen() {
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const { agentId } = useLocalSearchParams<{ agentId?: string }>();

  const feed = useConversationFeed(activeOrgId, agentId || undefined);

  const [query, setQuery] = useState('');
  const [channel, setChannel] = useState<ChannelFilter>('all');

  const items = useMemo(() => feed.data ?? [], [feed.data]);

  const counts = useMemo(
    () => ({
      all: items.length,
      phone: items.filter((i) => i.channel === 'phone').length,
      email: items.filter((i) => i.channel === 'email').length,
    }),
    [items],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter((i) => channel === 'all' || i.channel === channel)
      .filter(
        (i) =>
          needle.length === 0 ||
          i.contact.toLowerCase().includes(needle) ||
          i.agentName.toLowerCase().includes(needle) ||
          (i.summary ?? '').toLowerCase().includes(needle) ||
          (i.emailSubject ?? '').toLowerCase().includes(needle),
      );
  }, [items, query, channel]);

  const filters: FilterOption<ChannelFilter>[] = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'phone', label: 'Calls', count: counts.phone },
    { value: 'email', label: 'Email', count: counts.email },
  ];

  // The feed is scoped to one agent when arriving from its detail screen.
  const scopedAgentName = agentId
    ? items.find((i) => i.agentId === agentId)?.agentName
    : undefined;

  const shell = (children: React.ReactNode) => (
    <Screen background="nebula" edges={{ top: true, bottom: false }}>
      <AppHeader title="Communications" showBack showOrgPill={false} />
      {children}
    </Screen>
  );

  if (!activeOrgId) {
    return shell(
      <EmptyState
        icon={<Ionicons name="business-outline" size={26} color={colors.fgMuted} />}
        title="Choose an organization"
        description="Select an organization to see its conversations."
      />,
    );
  }

  if (feed.isPending) {
    return shell(
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.accent} />
      </View>,
    );
  }

  if (feed.isError) {
    return shell(
      <ErrorState
        message={feed.error instanceof Error ? feed.error.message : undefined}
        onRetry={feed.refetch}
      />,
    );
  }

  if (items.length === 0) {
    return shell(
      <EmptyState
        icon={<Ionicons name="chatbubbles-outline" size={26} color={colors.fgMuted} />}
        title="No conversations yet"
        description="Conversations appear here as your agents handle calls and email."
      />,
    );
  }

  return shell(
    <ScrollView
      className="flex-1"
      // Horizontal padding lives on the children so the chip row can scroll edge to edge.
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={feed.isFetching}
          onRefresh={feed.refetch}
          tintColor={colors.accent}
        />
      }
    >
      <View className="px-4 pt-4">
        <ScreenHeading
          eyebrow={scopedAgentName ? `Communications · ${scopedAgentName}` : 'Communications'}
          title="Live conversations"
          right={
            agentId ? (
              <Text
                variant="mono.label"
                tone="accent"
                onPress={() => router.setParams({ agentId: undefined })}
              >
                Show all
              </Text>
            ) : (
              <Text variant="mono.label" tone="subtle">
                {`${fmtNumber(counts.all)} total`}
              </Text>
            )
          }
        />
      </View>

      <Animated.View entering={FadeInDown.duration(340).delay(120)} className="px-4 mt-4">
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search by customer, agent, or topic"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          leftIcon={<Ionicons name="search" size={16} color={colors.fgSubtle} />}
          rightIcon={
            query.length > 0 ? (
              <Ionicons name="close-circle" size={16} color={colors.fgSubtle} />
            ) : undefined
          }
          onPressRightIcon={query.length > 0 ? () => setQuery('') : undefined}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(340).delay(160)} className="mt-3">
        <FilterChipRow options={filters} value={channel} onChange={setChannel} />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(340).delay(200)} className="px-4 mt-4 gap-2.5">
        {visible.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="funnel-outline" size={26} color={colors.fgMuted} />}
            title="Nothing here"
            description={
              query.trim().length > 0
                ? 'No conversation matches that search.'
                : 'No conversations on this channel.'
            }
          />
        ) : (
          visible.map((item) => <ConversationRow key={item.id} item={item} />)
        )}
      </Animated.View>
    </ScrollView>,
  );
}
