/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEMO ONLY — DO NOT MERGE.
 *
 * In-memory escalation/approval fixtures for the Toshiba board demo: two
 * decision-ready items per demo agent (Alex · meter collection, Sophie ·
 * leasing, Ava · SDR), served through the exact contracts of
 * `api/services/escalations.ts` so the inbox, decision screen, audit receipt,
 * and tab badge run unchanged.
 *
 * Deliberate behaviors:
 * - State is per-organization and in-memory: a page reload (the web build's
 *   "cold launch") resets the queue — predictable for rehearsals.
 * - SLA clocks are anchored to module init, so countdowns tick live.
 * - FACTS REAL, ACTIONS PROPOSED: every account name, dollar figure, device
 *   count and playbook trigger below was verified read-only against the org's
 *   own `toshiba`/`esolution` databases (2026-08-16). The agent ACTIONS are
 *   proposals on those true states — no fixture claims an incident the data
 *   does not show, and nothing here invents probabilities or policy IDs.
 * - `impactAmount` stays 0 everywhere: the UI renders any positive value as
 *   "$X at risk", which would mislabel GP projections and quote values. The
 *   dollars live in the copy with their correct labels.
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
  /** Only when a REAL policy/flag exists in the org's data — never invented. */
  policyRef?: string;
  recommendation: string;
  /** Forecast probabilities are never invented; most items carry none. */
  projections?: { label: string; probability: number }[];
}

/**
 * Ordered here for readability only — the list endpoint re-sorts by SLA
 * pressure then dollar impact, exactly like the real queue.
 *
 * COUNTS CONSTRAINT: `slaRisk` is time-derived (due < 60 min). Exactly one
 * item (the first) may have `slaMinutes < 60`; every other item must stay at
 * 60+ or the seeded counts (and their specs) silently change.
 */
