import { http } from '@/api/client/http';
import { PATHS } from '@/api/client/paths';

/**
 * Escalations + approvals — the human triage queue.
 *
 * Mirrors `oberon-nextgenai-api/src/modules/escalations`. Every call is
 * org-scoped: the backend rejects a non-member with 403 before it touches the
 * database, so `organizationId` is required rather than optional here.
 */

export type EscalationSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Mirrors `ESCALATION_KINDS` in the backend's
 * `src/modules/escalations/escalations.types.ts`. Kept as a const array rather
 * than a bare union so `escalations.spec.ts` can assert the two agree —
 * a hand-written union drifts silently, which is how 'tool_approval' went
 * missing here for an entire release.
 */
export const ESCALATION_KINDS = [
  'customer',
  'cost_anomaly',
  'sla_risk',
  'policy_exception',
  'compliance',
  'workflow_failure',
  /** Agent requested a one-time grant to run a gated tool (ND-1353). */
  'tool_approval',
] as const;
export type EscalationKind = (typeof ESCALATION_KINDS)[number];

export const ESCALATION_STATUSES = [
  'open',
  'assigned',
  /** Approved — the proposed action was allowed to proceed. */
  'resolved',
  /** Rejected. Also a completed decision, but the opposite one. */
  'rejected',
  'expired',
] as const;
export type EscalationStatus = (typeof ESCALATION_STATUSES)[number];

/** Mirrors `GRANT_STATUSES` in the backend's `hitl-grant.util.ts`. */
export const GRANT_STATUSES = ['none', 'issued', 'consumed', 'expired', 'revoked'] as const;
export type GrantStatus = (typeof GRANT_STATUSES)[number];

export type ApprovalDecision = 'pending' | 'approved' | 'rejected';
export type ApprovalAuthMethod = 'password' | 'sso' | 'biometric_sso' | 'api_key';

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

  // ── HITL tool-grant fields (ND-1353) ────────────────────────────────────
  // Present only when `action === 'tool_grant'` — i.e. an agent asked for a
  // one-time grant to run a gated tool. `grantToken` and `grantTokenHash` are
  // deliberately absent: the backend strips the token from human-facing
  // responses, so a human client must never expect or hold one.

  /** The gated tool the agent wants to run, e.g. `send_template_email`. */
  toolName?: string;
  /** Frozen tool args captured at request time; secrets already redacted. */
  actionPayload?: Record<string, unknown>;
  /** sha256 of the canonical `actionPayload` — redeem must match exactly. */
  payloadHash?: string;
  grantStatus?: GrantStatus;
  /** ISO timestamp. */
  consumedAt?: string;
  executionId?: string;
  executionType?: 'email' | 'chat' | 'voice' | 'api' | 'other';
  /** Callback / job handle used to resume an API invoke after a decision. */
  resumeHandle?: string;
  /** ISO timestamp. At-most-once agent wake after decide. */
  agentNotifiedAt?: string;
  resumeJobId?: string;
  /** Agent that owns this tool-grant; set on request, used when redeeming. */
  agentId?: string;

  createdAt: string;
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

export async function fetchEscalations(params: ListEscalationsParams): Promise<EscalationPage> {
  const { data } = await http.get<EscalationPage>(PATHS.escalations.list, { params });
  return data;
}

export async function fetchEscalationCounts(organizationId: string): Promise<EscalationCounts> {
  const { data } = await http.get<EscalationCounts>(PATHS.escalations.counts, {
    params: { organizationId },
  });
  return data;
}

export async function fetchEscalation(
  organizationId: string,
  id: string,
): Promise<EscalationDetail> {
  const { data } = await http.get<EscalationDetail>(PATHS.escalations.detail(id), {
    params: { organizationId },
  });
  return data;
}

export async function assignEscalation(
  id: string,
  body: { organizationId: string; assigneeId?: string },
): Promise<Escalation> {
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
  const { data } = await http.post<EscalationDecisionResult>(PATHS.escalations.approve(id), body);
  return data;
}

export async function rejectEscalation(
  id: string,
  body: DecideEscalationBody,
): Promise<EscalationDecisionResult> {
  const { data } = await http.post<EscalationDecisionResult>(PATHS.escalations.reject(id), body);
  return data;
}
