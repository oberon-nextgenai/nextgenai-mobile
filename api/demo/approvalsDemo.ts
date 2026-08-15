/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEMO ONLY — DO NOT MERGE.
 *
 * In-memory escalation/approval fixtures for the Toshiba board demo: one
 * decision-ready item per demo agent (Alex · meter collection, Sophie ·
 * leasing, Ava · SDR) plus a watching-rail item, served through the exact
 * contracts of `api/services/escalations.ts` so the inbox, decision screen,
 * audit receipt, and tab badge run unchanged.
 *
 * Deliberate behaviors:
 * - State is per-organization and in-memory: a page reload (the web build's
 *   "cold launch") resets the queue — predictable for rehearsals.
 * - SLA clocks are anchored to module init, so countdowns tick live.
 * - Customer names are fictional. The audience is Toshiba's own board, so no
 *   fixture ever frames Toshiba as the account at risk.
 * - Decisions record `authMethod: 'sso'` — the demo runs as a web build, where
 *   the app's biometric flow does not exist.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { useAuthStore } from '@/store/auth';
import type {
  Approval,
  DecideEscalationBody,
  Escalation,
  EscalationCounts,
  EscalationDecisionResult,
  EscalationDetail,
  EscalationPage,
  ListEscalationsParams,
} from '@/api/services/escalations';

const MIN = 60_000;

/** Real-feeling service latency; zero under Jest so specs stay fast. */
const LATENCY_MS = process.env.JEST_WORKER_ID ? 0 : 350;

function delay(): Promise<void> {
  if (LATENCY_MS === 0) return Promise.resolve();
  const jittered = LATENCY_MS + Math.random() * 200 - 100;
  return new Promise((resolve) => setTimeout(resolve, jittered));
}

interface DemoItem {
  escalation: Escalation;
  approval: Approval;
}

interface DemoState {
  items: DemoItem[];
}

const stores = new Map<string, DemoState>();

interface FixtureSpec {
  id: string;
  ref: string;
  severity: Escalation['severity'];
  kind: Escalation['kind'];
  title: string;
  context: string;
  agentName: string;
  accountName?: string;
  impactAmount: number;
  slaMinutes: number;
  ageMinutes: number;
  status: Escalation['status'];
  assigneeId?: string;
  action: string;
  policyRef: string;
  recommendation: string;
  projections: { label: string; probability: number }[];
}

/**
 * Ordered here for readability only — the list endpoint re-sorts by SLA
 * pressure then dollar impact, exactly like the real queue.
 */
