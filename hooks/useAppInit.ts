import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { useOrgStore } from '@/store/org';
import { useToolResults } from '@/store/toolResults';

/**
 * Hydrate persisted stores on app boot. Returns `true` once SecureStore
 * and AsyncStorage have been read and stores are populated.
 */
export function useAppInit() {
  const [ready, setReady] = useState(false);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateOrg = useOrgStore((s) => s.hydrate);
  const hydrateToolResults = useToolResults((s) => s.hydrate);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // toolResults uses the same manual hydrate() pattern as auth/org (see
      // store/toolResults.ts) rather than zustand's `persist` middleware —
      // waited on here so a cold-start deep link into /tool-result/[id] never
      // races the AsyncStorage read.
      await Promise.all([hydrateAuth(), hydrateOrg(), hydrateToolResults()]);
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateAuth, hydrateOrg, hydrateToolResults]);

  return ready;
}
