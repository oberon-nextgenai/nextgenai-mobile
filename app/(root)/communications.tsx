import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format, isToday } from 'date-fns';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ScreenHeading } from '@/components/common/ScreenHeading';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterChipRow, type FilterOption } from '@/components/ui/FilterChipRow';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useConversations } from '@/api/hooks/conversationHooks';
import type { Conversation } from '@/api/services/conversations';
import { useActiveOrg } from '@/store/org';
import { useThemeMode } from '@/hooks/useThemeMode';
import { usePressScale } from '@/hooks/usePressScale';
import { fmtDateTime, fmtNumber } from '@/lib/formatters';

/**
 * Communications Hub — the conversation records this organization owns.
 *
 * This screen is deliberately thinner than the deck's screen 12, and the gap is
 * the point. The deck's row shows a customer name, a channel glyph, a one-line
 * message preview and a sentiment tag; `Conversation` carries none of those (see
 * `api/services/conversations.ts`). It carries a contact id, an agent id and two
 * timestamps. So that is what a row shows.
 *
 * The rule applied throughout: a field that does not exist is omitted, never
 * defaulted. Rendering `NEUTRAL` where there is no sentiment score, or filing
 * every row under `Calls` because calls are the common case, would dress a guess
 * up as a measurement — and a sentiment tag is exactly the kind of thing an
 * executive acts on. The channel chips from the deck are gone for the same
 * reason: there is no channel field to derive them from, and a chip row that
 * always reads "Calls · 642" is a lie with a filter attached.
 *
 * What the chips filter on instead is `createdAt`, which is real, and whose
 * counts are therefore genuinely derivable.
 */

/** Recency buckets. The one dimension of this record that supports filtering. */
type TimeWindow = 'all' | 'today' | 'week' | 'month';

const DAY_MS = 86_400_000;

const WINDOW_DAYS: Record<'week' | 'month', number> = { week: 7, month: 30 };

function withinWindow(iso: string, bucket: Exclude<TimeWindow, 'all'>, now: number): boolean {
  const t = Date.parse(iso);
  // An unparseable timestamp can't be placed in a window. It stays visible under
  // "All" rather than being silently assigned to one.
  if (Number.isNaN(t)) return false;
  if (bucket === 'today') return isToday(new Date(t));
  return now - t <= WINDOW_DAYS[bucket] * DAY_MS;
}

/**
 * The deck's `08:33`. Today gets a clock, anything older gets a date — a bare
 * time on a three-week-old row reads as "just now" at a glance.
 */
function timeLabel(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  const d = new Date(t);
  return isToday(d) ? format(d, 'HH:mm') : format(d, 'MMM d');
}

/** One mono label/value pair in the expanded row. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <Text variant="mono.label" tone="subtle">
        {label}
      </Text>
      <Text variant="mono.sm" tone="muted" className="flex-1 text-right">
        {value}
      </Text>
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A conversation row.
 *
 * Tapping expands it rather than navigating: there is no conversation detail
 * route, and more to the point there is no detail to route to — the expansion
 * shows every field the document has, which is the honest destination for a tap
 * on a record this thin.
 */
function ConversationRow({ conversation }: { conversation: Conversation }) {
  const { colors } = useThemeMode();
  const press = usePressScale({ to: 0.985 });
  const [expanded, setExpanded] = useState(false);

  const time = timeLabel(conversation.createdAt);

  return (
    <AnimatedPressable
      onPress={() => setExpanded(v => !v)}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`Conversation with contact ${conversation.contactId}, opened ${fmtDateTime(conversation.createdAt)}`}
      style={press.animatedStyle}
    >
      <Card padding="sm">
        <View className="flex-row items-center">
          {/*
            Initials off the contact id — the only identity this record has. No
            channel glyph on the avatar: nothing on the document says which
            channel the conversation ran on.
          */}
          <Avatar name={conversation.contactId} size={36} />

          <View className="ml-3 min-w-0 flex-1">
            {/* Mono, because this is an identifier and not a person's name. */}
            <Text variant="mono.value" numberOfLines={1}>
              {conversation.contactId}
            </Text>
            <Text variant="mono.sm" tone="subtle" numberOfLines={1} className="mt-0.5">
              {`Agent · ${conversation.agentId}`}
            </Text>
          </View>

          <View className="ml-2 items-end">
            <Text variant="mono.sm" tone="muted">
              {time}
            </Text>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.fgSubtle}
              style={{ marginTop: 4 }}
            />
          </View>
        </View>

        {expanded ? (
          <View
            className="mt-3 gap-2 border-t pt-3"
            style={{ borderTopColor: colors.border }}
          >
            <Field label="Record" value={conversation._id} />
            <Field label="Contact" value={conversation.contactId} />
            <Field label="Agent" value={conversation.agentId} />
            <Field label="Opened" value={fmtDateTime(conversation.createdAt)} />
            <Field label="Updated" value={fmtDateTime(conversation.updatedAt)} />
            <Text variant="body.xs" tone="subtle" className="mt-1">
              This record stores who spoke to whom and when. Transcript, channel and
              sentiment are not part of it.
            </Text>
          </View>
        ) : null}
      </Card>
    </AnimatedPressable>
  );
}

