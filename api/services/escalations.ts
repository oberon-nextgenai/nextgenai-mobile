import { http } from '@/api/client/http';
import { PATHS } from '@/api/client/paths';
// DEMO ONLY — DO NOT MERGE: local fixtures for the Toshiba board demo.
import { APPROVALS_PIPELINE_LIVE, DEMO_APPROVALS } from '@/api/demo/flags';
import {
  demoApproveEscalation,
  demoAssignEscalation,
  demoFetchEscalation,
  demoFetchEscalationCounts,
  demoFetchEscalations,
  demoRejectEscalation,
} from '@/api/demo/approvalsDemo';

/**
 * DEMO ONLY — DO NOT MERGE: overlay routing.
 *
 * With both flags on, the queue is fixtures ∪ live: every fixture id starts
 * with `demo-`, real ids are Mongo ObjectIds, so one prefix test routes any
 * per-item call (detail/assign/decide) to the right world. List and counts
 * merge both; a live-side failure falls back to fixtures alone — the board
 * demo must survive a backend outage.
 */
const isDemoId = (id: string) => id.startsWith('demo-');

/**
 * Escalations + approvals — the human triage queue.
 *
 * Mirrors `oberon-nextgenai-api/src/modules/escalations`. Every call is
 * org-scoped: the backend rejects a non-member with 403 before it touches the
 * database, so `organizationId` is required rather than optional here.
 */

export type EscalationSeverity = 'critical' | 'high' | 'medium' | 'low';
export type EscalationStatus = 'open' | 'assigned' | 'resolved' | 'rejected' | 'expired';
export type EscalationKind =
  | 'customer'
  | 'cost_anomaly'
  | 'sla_risk'
  | 'policy_exception'
  | 'compliance'
  | 'workflow_failure'
  /** A HITL-gated tool waiting on a one-time grant (ND-1353). */
  | 'tool_approval';

export type ApprovalDecision = 'pending' | 'approved' | 'rejected';
export type ApprovalAuthMethod = 'password' | 'sso' | 'biometric_sso' | 'api_key';

/** `approval.action` value that marks a HITL tool grant, vs. a manager handoff. */
export const TOOL_GRANT_ACTION = 'tool_grant';

export type GrantStatus = 'none' | 'issued' | 'consumed' | 'expired' | 'revoked';

export interface Escalation {
  _id: string;
  organizationId: string;
  /** Human-facing reference, e.g. `ESC-2451`. */
  ref: string;
  severity: EscalationSeverity;
  kind: EscalationKind;
  title: string;
  context?: string;
  agentId?: string;
  agentName?: string;
  conversationId?: string;
  accountId?: string;
  accountName?: string;
  /** Always a number — the backend defaults it to 0. */
  impactAmount: number;
  currency: string;
  status: EscalationStatus;
  assigneeId?: string;
  /** ISO string over HTTP. */
  slaDueAt: string;
  resolvedAt?: string;
  createdAt: string;
  source?: Record<string, unknown>;
}

export interface Approval {
  _id: string;
  organizationId: string;
  escalationId: string;
  action: string;
  policyRef?: string;
  recommendation?: string;
  projections: { label: string; probability: number }[];
  decision: ApprovalDecision;
  decidedBy?: string;
  decidedByEmail?: string;
  decidedAt?: string;
  authMethod?: ApprovalAuthMethod;
  note?: string;
  reverseWindowEndsAt?: string;
  auditId?: string;
  createdAt: string;
  // ── HITL tool grants (present when action === TOOL_GRANT_ACTION) ─────────
  /** The gated tool awaiting a grant, e.g. `send_new_email`. */
  toolName?: string;
  /**
   * Frozen tool args at request time. Server-redacted for display; the client
   * redacts again before rendering as a belt. `grantToken` is agent-only and
   * never appears in client responses.
   */
  actionPayload?: Record<string, unknown>;
  payloadHash?: string;
  grantStatus?: GrantStatus;
  consumedAt?: string;
  executionType?: 'email' | 'chat' | 'voice' | 'api' | 'other';
}

export interface EscalationCounts {
  total: number;
  critical: number;
  slaRisk: number;
  /** Assigned to the caller. */
  mine: number;
  /** Assigned to anyone — the queue is being worked, not necessarily by you. */
  watching: number;
}

export interface EscalationPage {
  data: Escalation[];
  /** Opaque keyset cursor. Null on the last page. */
  nextCursor: string | null;
}

export interface EscalationDetail {
  escalation: Escalation;
  approval: Approval | null;
}

export interface EscalationDecisionResult {
  escalation: Escalation;
  approval: Approval;
}

export interface ListEscalationsParams {
  organizationId: string;
  status?: EscalationStatus;
  severity?: EscalationSeverity;
  /** `me` resolves to the caller server-side. */
  assigneeId?: string;
  cursor?: string;
  limit?: number;
}

async function fetchLiveEscalations(params: ListEscalationsParams): Promise<EscalationPage> {
  const { data } = await http.get<EscalationPage>(PATHS.escalations.list, {
    params,
    suppressErrorToast: DEMO_APPROVALS, // overlay: a live outage degrades silently to fixtures
  });
  return data;
}

