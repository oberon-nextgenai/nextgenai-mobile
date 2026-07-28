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
export type EscalationStatus = 'open' | 'assigned' | 'resolved' | 'expired';
export type EscalationKind =
  | 'customer'
  | 'cost_anomaly'
  | 'sla_risk'
  | 'policy_exception'
  | 'compliance'
  | 'workflow_failure';

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