export default function CommunicationsScreen() {
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const { data, isPending, isError, error, isFetching, refetch } = useConversations(activeOrgId);

  const [query, setQuery] = useState('');
  const [range, setRange] = useState<TimeWindow>('all');

  /**
   * One pass over the data at one reading of the clock: newest first, each row's
   * bucket membership, and the chip counts that follow from it.
   *
   * The clock is read inside the memo rather than per render so the buckets and
   * the counts can never disagree. Re-reading it when the data changes is enough
   * — these are day-scale windows, so a ticking clock (as on the approvals SLA
   * countdown) would move nothing a user could see.
   */
  const { rows, counts } = useMemo(() => {
    const now = Date.now();

    const decorated = (data ?? [])
      .map(conversation => ({
        conversation,
        buckets: {
          all: true,
          today: withinWindow(conversation.createdAt, 'today', now),
          week: withinWindow(conversation.createdAt, 'week', now),
          month: withinWindow(conversation.createdAt, 'month', now),
        } satisfies Record<TimeWindow, boolean>,
      }))
      // The server returns them unordered; a conversation list only makes sense
      // newest first.
      .sort((a, b) => Date.parse(b.conversation.createdAt) - Date.parse(a.conversation.createdAt));

    const tally = { all: decorated.length, today: 0, week: 0, month: 0 };
    for (const row of decorated) {
      if (row.buckets.today) tally.today += 1;
      if (row.buckets.week) tally.week += 1;
      if (row.buckets.month) tally.month += 1;
    }

    return { rows: decorated, counts: tally };
  }, [data]);

  /**
   * Search runs over the identifiers, because they are the only text the record
   * has. The placeholder says so rather than promising the deck's "customer,
   * agent, or channel" and quietly matching nothing.
   */
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter(row => row.buckets[range])
      .map(row => row.conversation)
      .filter(
        c =>
          needle.length === 0 ||
          c.contactId.toLowerCase().includes(needle) ||
          c.agentId.toLowerCase().includes(needle) ||
          c._id.toLowerCase().includes(needle),
      );
  }, [rows, query, range]);

  const filters: FilterOption<TimeWindow>[] = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'today', label: 'Today', count: counts.today },
    { value: 'week', label: '7 days', count: counts.week },
    { value: 'month', label: '30 days', count: counts.month },
  ];

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

  if (isPending) {
    return shell(
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.accent} />
      </View>,
    );
  }

  if (isError) {
    return shell(
      <ErrorState
        message={error instanceof Error ? error.message : undefined}
        onRetry={refetch}
      />,
    );
  }

  /**
   * Empty is a result, not a fault — and on this collection it is the expected
   * one for a while. Conversations written before `organizationId` existed match
   * no tenant's query until the backfill runs, so an org with real history can
   * legitimately show nothing here. Say that, rather than implying a failure.
   */
  if (counts.all === 0) {
    return shell(
      <EmptyState
        icon={<Ionicons name="chatbubbles-outline" size={26} color={colors.fgMuted} />}
        title="No conversations in this organization yet."
        description="New conversations appear here as your agents open them. Older records created before conversations were organization-scoped stay hidden until they are backfilled."
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
        <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.accent} />
      }
    >
      <View className="px-4 pt-4">
        <ScreenHeading
          eyebrow="Communications"
          title="Live conversations"
          right={
            <Text variant="mono.label" tone="subtle">
              {`${fmtNumber(counts.all)} total`}
            </Text>
          }
        />
      </View>

      <Animated.View entering={FadeInDown.duration(340).delay(120)} className="px-4 mt-4">
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search by contact or agent ID"
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
        <FilterChipRow options={filters} value={range} onChange={setRange} />
      </Animated.View>

      {/*
        Said once, plainly. Without it the absence of the deck's channel chips
        reads as an unfinished screen rather than as an accurate one.
      */}
      <View className="px-4 mt-3">
        <Text variant="mono.sm" tone="subtle">
          Channel and sentiment are not recorded on these conversations.
        </Text>
      </View>

      <Animated.View entering={FadeInDown.duration(340).delay(200)} className="px-4 mt-4 gap-2.5">
        {visible.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="funnel-outline" size={26} color={colors.fgMuted} />}
            title="Nothing here"
            description={
              query.trim().length > 0
                ? 'No conversation matches that contact or agent ID.'
                : 'No conversations were opened in this window.'
            }
          />
        ) : (
          visible.map(conversation => (
            <ConversationRow key={conversation._id} conversation={conversation} />
          ))
        )}
      </Animated.View>
    </ScrollView>,
  );
}
