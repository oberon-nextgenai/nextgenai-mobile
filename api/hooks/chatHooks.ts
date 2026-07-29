import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { PATHS } from '@/api/client/paths';
import { openPrimeStream } from '@/api/client/sseClient';
import { fetchAvailableTools, fetchPrimeHistory } from '@/api/services/chat';
import { QUERY_KEYS } from '@/lib/constants';
import {
  PrimeStructuredResponse,
  tryParsePrimeStructured,
  pickFallbackMarkdown,
} from '@/lib/primeStructuredSchema';
import { invalidateForTool } from '@/lib/toolInvalidations';
import { useToolResults } from '@/store/toolResults';
import { useNotifications } from '@/store/notifications';
import type { ToolAvailable } from '@/api/services/types';

export interface ToolCallRecord {
  id: string;
  name: string;
  arguments?: unknown;
  status: 'pending' | 'success' | 'error';
  result?: unknown;
  error?: unknown;
  /** OpenAI streaming index — used only to merge fragmented `tool_call` deltas. */
  streamIndex?: number;
}

export interface PrimeMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  format?: 'text' | 'structured';
  structured?: PrimeStructuredResponse | null;
  /** Markdown fallback rendered when `format === 'structured'` but `structured` is null. */
  fallbackMarkdown?: string | null;
  toolCalls?: ToolCallRecord[];
  /**
   * Prime's own narration between tool calls, from the `status` SSE event
   * ("Executing tools…"). Transient: set while streaming, cleared on `complete`.
   * Rendered as the trailing in-flight row of `PrimeToolPanel`.
   */
  statusMessage?: string;
  timestamp: number;
  status?: 'sending' | 'streaming' | 'complete' | 'error';
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useAvailableTools(orgId: string | null) {
  return useQuery({
    queryKey: orgId ? QUERY_KEYS.primeTools(orgId) : ['prime', 'tools', 'none'],
    enabled: Boolean(orgId),
    queryFn: () => fetchAvailableTools(orgId as string),
    staleTime: 5 * 60_000,
  });
}

export function usePrimeHistory(orgId: string | null) {
  return useQuery({
    queryKey: orgId ? QUERY_KEYS.primeHistory(orgId) : ['prime', 'history', 'none'],
    enabled: Boolean(orgId),
    queryFn: () => fetchPrimeHistory(orgId as string),
    staleTime: 30_000,
  });
}

/**
 * Drives the Prime chat experience. Mirrors the web hook's contract but
 * substitutes react-native-sse for fetch-stream, drops save-on-complete
 * (backend already persists both messages), and filters out `system` roles
 * before POSTing (backend DTO rejects them).
 */
export interface UsePrimeChatOptions {
  /** Called when an assistant reply completes, with the backend's speakable text (for voice). */
  onAssistantComplete?: (speakableText: string) => void;
}

/**
 * How long a turn may go without any SSE event before it is treated as dead.
 *
 * Generous on purpose: Prime fans out to tools that can legitimately take tens of
 * seconds, and the timer is re-armed on every event, so only real silence trips it.
 */
const STREAM_IDLE_TIMEOUT_MS = 90_000;

/** Where the turn-summary toast lands when more than one tool ran. */
const PRIME_CHAT_ROUTE = '/(root)/(tabs)/prime';