const FIXTURES: FixtureSpec[] = [
  {
    id: 'demo-esc-alex-dispatch',
    ref: 'ESC-3101',
    severity: 'critical',
    kind: 'sla_risk',
    title: 'Approve emergency technician dispatch — 124 failed meter reads',
    context:
      'Batch read RUN-B7E2 exhausted auto-retries at 3 sites. The billing cycle closes at 22:00 tonight.',
    agentName: 'Alex',
    accountName: 'Meridian Facilities Group',
    impactAmount: 18_400,
    slaMinutes: 38,
    ageMinutes: 12,
    status: 'open',
    action: 'approve_technician_dispatch',
    policyRef: 'POL-FLD-07',
    recommendation:
      'Dispatch the on-call field technician to Site B and re-run the batch after the modem reset. Waiting past the 22:00 billing close would push 3 accounts onto estimated invoices.',
    projections: [
      { label: 'Reads recovered before billing close', probability: 0.92 },
      { label: 'Estimated invoices if deferred to tomorrow', probability: 0.41 },
    ],
  },
  {
    id: 'demo-esc-sophie-renewal',
    ref: 'ESC-3098',
    severity: 'high',
    kind: 'policy_exception',
    title: 'Approve lease renewal — discount 4 pts over policy cap',
    context:
      'Northwind asked for a 12% loyalty discount against the 8% policy cap. Sophie drafted the 3-year renewal at 12% and held it for approval.',
    agentName: 'Sophie',
    accountName: 'Northwind Logistics',
    impactAmount: 48_000,
    slaMinutes: 2 * 60 + 10,
    ageMinutes: 55,
    // Pre-assigned to the caller so the Mine and Watching chips have content.
    status: 'assigned',
    assigneeId: 'me',
    action: 'approve_policy_exception_renewal',
    policyRef: 'POL-LEASE-08',
    recommendation:
      'Approve the exception. Northwind renews 3-year at $48K ARR; two comparable accounts churned this year over smaller gaps. Margin impact is $3.8K/yr against the retained contract.',
    projections: [
      { label: 'Renewal closes this week with exception', probability: 0.87 },
      { label: 'Renewal at risk if held to policy cap', probability: 0.34 },
    ],
  },
  {
    id: 'demo-esc-ava-sequence',
    ref: 'ESC-3095',
    severity: 'high',
    kind: 'customer',
    title: 'Approve outbound sequence to 42 named enterprise accounts',
    context:
      'Two targets in the list have open Sev-1 support tickets. Ava paused the send pending review.',
    agentName: 'Ava',
    impactAmount: 0,
    slaMinutes: 4 * 60,
    ageMinutes: 95,
    status: 'open',
    action: 'approve_outbound_sequence',
    policyRef: 'POL-OUT-03',
    recommendation:
      'Approve with exclusions — drop the 2 accounts with open Sev-1 tickets and send to the remaining 40. Sequence copy passed brand review yesterday.',
    projections: [
      { label: 'Positive reply rate with exclusions', probability: 0.86 },
      { label: 'Brand-risk flag if sent unfiltered', probability: 0.22 },
    ],
  },
  {
    id: 'demo-esc-alex-anomaly',
    ref: 'ESC-3088',
    severity: 'medium',
    kind: 'cost_anomaly',
    title: 'Site D consumption +212% vs seasonal baseline — verify before invoicing',
    context:
      'Alex flagged the jump during overnight reconciliation. Could be a meter fault or genuine usage; invoicing runs Friday.',
    agentName: 'Alex',
    accountName: 'Harborview Estates',
    impactAmount: 6_200,
    slaMinutes: 22 * 60,
    ageMinutes: 6 * 60,
    status: 'open',
    action: 'approve_consumption_review',
    policyRef: 'POL-BIL-11',
    recommendation:
      'Hold Site D off Friday’s invoice run and schedule a meter verification. Invoicing on an unverified 3× spike risks a dispute that costs more than the delay.',
    projections: [
      { label: 'Clean verification before Friday', probability: 0.78 },
      { label: 'Billing dispute if invoiced as-is', probability: 0.44 },
    ],
  },
];

function seedState(organizationId: string): DemoState {
  const now = Date.now();
  return {
    items: FIXTURES.map((f) => ({
      escalation: {
        _id: f.id,
        organizationId,
        ref: f.ref,
        severity: f.severity,
        kind: f.kind,
        title: f.title,
        context: f.context,
        agentName: f.agentName,
        accountName: f.accountName,
        impactAmount: f.impactAmount,
        currency: 'USD',
        status: f.status,
        assigneeId: f.assigneeId,
        slaDueAt: new Date(now + f.slaMinutes * MIN).toISOString(),
        createdAt: new Date(now - f.ageMinutes * MIN).toISOString(),
      },
      approval: {
        _id: `${f.id}-approval`,
        organizationId,
        escalationId: f.id,
        action: f.action,
        policyRef: f.policyRef,
        recommendation: f.recommendation,
        projections: f.projections,
        decision: 'pending',
        createdAt: new Date(now - f.ageMinutes * MIN).toISOString(),
      },
    })),
  };
}

function stateFor(organizationId: string): DemoState {
  let state = stores.get(organizationId);
  if (!state) {
    state = seedState(organizationId);
    stores.set(organizationId, state);
  }
  return state;
}

/** Unresolved = still in the human's queue. Counts and the default list view use this. */
function isUnresolved(e: Escalation): boolean {
  return e.status === 'open' || e.status === 'assigned';
}

/** Mirrors the real backend's 404 for a missing/already-closed escalation. */
function notFound(): Error {
  return Object.assign(new Error('Escalation not found'), {
    response: { status: 404 },
  });
}

