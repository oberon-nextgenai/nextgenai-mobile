import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { useOrgStore } from '@/store/org';

/**
 * Hydrate persisted stores on app boot. Returns `true` once SecureStore
 * and AsyncStorage have been read and stores are populated.
 */
export function useAppInit() {
  const [ready, setReady] = useState(false);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateOrg = useOrgStore((s) => s.hydrate);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([hydrateAuth(), hydrateOrg()]);
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateAuth, hydrateOrg]);

  return ready;
}