export function usePrimeChat(orgId: string | null, options: UsePrimeChatOptions = {}) {
  const qc = useQueryClient();
  const router = useRouter();
  const addToolResult = useToolResults((s) => s.add);
  const addNotification = useNotifications((s) => s.add);
  // Keep the latest completion callback so the async stream fires the current one.
  const onAssistantCompleteRef = useRef(options.onAssistantComplete);
  onAssistantCompleteRef.current = options.onAssistantComplete;
  const [messages, setMessages] = useState<PrimeMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const streamRef = useRef<{ close: () => void } | null>(null);
  const currentAssistantIdRef = useRef<string | null>(null);

  const toolsQuery = useAvailableTools(orgId);
  const availableTools: ToolAvailable[] = toolsQuery.data?.tools ?? [];

  const closeStream = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.close();
      } catch {
        // ignore
      }
      streamRef.current = null;
    }
  }, []);

  // Clean up the stream if the org changes or the component unmounts.
  useEffect(() => {
    return () => closeStream();
  }, [orgId, closeStream]);

  const handleSubmit = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? inputValue).trim();
      if (!text || !orgId || isStreaming) return;

      const userMsg: PrimeMessage = {
        id: genId(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
        status: 'complete',
      };
      const assistantMsg: PrimeMessage = {
        id: genId(),
        role: 'assistant',
        content: '',
        format: 'text',
        timestamp: Date.now(),
        status: 'streaming',
        toolCalls: [],
      };
      currentAssistantIdRef.current = assistantMsg.id;

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInputValue('');
      setIsStreaming(true);
      setStreamingContent('');

      // Filter to user/assistant only — backend DTO rejects `system` (chat-request.dto.ts:7-9).
      const payload = {
        messages: [...messages, userMsg]
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        organizationId: orgId,
        useTools: true,
        mode: 'console' as const,
      };

      let aggregatedContent = '';

      // A turn ends exactly once, whichever way it ends. Previously only the
      // `complete` and `error` SSE events cleared `isStreaming`; a connection that
      // simply closed — a recycled pod, a dropped network — left the composer
      // disabled until the app was killed and reopened.
      let turnEnded = false;
      let idleTimer: ReturnType<typeof setTimeout> | null = null;

      // Successful tool runs are coalesced into a single toast at end of turn —
      // a four-tool turn used to stack four toasts on top of four notification-inbox
      // entries. The inbox still gets one entry per result (`addNotification` below,
      // untouched); only this transient summary batches. Errors are excluded and
      // keep firing individually — they need attention, not a batch average.
      let successfulToolNames: string[] = [];
      let lastSuccessToolResultId: string | null = null;
      let toastFlushed = false;

      const clearIdleTimer = () => {
        if (idleTimer) {
          clearTimeout(idleTimer);
          idleTimer = null;
        }
      };

      /** Fires once per turn, however it ends — clean finish, idle timeout, or a bare close. */
      const flushTurnToast = () => {
        if (toastFlushed) return;
        toastFlushed = true;
        if (successfulToolNames.length === 0) return;

        const count = successfulToolNames.length;
        const single = count === 1;
        // Single tool: same place its notification-inbox entry points to
        // (`/tool-result/<id>`, set below). Several tools: no one screen owns all
        // of them, so fall back to the chat thread that ran them.
        const destination =
          single && lastSuccessToolResultId
            ? `/tool-result/${lastSuccessToolResultId}`
            : PRIME_CHAT_ROUTE;

        Toast.show({
          type: 'success',
          text1: single ? successfulToolNames[0] : 'Prime',
          text2: single ? 'Tap to review the result' : `Ran ${count} tools · tap to review`,
          onPress: () => {
            Toast.hide();
            router.push(destination as never);
          },
        });
      };

      /** Clean finish — suppresses the close and watchdog fallbacks. */
      const endTurn = () => {
        turnEnded = true;
        clearIdleTimer();
        flushTurnToast();
      };

      /** The stream died without ever completing. */
      const failTurn = (reason: string) => {
        if (turnEnded) return;
        turnEnded = true;
        clearIdleTimer();
        flushTurnToast();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === currentAssistantIdRef.current
              ? { ...m, status: 'error', content: aggregatedContent || reason }
              : m,
          ),
        );
        setIsStreaming(false);
        setStreamingContent('');
        closeStream();
      };

      // Re-armed on every event, so a long tool round-trip never trips it.
      const armIdleTimer = () => {
        clearIdleTimer();
        idleTimer = setTimeout(
          () => failTurn('Prime stopped responding. Try again.'),
          STREAM_IDLE_TIMEOUT_MS,
        );
      };
      armIdleTimer();
      let finalStructured: PrimeStructuredResponse | null = null;
      let finalFallbackMarkdown: string | null = null;
      let currentFormat: 'text' | 'structured' = 'text';

      const onMessage = (data: unknown) => {
        // Any traffic means the turn is alive — push the silence deadline out.
        armIdleTimer();
        const event = data as { type?: string; [k: string]: unknown };
        switch (event.type) {
          case 'format': {
            const fmt = (event as { format?: string }).format;
            if (fmt === 'structured' || fmt === 'text') {
              currentFormat = fmt;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === currentAssistantIdRef.current ? { ...m, format: fmt } : m,
                ),
              );
            }
            break;
          }
          case 'status': {
            // Backend shape is `{ type: 'status', message: string }`
            // (chat.service.ts:255, :397). Park it on the streaming message so
            // PrimeToolPanel can render it as the trailing in-flight step; the
            // `complete` handler clears it. Purely additive — it does not touch
            // content, tool calls or the structured parse.
            const hint = (event as { message?: unknown }).message;
            if (typeof hint === 'string' && hint.trim()) {
              const text = hint.trim();
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === currentAssistantIdRef.current
                    ? { ...m, statusMessage: text }
                    : m,
                ),
              );
            }
            break;
          }
          case 'content': {
            const chunk = (event as { content?: string }).content ?? '';
            aggregatedContent += chunk;
            setStreamingContent(aggregatedContent);
            break;
          }
          case 'structured': {
            const raw =
              (event as { structured?: unknown }).structured ??
              (event as { data?: unknown }).data ??
              event;
            const parsed = tryParsePrimeStructured(raw);
            if (parsed) {
              finalStructured = parsed;
            } else {
              const fallback = pickFallbackMarkdown(raw);
              if (fallback) finalFallbackMarkdown = fallback;
            }
            break;
          }
          case 'tool_call': {
            // OpenAI streams each tool call fragmented across many deltas under
            // `tool_calls` (keyed by `index`); the backend forwards those deltas
            // verbatim. Merge by `index` so one call = one record, accumulating
            // the name as it arrives — instead of appending a bogus "tool" badge
            // per delta (which produced dozens of unnamed pills).
            const deltas = (
              event as {
                tool_calls?: Array<{
                  index?: number;
                  id?: string;
                  function?: { name?: string; arguments?: string };
                }>;
              }
            ).tool_calls;

            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== currentAssistantIdRef.current) return m;
                const existing = m.toolCalls ?? [];

                // Fallback for a simple {name|tool} event shape.
                if (!deltas || deltas.length === 0) {
                  const name =
                    (event as { name?: string; tool?: string }).name ??
                    (event as { tool?: string }).tool;
                  if (!name) return m;
                  const id = (event as { id?: string }).id ?? genId();
                  return {
                    ...m,
                    toolCalls: [...existing, { id, name, status: 'pending' as const }],
                  };
                }

                const next = [...existing];
                for (const d of deltas) {
                  const idx = d.index ?? 0;
                  const pos = next.findIndex((tc) => tc.streamIndex === idx);
                  if (pos === -1) {
                    next.push({
                      id: d.id ?? genId(),
                      name: d.function?.name ?? '',
                      status: 'pending',
                      streamIndex: idx,
                    });
                  } else {
                    const cur = next[pos];
                    next[pos] = {
                      ...cur,
                      id: d.id ?? cur.id,
                      name: (cur.name ?? '') + (d.function?.name ?? ''),
                    };
                  }
                }
                return { ...m, toolCalls: next };
              }),
            );
            break;
          }
          case 'tool_results': {
            const results = (event as { results?: Array<{ id?: string; name?: string; toolName?: string; result?: unknown; error?: unknown; arguments?: unknown }> }).results ?? [];
            for (const r of results) {
              const id = r.id ?? genId();
              const name = r.name ?? r.toolName ?? 'tool';
              const status: ToolCallRecord['status'] = r.error ? 'error' : 'success';

              const calledAt = Date.now();
              addToolResult({
                id,
                toolName: name,
                arguments: r.arguments,
                result: r.result,
                error: r.error,
              });

              if (status === 'success') {
                invalidateForTool(qc, name, orgId);
                // `tool` + `at` ride along so the result screen can fall back to
                // the audit trail if this notification is tapped after the local
                // LRU has evicted the result — see app/(root)/tool-result/[id].tsx.
                addNotification({
                  type: 'prime',
                  title: `Prime ran ${name}`,
                  body: 'Tap to view the result.',
                  deepLink: `/tool-result/${id}?tool=${encodeURIComponent(name)}&at=${calledAt}`,
                  meta: { toolName: name },
                });
                // No toast here — successes are batched into one summary toast
                // when the turn ends (`flushTurnToast`, above). The notification
                // inbox above still gets its own entry per result, unchanged.
                successfulToolNames.push(name);
                lastSuccessToolResultId = id;
              } else {
                // Errors are not batched — each needs its own attention.
                Toast.show({
                  type: 'error',
                  text1: name,
                  text2: 'Tool returned an error.',
                });
              }

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === currentAssistantIdRef.current
                    ? {
                        ...m,
                        toolCalls: (m.toolCalls ?? []).map((tc) =>
                          tc.id === id || tc.name === name
                            ? { ...tc, status, result: r.result, error: r.error }
                            : tc,
                        ),
                      }
                    : m,
                ),
              );
            }
            break;
          }
          case 'complete': {
            // Backend `complete` event carries the canonical assistant message;
            // some servers also include `structured` / `fallbackMarkdown` at the
            // top level. Use it as a last-chance source if we never saw a
            // standalone `structured` event.
            const completeMsg =
              (event as {
                message?: {
                  content?: string;
                  structured?: unknown;
                  fallbackMarkdown?: string | null;
                  speakableText?: string;
                };
              }).message;
            if (!finalStructured && completeMsg?.structured) {
              const parsed = tryParsePrimeStructured(completeMsg.structured);
              if (parsed) finalStructured = parsed;
              else {
                const fb = pickFallbackMarkdown(completeMsg.structured);
                if (fb) finalFallbackMarkdown = fb;
              }
            }
            if (!finalFallbackMarkdown && completeMsg?.fallbackMarkdown) {
              finalFallbackMarkdown = completeMsg.fallbackMarkdown;
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAssistantIdRef.current
                  ? {
                      ...m,
                      content: aggregatedContent,
                      structured: finalStructured,
                      fallbackMarkdown: finalFallbackMarkdown,
                      format: currentFormat,
                      status: 'complete',
                      // The working hint is transient — the turn is done.
                      statusMessage: undefined,
                      // Drop any fragment that never resolved to a real tool name.
                      toolCalls: (m.toolCalls ?? []).filter((tc) => tc.name.trim() !== ''),
                    }
                  : m,
              ),
            );
            // NOTE: Do not call /api/chat/save-prime-console-message — backend
            // already persists user + assistant during streamMessage.
            endTurn();
            setIsStreaming(false);
            setStreamingContent('');
            closeStream();
            // Hand the backend-derived speakable text to the voice layer (once).
            if (completeMsg?.speakableText) {
              onAssistantCompleteRef.current?.(completeMsg.speakableText);
            }
            break;
          }
          case 'error': {
            const msg =
              (event as { error?: string; message?: string }).error ??
              (event as { message?: string }).message ??
              'Prime encountered an error.';
            Toast.show({ type: 'error', text1: 'Prime error', text2: msg });
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAssistantIdRef.current
                  ? { ...m, status: 'error', content: aggregatedContent || msg }
                  : m,
              ),
            );
            // This is an end-of-turn path too — flush any tool successes that
            // already landed before the backend reported the error, and clear
            // the idle timer so it cannot re-fire failTurn after the fact.
            endTurn();
            setIsStreaming(false);
            setStreamingContent('');
            closeStream();
            break;
          }
          default: {
            // Unknown event type — degrade gracefully rather than dropping it
            // silently, so a newly-added backend SSE event is noticed in dev
            // instead of vanishing (keeps the streaming contract observable).
            if (__DEV__) {
              console.warn(
                '[Prime] Unhandled stream event type:',
                (event as { type?: string }).type,
              );
            }
            break;
          }
        }
      };

      try {
        const es = await openPrimeStream({
          path: PATHS.chat.stream,
          body: payload,
          onMessage,
          onError: (err) => {
            const errMsg =
              err instanceof Error
                ? err.message
                : typeof err === 'string'
                  ? err
                  : 'Stream error';
            // Surface the real error so future regressions are diagnosable.
            // eslint-disable-next-line no-console
            console.error('[prime stream]', err);
            Toast.show({
              type: 'error',
              text1: 'Prime stream error',
              text2: errMsg,
            });
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAssistantIdRef.current
                  ? {
                      ...m,
                      status: 'error',
                      content: aggregatedContent || errMsg,
                    }
                  : m,
              ),
            );
            endTurn();
            setIsStreaming(false);
            setStreamingContent('');
            closeStream();
          },
          // A close with no `complete` and no `error` is the case that used to
          // lock the composer permanently.
          onClose: () => failTurn('Prime disconnected before finishing.'),
        });
        streamRef.current = es;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[prime stream] open failed', err);
        Toast.show({
          type: 'error',
          text1: 'Could not start chat',
          text2: (err as Error).message,
        });
        // Never got past opening the stream, so there is nothing to flush — but
        // still retire the idle timer armed above so it cannot fire later.
        endTurn();
        setIsStreaming(false);
      }
    },
    [inputValue, isStreaming, messages, orgId, qc, router, addToolResult, addNotification, closeStream],
  );

  const clearMessages = useCallback(() => {
    closeStream();
    setMessages([]);
    setStreamingContent('');
    setIsStreaming(false);
  }, [closeStream]);

  const seedFromHistory = useCallback((history: PrimeMessage[]) => {
    setMessages(history);
  }, []);

  return {
    messages,
    inputValue,
    setInputValue,
    isStreaming,
    streamingContent,
    availableTools,
    handleSubmit,
    clearMessages,
    seedFromHistory,
  };
}
