import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import EventSource, { EventSourceListener } from 'react-native-sse';
import { getApiOrigin, getInMemoryToken } from './http';
import { getStoredToken } from './authToken';

export interface OpenPrimeStreamOptions<TPayload> {
  /** Path relative to API origin, e.g. PATHS.chat.stream */
  path: string;
  /** JSON-serializable POST body */
  body: TPayload;
  /** Called with the raw parsed JSON of every SSE data line on the default `message` event */
  onMessage: (data: unknown) => void;
  onError?: (err: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  /** Extra request headers, merged after defaults */
  headers?: Record<string, string>;
}

export interface PrimeStreamHandle {
  close: () => void;
}

/**
 * Opens a POST-based SSE stream for the Prime chat endpoint.
 *
 * The backend writes unnamed `data: {"type":"..."}` lines, so we listen
 * on the default `message` event and parse `event.data` ourselves.
 *
 * Transport split:
 *   - Web: native `fetch(...)` + `ReadableStream.getReader()` + `TextDecoder`.
 *     `react-native-sse` is unreliable in Chrome because the backend serves
 *     `201 Created` + chunked `text/event-stream`, which trips its XHR path.
 *   - iOS / Android: `react-native-sse` with `pollingInterval: 0` so a
 *     dropped POST connection doesn't auto-reconnect and replay write-capable
 *     tool calls.
 */
export async function openPrimeStream<TPayload>(
  opts: OpenPrimeStreamOptions<TPayload>,
): Promise<PrimeStreamHandle> {
  if (Platform.OS === 'web') {
    return openPrimeStreamWeb(opts);
  }
  return openPrimeStreamNative(opts);
}

async function authHeader(): Promise<Record<string, string>> {
  const token = getInMemoryToken() ?? (await getStoredToken());
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function openPrimeStreamNative<TPayload>({
  path,
  body,
  onMessage,
  onError,
  onOpen,
  onClose,
  headers,
}: OpenPrimeStreamOptions<TPayload>): Promise<PrimeStreamHandle> {
  const auth = await authHeader();
  const es = new EventSource(`${getApiOrigin()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...auth,
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
    pollingInterval: 0,
  });

  const messageListener: EventSourceListener = (event) => {
    if (event.type !== 'message') return;
    const raw = (event as { data?: string | null }).data;
    if (!raw) return;
    try {
      onMessage(JSON.parse(raw));
    } catch (err) {
      onError?.(err);
    }
  };
  const errorListener: EventSourceListener = (event) => onError?.(event);
  const openListener: EventSourceListener = () => onOpen?.();
  const closeListener: EventSourceListener = () => onClose?.();

  es.addEventListener('message', messageListener);
  es.addEventListener('error', errorListener);
  es.addEventListener('open', openListener);
  es.addEventListener('close', closeListener);

  return { close: () => es.close() };
}

async function openPrimeStreamWeb<TPayload>({
  path,
  body,
  onMessage,
  onError,
  onOpen,
  onClose,
  headers,
}: OpenPrimeStreamOptions<TPayload>): Promise<PrimeStreamHandle> {
  const controller = new AbortController();
  const auth = await authHeader();
  let closed = false;

  const start = async () => {
    let response: Response;
    try {
      response = await fetch(`${getApiOrigin()}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...auth,
          ...(headers ?? {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      if (!closed) onError?.(err);
      return;
    }

    if (!response.ok) {
      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch {
        // ignore
      }
      onError?.(
        new Error(
          `HTTP ${response.status}${bodyText ? `: ${bodyText.slice(0, 200)}` : ''}`,
        ),
      );
      return;
    }
    if (!response.body) {
      onError?.(new Error('Streaming not supported by this browser'));
      return;
    }

    onOpen?.();

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    const flushEvents = () => {
      // SSE event boundary is a blank line.
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        // Each event is one or more lines; we only care about `data:` lines.
        const dataLines = rawEvent
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart());
        if (dataLines.length === 0) continue;
        const dataText = dataLines.join('\n');
        if (!dataText) continue;
        try {
          onMessage(JSON.parse(dataText));
        } catch (err) {
          // A non-JSON SSE line (e.g. heartbeat comment) — swallow.
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.warn('[sse] non-JSON event', dataText, err);
          }
        }
      }
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        flushEvents();
      }
      // Flush any remaining decoder state.
      buffer += decoder.decode();
      flushEvents();
    } catch (err) {
      if (!closed) onError?.(err);
      return;
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // ignore
      }
      if (!closed) onClose?.();
    }
  };

  // Fire-and-forget; caller closes via the returned handle.
  void start();

  return {
    close: () => {
      closed = true;
      try {
        controller.abort();
      } catch {
        // ignore
      }
    },
  };
}

/**
 * Subscribes to a GET-based SSE endpoint (e.g. analytics stream).
 * Uses `react-native-sse` on native and the browser's native `EventSource`
 * on web — but analytics SSE on web is gated off in `useAnalyticsStream`
 * for v1 because the native EventSource cannot send a Bearer header.
 */
export interface OpenAnalyticsStreamOptions {
  path: string;
  onAnalyticsUpdate: (data: unknown) => void;
  onPing?: () => void;
  onError?: (err: unknown) => void;
}

export async function openAnalyticsStream({
  path,
  onAnalyticsUpdate,
  onPing,
  onError,
}: OpenAnalyticsStreamOptions): Promise<PrimeStreamHandle> {
  const auth = await authHeader();
  const es = new EventSource(`${getApiOrigin()}${path}`, {
    headers: {
      Accept: 'text/event-stream',
      ...auth,
    },
  });

  es.addEventListener('analytics_update' as 'message', (event) => {
    const raw = (event as { data?: string | null }).data;
    if (!raw) return;
    try {
      onAnalyticsUpdate(JSON.parse(raw));
    } catch (err) {
      onError?.(err);
    }
  });
  es.addEventListener('ping' as 'message', () => {
    onPing?.();
  });
  es.addEventListener('error', (err) => onError?.(err));

  return { close: () => es.close() };
}
