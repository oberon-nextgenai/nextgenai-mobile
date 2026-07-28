import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format } from 'date-fns';
import Toast from 'react-native-toast-message';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { GradientButton } from '@/components/ui/GradientButton';
import { IconButton } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Card';
import { Text, type TextTone } from '@/components/ui/Text';
import { MarkdownRenderer } from '@/components/prime/MarkdownRenderer';
import { StreamingIndicator } from '@/components/prime/StreamingIndicator';
import { usePrimeChat } from '@/api/hooks/chatHooks';
import { useActiveOrg } from '@/store/org';
import { useThemeMode } from '@/hooks/useThemeMode';
import type {
  PrimeSection,
  PrimeSectionItem,
  PrimeStructuredResponse,
} from '@/lib/primeStructuredSchema';

/**
 * Board Update — the memo Prime drafts from this week's real agent activity.
 *
 * There is no `generate_board_update` tool and no board-document store, so this
 * screen does not fetch a document: it *asks for one*. On mount it seeds the
 * ordinary Prime streaming endpoint with a board-update prompt, and renders the
 * UCOF-1 reply that comes back as an editorial memo instead of a chat bubble.
 * Every figure on screen is therefore a figure Prime read from the platform —
 * nothing here is authored by the client.
 *
 * The prompt asks for the deck's section names (HEADLINE / WHAT CHANGED / RISKS
 * / ASKS) but not for their contents, and explicitly tells Prime to drop any
 * section it cannot support with real data. That is the whole trick: the layout
 * is ours, the document is Prime's. A short memo is the honest memo.
 *
 * Two deliberate deviations from the deck, both because the backing capability
 * does not exist:
 *   · "Send to board" is **Share draft** — it opens the OS share sheet. A button
 *     that says it sends to the board when nothing is sent would be a lie.
 *   · "Edit" is **Regenerate** — editing needs a persistence layer we do not have.
 */

/**
 * The seed. Asks for structure and for provenance; never for a conclusion.
 * Kept as one constant so the document is reproducible and reviewable.
 */
const BOARD_UPDATE_PROMPT = [
  'Draft a board update on our AI workforce for this organization.',
  'Read the live agent, analytics and escalation data first — every figure must come from that data, never an estimate.',
  'Return it with these sections, in this order:',
  'HEADLINE (the key figures: agents in production, interactions handled, resolution rate, spend),',
  'WHAT CHANGED (movements versus the previous period, each written with a signed delta such as +0.6 pts or -3%),',
  'RISKS (anything that needs board attention, most serious first),',
  'ASKS (what you need from the board).',
  'Omit any section you cannot support with real figures rather than filling it in.',
].join(' ');

/** A value like "+0.6 pts" or "-3%" — the deck's inline coloured delta. */
const DELTA_RE = /^[+\-−]\s?\d/;

/**
 * Deltas are toned by direction: up reads as improvement, down as decline.
 *
 * Suppressed inside a risks section, where that mapping inverts — "+3 breaches"
 * is not good news, and a green plus sign next to a risk is a misread the reader
 * cannot recover from. There the number stays in the default foreground.
 */
function deltaTone(value: string, suppressDirection: boolean): TextTone {
  const v = value.trim();
  if (suppressDirection || !DELTA_RE.test(v)) return 'muted';
  return /^[-−]/.test(v) ? 'danger' : 'success';
}

function isRiskSection(name: string): boolean {
  return /risk/i.test(name);
}

/** Hairline between memo sections — the deck's dividing rules. */
function Rule({ className }: { className?: string }) {
  const { colors } = useThemeMode();
  return (
    <View
      className={className}
      style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong }}
    />
  );
}

