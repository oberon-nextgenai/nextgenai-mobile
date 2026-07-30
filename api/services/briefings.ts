import { http } from '@/api/client/http';
import { PATHS } from '@/api/client/paths';

/**
 * Operational briefings — one per analytics dashboard the workspace runs.
 *
 * Mirrors `oberon-nextgenai-api/src/modules/briefings/briefing.types.ts`. The
 * shape carries no dashboard-specific vocabulary on purpose: a workspace that
 * installs a new dashboard gets its morning read here with no mobile release.
 *
 * `briefings: []` means "this workspace runs no dashboard that reports one".
 * A provider that exists but could not be read comes back in `unavailable` —
 * the UI must not render that as a clean morning.
 */
export type BriefingTone = 'neutral' | 'positive' | 'negative' | 'warning';

export interface BriefingStat {
  key: string;
  label: string;
  value: number;
  /** Absolute movement against the prior period. Absent means "not derivable". */
  delta?: number;
  tone?: BriefingTone;
}

export interface BriefingItem {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  tone?: BriefingTone;
}

export interface BriefingGroup {
  key: string;
  label: string;
  items: BriefingItem[];
}

export interface OperationalBriefing {
  provider: string;
  title: string;
  date: string;
  headline: string;
  stats: BriefingStat[];
  groups: BriefingGroup[];
  primePrompt?: string;
  cached: boolean;
}

export interface BriefingUnavailable {
  provider: string;
  title: string;
}

export interface BriefingsResponse {
  organizationId: string;
  briefings: OperationalBriefing[];
  unavailable: BriefingUnavailable[];
}

export async function fetchBriefings(organizationId: string): Promise<BriefingsResponse> {
  const { data } = await http.get<BriefingsResponse>(PATHS.briefings.list(organizationId));
  return data;
}