const FIXTURES: FixtureSpec[] = [
  {
    id: 'demo-esc-alex-overdue-wave',
    ref: 'ESC-3101',
    severity: 'critical',
    kind: 'sla_risk',
    title: 'Meter collection gap — 78 devices unread for 90+ days',
    context:
      '78 devices across 24 accounts have no meter reading in over 90 days. Alpine Medical Group, Quantum Manufacturing, OrionTech Solutions and Vista Healthcare Systems lead with 5 each; the longest gap is 668 days at Stellar Financial Services. Alex proposes an outreach wave to all 24 account contacts.',
    agentName: 'Alex',
    impactAmount: 0,
    slaMinutes: 45,
    ageMinutes: 25,
    status: 'open',
    action: 'approve_overdue_outreach_wave',
    recommendation:
      'Approve the outreach wave. Alex works the 24 account contacts this week — calls and email — and collected readings land in the fleet dashboard as they arrive.',
  },
  {
    id: 'demo-esc-sophie-ct-upgrade',
    ref: 'ESC-3098',
    severity: 'high',
    kind: 'policy_exception',
    title: 'Upgrade proposal ready — CT Accounting & Tax Services',
    context:
      'Sophie priced an e-STUDIO400AC upgrade for CT ACCOUNTING AND TAX SERVICES (Charlotte): $217.73 → $114.23 per month, projected GP +$1,824. The playbook marks this proposal "manager check required" before it goes to the client.',
    agentName: 'Sophie',
    accountName: 'CT ACCOUNTING AND TAX SERVICES (Charlotte)',
    impactAmount: 0,
    slaMinutes: 2 * 60 + 30,
    ageMinutes: 55,
    // Pre-assigned to the caller so the Mine and Watching chips have content.
    status: 'assigned',
    assigneeId: 'me',
    action: 'approve_upgrade_proposal',
    // The one real policy flag in the data: LeaseOpportunity.managerCheckRequired.
    policyRef: 'managerCheckRequired',
    recommendation:
      'Approve sending the proposal. The playbook trigger reads "Propose to the client, target a solution like ESPM" — this manager check is the only gate left.',
  },
  {
    id: 'demo-esc-ava-elah-handoff',
    ref: 'ESC-3095',
    severity: 'high',
    kind: 'customer',
    title: 'SDR hand-off from Sophie — Elah Baptist Church',
    context:
      'Rep GP on the renewal is negative (−$264) but the marketplace GP is positive, so the playbook moves ELAH BAPTIST CHURCH (Leland) to the SDR team. Ava proposes testing an upgrade-this-month offer; Sophie recommends holding.',
    agentName: 'Ava',
    accountName: 'ELAH BAPTIST CHURCH (Leland)',
    impactAmount: 0,
    slaMinutes: 4 * 60,
    ageMinutes: 95,
    status: 'open',
    action: 'approve_sdr_handoff_outreach',
    recommendation:
      'Decide the play: approve Ava’s upgrade-this-month test offer, or reject to hold per Sophie’s read and revisit next cycle.',
  },
  {
    id: 'demo-esc-sophie-multiunit',
    ref: 'ESC-3092',
    severity: 'medium',
    kind: 'policy_exception',
    title: 'Multi-equipment lease — escalate to the rep',
    context:
      'HOMES BY DICKERSON (Chapel Hill) prices at negative GP (−$8,371) and BILTMORE BAPTIST CHURCH (Brevard) is also multi-equipment. The playbook routes both to the rep instead of an automated proposal.',
    agentName: 'Sophie',
    accountName: 'HOMES BY DICKERSON (Chapel Hill)',
    impactAmount: 0,
    slaMinutes: 8 * 60,
    ageMinutes: 3 * 60,
    status: 'open',
    action: 'approve_rep_escalation',
    recommendation:
      'Approve the escalation so the rep prices both multi-equipment deals by hand — the playbook is explicit that these are not automated proposals.',
  },
  {
    id: 'demo-esc-ava-acme-followup',
    ref: 'ESC-3090',
    severity: 'medium',
    kind: 'customer',
    title: 'Quote follow-up — Acme Manufacturing (value $5,085)',
    context:
      'The $5,085 Acme Manufacturing quote is still pending internal approval and its manager-approval SLA has passed. Ava proposes a follow-up nudge to the internal approver and the account.',
    agentName: 'Ava',
    accountName: 'Acme Manufacturing',
    impactAmount: 0,
    slaMinutes: 24 * 60,
    ageMinutes: 5 * 60,
    status: 'open',
    action: 'approve_quote_followup',
    recommendation:
      'Approve the nudge. The quote is valid until December 31 — the block is the internal manager approval, not the customer.',
  },
  {
    id: 'demo-esc-alex-newly-stale',
    ref: 'ESC-3088',
    severity: 'medium',
    kind: 'sla_risk',
    title: '2 devices crossed the 30-day reading mark',
    context:
      'Two devices moved into the 31–60 day window with no reading. Alex proposes adding them to this week’s follow-up batch before they age into the 90-day backlog.',
    agentName: 'Alex',
    impactAmount: 0,
    slaMinutes: 30 * 60,
    ageMinutes: 2 * 60,
    status: 'open',
    action: 'approve_followup_batch_add',
    recommendation:
      'Approve adding both devices to this week’s batch — cheap to catch now, expensive after 90 days.',
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
        projections: f.projections ?? [],
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

export interface DemoDecisionRecord {
  id: string;
  action: string;
  decision: 'approved' | 'rejected';
  decidedAt: string;
  decidedByEmail?: string;
}

/**
 * Decisions already taken on this agent's escalations, for the agent detail
 * audit trail. Pure read — never seeds the store (no decisions exist before
 * the queue was ever opened).
 */
export function demoDecisionsFor(
  organizationId: string,
  agentName: string,
): DemoDecisionRecord[] {
  const state = stores.get(organizationId);
  if (!state) return [];
  return state.items
    .filter(
      (i) =>
        i.escalation.agentName === agentName &&
        i.approval.decision !== 'pending' &&
        i.approval.decidedAt,
    )
    .map((i) => ({
      id: `${i.escalation._id}-decision`,
      action: i.approval.action,
      decision: i.approval.decision as 'approved' | 'rejected',
      decidedAt: i.approval.decidedAt as string,
      decidedByEmail: i.approval.decidedByEmail,
    }));
}

/** Test helper — the app itself resets by reload (in-memory state). */
export function resetDemoApprovals(): void {
  stores.clear();
}