/** `metrics` items read as a ledger: mono field on the left, serif figure on the right. */
function Ledger({ items }: { items: PrimeSectionItem[] }) {
  return (
    <View className="gap-3">
      {items.map((item, i) => {
        // A metric with no label/value is a sentence Prime wrote — let it be prose.
        if (!item.label && !item.value) {
          return (
            <Text key={i} variant="body.md" tone="muted">
              {item.text}
            </Text>
          );
        }
        return (
          <View key={i} className="flex-row items-baseline justify-between">
            <Text variant="mono.label" tone="subtle" className="flex-1 pr-3" numberOfLines={2}>
              {item.label ?? ''}
            </Text>
            <Text variant="display.md">{item.value ?? item.text ?? ''}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** `list` items read as memo bullets, with the value held out to the right rail. */
function Bullets({ items, suppressDirection }: { items: PrimeSectionItem[]; suppressDirection: boolean }) {
  const { colors } = useThemeMode();
  return (
    <View className="gap-3">
      {items.map((item, i) => {
        // `value` becomes the right-hand delta only when a label already carries
        // the line; on its own it is the line.
        const lead = item.label ?? item.text ?? item.value ?? '';
        const trail = item.label ? (item.value ?? null) : null;
        return (
          <View key={i} className="flex-row items-start">
            <View
              className="mt-2 mr-3 h-1 w-1"
              style={{ backgroundColor: colors.accent2 }}
            />
            <View className="flex-1 flex-row items-baseline">
              <Text variant="body.md" className="flex-1 pr-3">
                {lead}
              </Text>
              {trail ? (
                <Text variant="mono.value" tone={deltaTone(trail, suppressDirection)}>
                  {trail}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function MemoSection({ section }: { section: PrimeSection }) {
  const suppress = isRiskSection(section.name);
  return (
    <View className="mt-5">
      <Rule />
      <Text variant="mono.label" tone="subtle" className="mt-4 mb-3">
        {section.name}
      </Text>
      {section.kind === 'metrics' ? (
        <Ledger items={section.items} />
      ) : (
        <Bullets items={section.items} suppressDirection={suppress} />
      )}
    </View>
  );
}

/**
 * Flattens the document to the plain text the share sheet carries.
 *
 * Deliberately mirrors what is on screen line for line — including the markdown
 * tail — so the thing a director receives is the thing the user read.
 */
function documentToPlainText(args: {
  structured: PrimeStructuredResponse | null;
  markdown: string;
  addressee: string;
  draftedOn: string;
}): string {
  const { structured, markdown, addressee, draftedOn } = args;
  const out: string[] = ['BOARD UPDATE — DRAFTED BY PRIME', `${addressee} · ${draftedOn}`, ''];

  if (structured) {
    out.push(structured.title, '');
    for (const line of structured.summary?.filter(Boolean) ?? []) out.push(line);
    if (structured.summary?.length) out.push('');

    for (const section of structured.sections) {
      out.push(section.name.toUpperCase());
      for (const item of section.items) {
        if (item.label && item.value) out.push(`  - ${item.label}: ${item.value}`);
        else out.push(`  - ${item.text ?? item.label ?? item.value ?? ''}`);
      }
      out.push('');
    }

    const insights = structured.insights?.filter(Boolean) ?? [];
    if (insights.length > 0) {
      out.push("PRIME'S READ");
      for (const line of insights) out.push(`  - ${line}`);
      out.push('');
    }
  }

  if (markdown) out.push(markdown, '');

  out.push('Drafted by Prime from live agent activity. Review before circulating.');
  return out.join('\n');
}

export default function BoardUpdateScreen() {
  const router = useRouter();
  const { activeOrgId, active } = useActiveOrg();
  const { colors } = useThemeMode();

  const { messages, isStreaming, handleSubmit, clearMessages } = usePrimeChat(activeOrgId);

  // `handleSubmit` re-identifies on every message change, so the seeding effect
  // reads it through a ref instead of depending on it and re-firing the draft.
  const submitRef = useRef(handleSubmit);
  submitRef.current = handleSubmit;

  // A monotonic counter: each bump requests one fresh draft. Regenerating and
  // switching org both go through it, so there is exactly one seeding path.
  const [draftRequest, setDraftRequest] = useState(0);
  const sentRequestRef = useRef(0);

  const requestDraft = useCallback(() => {
    clearMessages();
    setDraftRequest((n) => n + 1);
  }, [clearMessages]);

  // The memo is org-scoped: a different org is a different document, never a
  // stale one. This also covers the initial mount.
  useEffect(() => {
    requestDraft();
  }, [activeOrgId, requestDraft]);

  // Fires once per request, and only after `clearMessages` has landed — the
  // outgoing payload must not carry the previous draft's turns.
  useEffect(() => {
    if (!activeOrgId || draftRequest === 0) return;
    if (sentRequestRef.current === draftRequest) return;
    if (isStreaming || messages.length > 0) return;
    sentRequestRef.current = draftRequest;
    void submitRef.current(BOARD_UPDATE_PROMPT);
  }, [activeOrgId, draftRequest, isStreaming, messages.length]);

  const assistant = useMemo(
    () => [...messages].reverse().find((m) => m.role === 'assistant'),
    [messages],
  );

  const structured = assistant?.structured ?? null;

  // Prime may answer in prose instead of UCOF. `content` is only usable when the
  // reply was not structured — for a structured reply it holds the raw JSON.
  const markdown = useMemo(() => {
    const fallback = assistant?.fallbackMarkdown?.trim();
    if (fallback) return fallback;
    if (assistant && assistant.format !== 'structured' && assistant.status === 'complete') {
      return assistant.content.trim();
    }
    return '';
  }, [assistant]);

  // Which tools Prime actually ran to write this. Mono provenance, per the deck.
  const sources = useMemo(() => {
    const names = (assistant?.toolCalls ?? [])
      .filter((tc) => tc.status === 'success' && tc.name.trim())
      .map((tc) => tc.name.trim());
    return Array.from(new Set(names));
  }, [assistant]);

  const addressee = active?.name ? `For · ${active.name} board` : 'For the board';
  const draftedOn = assistant?.timestamp
    ? `Drafted ${format(new Date(assistant.timestamp), 'MMM d, yyyy')}`
    : 'Draft';

  const hasDocument = Boolean(structured) || markdown.length > 0;

  const onShare = useCallback(async () => {
    if (!hasDocument) return;
    try {
      await Share.share({
        title: structured?.title ?? 'Board update',
        message: documentToPlainText({ structured, markdown, addressee, draftedOn }),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Could not share the draft',
        text2: (err as Error)?.message ?? 'The share sheet failed to open.',
      });
    }
  }, [hasDocument, structured, markdown, addressee, draftedOn]);

  const header = (
    <AppHeader
      title="Board update"
      showBack
      showOrgPill={false}
      right={
        <IconButton
          icon="share-outline"
          size={36}
          variant="ghost"
          disabled={!hasDocument}
          onPress={onShare}
        />
      }
    />
  );

  const shell = (children: React.ReactNode) => (
    <Screen background="nebula" edges={{ top: true, bottom: true }}>
      {header}
      {children}
    </Screen>
  );

  if (!activeOrgId) {
    return shell(
      <EmptyState
        icon={<Ionicons name="business-outline" size={32} color={colors.accent} />}
        title="Choose an organization"
        description="Prime drafts the board update from one organization's agent activity."
      />,
    );
  }

  if (assistant?.status === 'error') {
    return shell(
      <ErrorState
        title="Prime could not finish the draft"
        message={assistant.content || 'The stream ended before the update was written.'}
        onRetry={requestDraft}
      />,
    );
  }

  // Streaming, or the moment before the seed goes out — both are "Prime working".
  if (isStreaming || messages.length === 0 || assistant?.status === 'streaming') {
    return shell(
      <View className="flex-1 items-center justify-center px-8">
        <StreamingIndicator />
        <Text variant="body.sm" tone="muted" className="mt-4 text-center max-w-[280px]">
          Prime is reading this period&apos;s agent activity and writing the update.
        </Text>
      </View>,
    );
  }

  // Prime replied with nothing renderable. Say so — do not draw an empty memo.
  if (!hasDocument) {
    return shell(
      <EmptyState
        title="Prime returned no update."
        description="Nothing came back for this organization. Ask for the draft again, or open Prime and work through it in chat."
        action={
          <Button variant="secondary" onPress={requestDraft}>
            Try again
          </Button>
        }
      />,
    );
  }

  const summaryLines = structured?.summary?.filter(Boolean) ?? [];
  const insightLines = structured?.insights?.filter(Boolean) ?? [];
  const followUps = structured?.actions?.filter(Boolean) ?? [];

  return shell(
    <>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between">
          <Text variant="mono.label" tone="subtle" className="flex-1 pr-3">
            Board update · drafted by Prime
          </Text>
        </View>

        <Animated.View entering={FadeInDown.duration(340).delay(60)} className="mt-3">
          <Card padding="lg" gloss>
            {/* The memo's masthead: who it is for, and when it was written. */}
            <View className="flex-row items-baseline justify-between">
              <Text variant="mono.label" tone="muted" className="flex-1 pr-3" numberOfLines={1}>
                {addressee}
              </Text>
              <Text variant="mono.label" tone="subtle">
                {draftedOn}
              </Text>
            </View>

            {structured ? (
              <>
                <Rule className="mt-4" />
                {/* The thesis line — Prime's title, carried in serif. */}
                <Text variant="display.lg" className="mt-4">
                  {structured.title}
                </Text>
                {summaryLines.map((line, i) => (
                  <Text key={i} variant="display.sm" tone="muted" className="mt-2">
                    {line}
                  </Text>
                ))}

                {structured.sections.map((section, i) => (
                  <MemoSection key={`${section.name}-${i}`} section={section} />
                ))}

                {insightLines.length > 0 ? (
                  <View className="mt-5">
                    <Rule />
                    <View
                      className="mt-4 pl-3"
                      style={{ borderLeftWidth: 2, borderLeftColor: colors.accent2 }}
                    >
                      <Text variant="mono.label" tone="accent">
                        Prime&apos;s read
                      </Text>
                      {insightLines.map((line, i) => (
                        <Text key={i} variant="body.md" className="mt-2">
                          {line}
                        </Text>
                      ))}
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}

            {/* Prose Prime wrote outside the structured payload. Rendered rather
                than dropped — and carried into the share text for the same reason. */}
            {markdown ? (
              <View className="mt-5">
                <Rule />
                <View className="mt-4">
                  <MarkdownRenderer source={markdown} />
                </View>
              </View>
            ) : null}

            <Rule className="mt-5" />
            <Text variant="mono.sm" tone="subtle" className="mt-3">
              {sources.length > 0
                ? `Drafted by Prime · read ${sources.join(', ')}`
                : 'Drafted by Prime from live agent activity'}
            </Text>
          </Card>
        </Animated.View>

        {/* UCOF `actions` are send-ready chat prompts, not board asks — they stay
            outside the document, and out of the shared text, for that reason. */}
        {followUps.length > 0 ? (
          <Animated.View entering={FadeInDown.duration(340).delay(120)} className="mt-5">
            <Text variant="mono.label" tone="subtle" className="mb-2.5">
              Ask Prime next
            </Text>
            <View className="gap-2">
              {followUps.map((a, i) => (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: '/(root)/(tabs)/prime',
                      params: { prompt: a },
                    })
                  }
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
                  <Ionicons
                    name="arrow-forward"
                    size={13}
                    color={colors.accent2}
                    style={{ marginLeft: 8 }}
                  />
                </Pressable>
              ))}
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* Foot of the memo. "Share draft" says exactly what it does: it opens the
          share sheet with the document as plain text. Nothing is sent anywhere. */}
      <View
        className="flex-row items-center gap-3 px-4 pt-3 pb-2"
        style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}
      >
        <Button
          variant="secondary"
          onPress={requestDraft}
          leftIcon={<Ionicons name="refresh" size={15} color={colors.fg} />}
        >
          Regenerate
        </Button>
        <View className="flex-1">
          <GradientButton
            fullWidth
            onPress={onShare}
            leftIcon={<Ionicons name="share-outline" size={16} color="#FFFFFF" />}
          >
            Share draft
          </GradientButton>
        </View>
      </View>
    </>,
  );
}
