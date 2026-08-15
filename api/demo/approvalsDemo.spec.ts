/** DEMO ONLY — DO NOT MERGE. Specs for the Toshiba board demo fixtures. */
import {
  demoApproveEscalation,
  demoAssignEscalation,
  demoFetchEscalation,
  demoFetchEscalationCounts,
  demoFetchEscalations,
  demoRejectEscalation,
  resetDemoApprovals,
} from './approvalsDemo';

jest.mock('@/store/auth', () => ({
  useAuthStore: {
    getState: () => ({ user: { name: 'Sara Chen', email: 'sara@oemt.example' } }),
  },
}));

const ORG = 'org_demo';

beforeEach(() => {
  resetDemoApprovals();
});

describe('demoFetchEscalations', () => {
  it('serves the queue sorted by SLA pressure, then dollar impact', async () => {
    const page = await demoFetchEscalations({ organizationId: ORG });

    expect(page.nextCursor).toBeNull();
    expect(page.data.map((e) => e.ref)).toEqual([
      'ESC-3101', // Alex dispatch — 38m SLA
      'ESC-3098', // Sophie renewal — ~2h SLA
      'ESC-3095', // Ava sequence — 4h SLA
      'ESC-3088', // Alex anomaly — 22h SLA
    ]);
  });

  it('honors severity, assignee, and status filters', async () => {
    const critical = await demoFetchEscalations({ organizationId: ORG, severity: 'critical' });
    expect(critical.data.map((e) => e.ref)).toEqual(['ESC-3101']);

    const mine = await demoFetchEscalations({ organizationId: ORG, assigneeId: 'me' });
    expect(mine.data.map((e) => e.ref)).toEqual(['ESC-3098']);

    const watching = await demoFetchEscalations({ organizationId: ORG, status: 'assigned' });
    expect(watching.data.map((e) => e.ref)).toEqual(['ESC-3098']);
  });
});

describe('demoFetchEscalationCounts', () => {
  it('derives counts from unresolved items only', async () => {
    const counts = await demoFetchEscalationCounts(ORG);
    expect(counts).toEqual({ total: 4, critical: 1, slaRisk: 1, mine: 1, watching: 1 });
  });

  it('drops decided items from every count', async () => {
    await demoApproveEscalation('demo-esc-alex-dispatch', { organizationId: ORG });

    const counts = await demoFetchEscalationCounts(ORG);
    expect(counts.total).toBe(3);
    expect(counts.critical).toBe(0);
    expect(counts.slaRisk).toBe(0);

    const list = await demoFetchEscalations({ organizationId: ORG });
    expect(list.data.map((e) => e.ref)).toEqual(['ESC-3098', 'ESC-3095', 'ESC-3088']);
  });
});

describe('decisions', () => {
  it('records a full audit trail on approve', async () => {
    const result = await demoApproveEscalation('demo-esc-alex-dispatch', {
      organizationId: ORG,
    });

    expect(result.escalation.status).toBe('resolved');
    expect(result.escalation.resolvedAt).toBeDefined();
    expect(result.approval.decision).toBe('approved');
    expect(result.approval.decidedByEmail).toBe('sara@oemt.example');
    expect(result.approval.authMethod).toBe('sso');
    expect(result.approval.auditId).toMatch(/^AUD-\d{4}-\d{2}-\d{2}-[A-Z0-9]{4}$/);
    expect(result.approval.reverseWindowEndsAt).toBeDefined();

    const detail = await demoFetchEscalation(ORG, 'demo-esc-alex-dispatch');
    expect(detail.approval?.decision).toBe('approved');
  });

  it('is idempotent — a second decision returns the first, unchanged', async () => {
    const first = await demoApproveEscalation('demo-esc-ava-sequence', {
      organizationId: ORG,
    });
    const second = await demoRejectEscalation('demo-esc-ava-sequence', {
      organizationId: ORG,
    });

    expect(second.approval.decision).toBe('approved');
    expect(second.approval.decidedAt).toBe(first.approval.decidedAt);
  });

  it('404s for an unknown escalation, like the real backend', async () => {
    await expect(
      demoApproveEscalation('nope', { organizationId: ORG }),
    ).rejects.toMatchObject({ response: { status: 404 } });
  });
});

describe('assignment and isolation', () => {
  it('assign moves an item onto the Watching/Mine rails', async () => {
    await demoAssignEscalation('demo-esc-ava-sequence', { organizationId: ORG });

    const counts = await demoFetchEscalationCounts(ORG);
    expect(counts.mine).toBe(2);
    expect(counts.watching).toBe(2);
  });

  it('keeps state isolated per organization', async () => {
    await demoApproveEscalation('demo-esc-alex-dispatch', { organizationId: ORG });

    const other = await demoFetchEscalationCounts('org_other');
    expect(other.total).toBe(4);
  });

  it('reset restores the full queue (the app resets by reload)', async () => {
    await demoApproveEscalation('demo-esc-alex-dispatch', { organizationId: ORG });
    resetDemoApprovals();

    const counts = await demoFetchEscalationCounts(ORG);
    expect(counts.total).toBe(4);
  });
});
