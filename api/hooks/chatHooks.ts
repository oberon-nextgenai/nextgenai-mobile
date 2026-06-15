import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
export function usePrimeChat(orgId: string | null) {
  const qc = useQueryClient();
  const addToolResult = useToolResults((s) => s.add);
  const addNotification = useNotifications((s) => s.add);
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
      let finalStructured: PrimeStructuredResponse | null = null;
      let finalFallbackMarkdown: string | null = null;
      let currentFormat: 'text' | 'structured' = 'text';

      const onMessage = (data: unknown) => {
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
          case 'status':
            // Optional Prime "thinking" updates — surface as transient hint if desired
            break;
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
            const id =
              (event as { id?: string }).id ?? genId();
            const name = (event as { name?: string; tool?: string }).name ?? (event as { tool?: string }).tool ?? 'tool';
            const args = (event as { arguments?: unknown; args?: unknown }).arguments ??
              (event as { args?: unknown }).args;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === currentAssistantIdRef.current
                  ? {
                      ...m,
                      toolCalls: [
                        ...(m.toolCalls ?? []),
                        { id, name, arguments: args, status: 'pending' },
                      ],
                    }
                  : m,
              ),
            );
            break;
          }
          case 'tool_results': {
            const results = (event as { results?: Array<{ id?: string; name?: string; toolName?: string; result?: unknown; error?: unknown; arguments?: unknown }> }).results ?? [];
            for (const r of results) {
              const id = r.id ?? genId();
              const name = r.name ?? r.toolName ?? 'tool';
              const status: ToolCallRecord['status'] = r.error ? 'error' : 'success';

              addToolResult({
                id,
                toolName: name,
                arguments: r.arguments,
                result: r.result,
                error: r.error,
              });

              if (status === 'success') {
                invalidateForTool(qc, name, orgId);
                addNotification({
                  type: 'prime',
                  title: `Prime ran ${name}`,
                  body: 'Tap to view the result.',
                  deepLink: `/tool-result/${id}`,
                  meta: { toolName: name },
                });
                Toast.show({
                  type: 'success',
                  text1: `Prime: ${name}`,
                  text2: 'Updated successfully.',
                });
              } else {
                Toast.show({
                  type: 'error',
                  text1: `Prime: ${name}`,
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
              (event as { message?: { content?: string; structured?: unknown; fallbackMarkdown?: string | null } })
                .message;
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
                    }
                  : m,
              ),
            );
            // NOTE: Do not call /api/chat/save-prime-console-message — backend
            // already persists user + assistant during streamMessage.
            setIsStreaming(false);
            setStreamingContent('');
            closeStream();
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
            setIsStreaming(false);
            setStreamingContent('');
            closeStream();
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
            setIsStreaming(false);
            setStreamingContent('');
            closeStream();
          },
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
        setIsStreaming(false);
      }
    },
    [inputValue, isStreaming, messages, orgId, qc, addToolResult, addNotification, closeStream],
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