/**
 * Merged queue idiom: same ordering the server uses — SLA pressure first, then
 * dollar impact — so fixture and live items interleave where they belong
 * instead of one world stacking on top of the other.
 */
function sortQueue(items: Escalation[]): Escalation[] {
  return [...items].sort((a, b) => {
    const dueDelta = new Date(a.slaDueAt).getTime() - new Date(b.slaDueAt).getTime();
    if (dueDelta !== 0) return dueDelta;
    return b.impactAmount - a.impactAmount;
  });
}

export async function fetchEscalations(params: ListEscalationsParams): Promise<EscalationPage> {
  if (!DEMO_APPROVALS) {
    const { data } = await http.get<EscalationPage>(PATHS.escalations.list, { params });
    return data;
  }
  if (!APPROVALS_PIPELINE_LIVE) return demoFetchEscalations(params); // DEMO ONLY — DO NOT MERGE

  // DEMO ONLY — DO NOT MERGE: fixtures ∪ live. Fixtures are injected on the
  // first page only — cursor pages are the live keyset continuing, and
  // re-injecting the deck there would duplicate it.
  if (params.cursor) {
    return fetchLiveEscalations(params).catch(() => ({ data: [], nextCursor: null }));
  }
  const [demo, live] = await Promise.allSettled([
    demoFetchEscalations(params),
    fetchLiveEscalations(params),
  ]);
  const demoPage = demo.status === 'fulfilled' ? demo.value : { data: [], nextCursor: null };
  if (live.status !== 'fulfilled') return demoPage;
  return {
    data: sortQueue([...demoPage.data, ...live.value.data]),
    nextCursor: live.value.nextCursor,
  };
}

export async function fetchEscalationCounts(organizationId: string): Promise<EscalationCounts> {
  if (!DEMO_APPROVALS) {
    const { data } = await http.get<EscalationCounts>(PATHS.escalations.counts, {
      params: { organizationId },
    });
    return data;
  }
  if (!APPROVALS_PIPELINE_LIVE) return demoFetchEscalationCounts(organizationId); // DEMO ONLY — DO NOT MERGE

  // DEMO ONLY — DO NOT MERGE: the badge counts both worlds.
  const [demo, live] = await Promise.allSettled([
    demoFetchEscalationCounts(organizationId),
    http
      .get<EscalationCounts>(PATHS.escalations.counts, {
        params: { organizationId },
        suppressErrorToast: true,
      })
      .then(r => r.data),
  ]);
  const demoCounts =
    demo.status === 'fulfilled'
      ? demo.value
      : { total: 0, critical: 0, slaRisk: 0, mine: 0, watching: 0 };
  if (live.status !== 'fulfilled') return demoCounts;
  return {
    total: demoCounts.total + live.value.total,
    critical: demoCounts.critical + live.value.critical,
    slaRisk: demoCounts.slaRisk + live.value.slaRisk,
    mine: demoCounts.mine + live.value.mine,
    watching: demoCounts.watching + live.value.watching,
  };
}

export async function fetchEscalation(
  organizationId: string,
  id: string,
): Promise<EscalationDetail> {
  // DEMO ONLY — DO NOT MERGE: demo ids stay fixture-served even with the
  // overlay on; real ids (push deep links) go live when the pipeline is up.
  if (DEMO_APPROVALS && (isDemoId(id) || !APPROVALS_PIPELINE_LIVE)) {
    return demoFetchEscalation(organizationId, id);
  }
  const { data } = await http.get<EscalationDetail>(PATHS.escalations.detail(id), {
    params: { organizationId },
  });
  return data;
}

export async function assignEscalation(
  id: string,
  body: { organizationId: string; assigneeId?: string },
): Promise<Escalation> {
  if (DEMO_APPROVALS && (isDemoId(id) || !APPROVALS_PIPELINE_LIVE)) {
    return demoAssignEscalation(id, body); // DEMO ONLY — DO NOT MERGE
  }
  const { data } = await http.post<Escalation>(PATHS.escalations.assign(id), body);
  return data;
}

export interface DecideEscalationBody {
  organizationId: string;
  /** Recorded on the audit receipt as how the decider authenticated. */
  authMethod?: ApprovalAuthMethod;
  note?: string;
}

export async function approveEscalation(
  id: string,
  body: DecideEscalationBody,
): Promise<EscalationDecisionResult> {
  if (DEMO_APPROVALS && (isDemoId(id) || !APPROVALS_PIPELINE_LIVE)) {
    return demoApproveEscalation(id, body); // DEMO ONLY — DO NOT MERGE
  }
  const { data } = await http.post<EscalationDecisionResult>(PATHS.escalations.approve(id), body);
  return data;
}

export async function rejectEscalation(
  id: string,
  body: DecideEscalationBody,
): Promise<EscalationDecisionResult> {
  if (DEMO_APPROVALS && (isDemoId(id) || !APPROVALS_PIPELINE_LIVE)) {
    return demoRejectEscalation(id, body); // DEMO ONLY — DO NOT MERGE
  }
  const { data } = await http.post<EscalationDecisionResult>(PATHS.escalations.reject(id), body);
  return data;
}
