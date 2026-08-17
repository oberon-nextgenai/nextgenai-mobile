import { Platform } from 'react-native';
import EventSource, { EventSourceListener } from 'react-native-sse';
import { getApiOrigin, getInMemoryToken } from './http';
import { getStoredToken } from './authToken';
import { PATHS } from './paths';

/**
 * Live escalations feed — `GET /api/escalations/stream/:organizationId`.
 *
 * The backend (escalations-stream.service.ts) writes named SSE events: every
 * payload arrives under `event: escalation_update` with the discriminator in
 * the JSON's own `type` field, plus a bare `ping` heartbeat every 15s.
 *
 * Transport split mirrors `sseClient.ts`: `react-native-sse` on native, and
 * `fetch` + stream reader on web — the browser's built-in EventSource cannot
 * send the Bearer header this endpoint authenticates with. Reconnection is
 * owned by the consuming hook, so native disables the library's own retry.
 */

export const ESCALATION_STREAM_EVENT_TYPES = [
  'escalation_created',
  'escalation_sla_reminder',
  'hitl_approval_created',
  'hitl_approval_decided',
] as const;

export interface EscalationStreamPayload {
  /** One of ESCALATION_STREAM_EVENT_TYPES, or 'ping' — treat unknowns as inert. */
  type: string;
  organizationId?: string;
  escalationId?: string;
  approvalId?: string;
  toolName?: string;
  agentId?: string;
  decision?: string;
  title?: string;
  ref?: string;
  severity?: string;
  kind?: string;
  ts?: string;
}

export interface EscalationsStreamHandle {
  close: () => void;
}

export interface OpenEscalationsStreamOptions {
  organizationId: string;
  /** Every parsed `escalation_update` payload; pings are not forwarded. */
  onEvent: (payload: EscalationStreamPayload) => void;
  onError?: (err: unknown) => void;
  /** Server closed the connection (web only — native surfaces it as an error). */
  onClose?: () => void;
}

export async function openEscalationsStream(
  opts: OpenEscalationsStreamOptions,
): Promise<EscalationsStreamHandle> {
  if (Platform.OS === 'web') return openWeb(opts);
  return openNative(opts);
}

async function authHeader(): Promise<Record<string, string>> {
  const token = getInMemoryToken() ?? (await getStoredToken());
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function openNative({
  organizationId,
  onEvent,
  onError,
}: OpenEscalationsStreamOptions): Promise<EscalationsStreamHandle> {
  const auth = await authHeader();
  const es = new EventSource(`${getApiOrigin()}${PATHS.escalations.stream(organizationId)}`, {
    headers: { Accept: 'text/event-stream', ...auth },
    // The hook owns reconnection with backoff; a second retry loop here would
    // stack duplicate connections.
    pollingInterval: 0,
  });

  const updateListener: EventSourceListener = event => {
    const raw = (event as { data?: string | null }).data;
    if (!raw) return;
    try {
      onEvent(JSON.parse(raw) as EscalationStreamPayload);
    } catch (err) {
      onError?.(err);
    }
  };
  es.addEventListener('escalation_update' as 'message', updateListener);
  es.addEventListener('error', err => onError?.(err));

  return { close: () => es.close() };
}

interface ParsedSseEvent {
  event: string;
  data: string;
}

/**
 * Splits complete SSE blocks off the front of `buffer`.
 *
 * Exported for tests. Handles named events (`event:` + `data:` lines) — which
 * is what this endpoint sends and what `sseClient.ts`'s unnamed-event parser
 * would silently drop on the floor.
 */
export function drainSseBuffer(buffer: string): { events: ParsedSseEvent[]; rest: string } {
  const events: ParsedSseEvent[] = [];
  let rest = buffer;
  let idx: number;
  while ((idx = rest.indexOf('\n\n')) !== -1) {
    const block = rest.slice(0, idx);
    rest = rest.slice(idx + 2);

    let event = 'message';
    const dataLines: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }
    if (dataLines.length > 0) events.push({ event, data: dataLines.join('\n') });
  }
  return { events, rest };
}

async function openWeb({
  organizationId,
  onEvent,
  onError,
  onClose,
}: OpenEscalationsStreamOptions): Promise<EscalationsStreamHandle> {
  const controller = new AbortController();
  const auth = await authHeader();
  let closed = false;

  const start = async () => {
    let response: Response;
    try {
      response = await fetch(`${getApiOrigin()}${PATHS.escalations.stream(organizationId)}`, {
        headers: { Accept: 'text/event-stream', ...auth },
        signal: controller.signal,
      });
    } catch (err) {
      if (!closed) onError?.(err);
      return;
    }

    if (!response.ok || !response.body) {
      onError?.(new Error(`HTTP ${response.status}`));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    const dispatch = () => {
      const { events, rest } = drainSseBuffer(buffer);
      buffer = rest;
      for (const { event, data } of events) {
        if (event !== 'escalation_update') continue; // pings and errors are inert
        try {
          onEvent(JSON.parse(data) as EscalationStreamPayload);
        } catch (err) {
          onError?.(err);
        }
      }
    };

    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        dispatch();
      }
      buffer += decoder.decode();
      dispatch();
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
