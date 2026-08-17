import { useEffect, useRef } from 'react';
import {
  openEscalationsStream,
  type EscalationsStreamHandle,
} from '@/api/client/escalationsStream';
import { useInvalidateEscalations } from '@/api/hooks/escalationHooks';
// DEMO ONLY — DO NOT MERGE: while the fixture deck serves the Approvals tab
// there is nothing live to stream, and a real event mid-demo would contradict
// the rehearsed queue.
import { DEMO_APPROVALS } from '@/api/demo/flags';
import { useAuthStore } from '@/store/auth';

/** First retry after a second; doubles to a ceiling so an API deploy doesn't hammer. */
const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

/**
 * Keeps the Approvals badge and list live.
 *
 * Subscribes to the org's escalations SSE stream and turns every event —
 * created, decided, SLA reminder, HITL approval — into a React Query
 * invalidation of the escalation views. The 20s-stale polling stays as the
 * fallback for users whose connection drops; this hook just makes the badge
 * move the moment something happens instead of on the next refocus.
 *
 * Mounted once, in the tabs layout, next to the badge it feeds.
 */
export function useEscalationsStream(orgId: string | null): void {
  const token = useAuthStore(s => s.token);
  const invalidate = useInvalidateEscalations(orgId);
  // The invalidator is a fresh closure each render; the ref keeps the effect
  // from tearing the connection down every time the component re-renders.
  const invalidateRef = useRef(invalidate);
  invalidateRef.current = invalidate;

  useEffect(() => {
    if (DEMO_APPROVALS || !orgId || !token) return;

    let closed = false;
    let handle: EscalationsStreamHandle | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let retryMs = RECONNECT_MIN_MS;

    const scheduleReconnect = () => {
      if (closed || timer) return;
      timer = setTimeout(() => {
        timer = null;
        handle?.close();
        handle = null;
        connect();
      }, retryMs);
      retryMs = Math.min(retryMs * 2, RECONNECT_MAX_MS);
    };

    const connect = () => {
      if (closed) return;
      void openEscalationsStream({
        organizationId: orgId,
        onEvent: () => {
          // A delivered event proves the stream is healthy again.
          retryMs = RECONNECT_MIN_MS;
          invalidateRef.current();
        },
        onError: scheduleReconnect,
        onClose: scheduleReconnect,
      }).then(h => {
        if (closed) h.close();
        else handle = h;
      });
    };

    connect();

    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      handle?.close();
    };
  }, [orgId, token]);
}