export async function demoFetchEscalations(
  params: ListEscalationsParams,
): Promise<EscalationPage> {
  await delay();
  const state = stateFor(params.organizationId);

  let rows = state.items.map((i) => i.escalation);
  rows = params.status
    ? rows.filter((e) => e.status === params.status)
    : rows.filter(isUnresolved);
  if (params.severity) rows = rows.filter((e) => e.severity === params.severity);
  if (params.assigneeId) rows = rows.filter((e) => e.assigneeId === params.assigneeId);

  // The real queue's ordering: SLA pressure first, dollar impact second.
  rows = [...rows].sort((a, b) => {
    const bySla = new Date(a.slaDueAt).getTime() - new Date(b.slaDueAt).getTime();
    return bySla !== 0 ? bySla : b.impactAmount - a.impactAmount;
  });

  return { data: rows.map((e) => ({ ...e })), nextCursor: null };
}

export async function demoFetchEscalationCounts(
  organizationId: string,
): Promise<EscalationCounts> {
  await delay();
  const state = stateFor(organizationId);
  const open = state.items.map((i) => i.escalation).filter(isUnresolved);
  const now = Date.now();
  return {
    total: open.length,
    critical: open.filter((e) => e.severity === 'critical').length,
    slaRisk: open.filter((e) => new Date(e.slaDueAt).getTime() - now < 60 * MIN).length,
    mine: open.filter((e) => e.assigneeId === 'me').length,
    watching: open.filter((e) => e.status === 'assigned').length,
  };
}

export async function demoFetchEscalation(
  organizationId: string,
  id: string,
): Promise<EscalationDetail> {
  await delay();
  const item = stateFor(organizationId).items.find((i) => i.escalation._id === id);
  if (!item) throw notFound();
  return { escalation: { ...item.escalation }, approval: { ...item.approval } };
}

export async function demoAssignEscalation(
  id: string,
  body: { organizationId: string; assigneeId?: string },
): Promise<Escalation> {
  await delay();
  const item = stateFor(body.organizationId).items.find((i) => i.escalation._id === id);
  if (!item) throw notFound();
  item.escalation.status = 'assigned';
  item.escalation.assigneeId = body.assigneeId ?? 'me';
  return { ...item.escalation };
}

function decide(
  id: string,
  body: DecideEscalationBody,
  decision: 'approved' | 'rejected',
): EscalationDecisionResult {
  const item = stateFor(body.organizationId).items.find((i) => i.escalation._id === id);
  if (!item) throw notFound();

  // Idempotent like the real backend: a second decision returns the first.
  if (item.approval.decision === 'pending') {
    const now = new Date();
    const user = useAuthStore.getState().user;
    item.approval.decision = decision;
    item.approval.decidedAt = now.toISOString();
    item.approval.decidedBy = user?.name ?? undefined;
    item.approval.decidedByEmail = user?.email ?? 'executive@nextgen.ai';
    // Web build — the session is SSO-shaped; the app's biometric flow doesn't exist here.
    item.approval.authMethod = 'sso';
    item.approval.note = body.note;
    item.approval.reverseWindowEndsAt = new Date(now.getTime() + 15 * MIN).toISOString();
    item.approval.auditId = `AUD-${now.toISOString().slice(0, 10)}-${item.escalation._id
      .slice(-4)
      .toUpperCase()}`;
    item.escalation.status = 'resolved';
    item.escalation.resolvedAt = now.toISOString();
  }

  return { escalation: { ...item.escalation }, approval: { ...item.approval } };
}

export async function demoApproveEscalation(
  id: string,
  body: DecideEscalationBody,
): Promise<EscalationDecisionResult> {
  await delay();
  return decide(id, body, 'approved');
}

export async function demoRejectEscalation(
  id: string,
  body: DecideEscalationBody,
): Promise<EscalationDecisionResult> {
  await delay();
  return decide(id, body, 'rejected');
}

/** Test helper — the app itself resets by reload (in-memory state). */
export function resetDemoApprovals(): void {
  stores.clear();
}
