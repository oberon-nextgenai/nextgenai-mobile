// DEMO ONLY — DO NOT MERGE: pins the fixtures ∪ live overlay routing.
import {
  approveEscalation,
  fetchEscalation,
  fetchEscalationCounts,
  fetchEscalations,
  type Escalation,
  type EscalationCounts,
} from './escalations';
import { resetDemoApprovals } from '@/api/demo/approvalsDemo';

jest.mock('@/api/demo/flags', () => ({
  DEMO_APPROVALS: true,
  LIVE_APPROVALS_OVERLAY: true,
  APPROVALS_PIPELINE_LIVE: true,
}));

// `mock*`-prefixed so jest's hoisted factories may close over them lazily.
const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('@/api/client/http', () => ({
  http: {
    get: (...args: unknown[]) => mockGet(...args) as Promise<unknown>,
    post: (...args: unknown[]) => mockPost(...args) as Promise<unknown>,
  },
}));

const ORG = 'org_merge_spec';

/** A real escalation as the backend would return it — Mongo id, no demo- prefix. */
function liveEscalation(overrides: Partial<Escalation> = {}): Escalation {
  return {
    _id: '66c1f77bcf86cd7994390000',
    organizationId: ORG,
    ref: 'ESC-101',
    severity: 'high',
    kind: 'tool_approval',
    title: 'Sophie wants to send an email',
    impactAmount: 0,
    currency: 'USD',
    status: 'open',
    slaDueAt: new Date(Date.now() + 60_000).toISOString(), // due before every fixture
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const LIVE_COUNTS: EscalationCounts = { total: 2, critical: 1, slaRisk: 1, mine: 0, watching: 0 };

beforeEach(() => {
  resetDemoApprovals();
  mockGet.mockReset();
  mockPost.mockReset();
});

describe('fetchEscalations under the overlay', () => {
  it('merges the fixture deck with live items, sorted by SLA pressure', async () => {
    const live = liveEscalation();
    mockGet.mockResolvedValue({ data: { data: [live], nextCursor: 'cursor-1' } });

    const page = await fetchEscalations({ organizationId: ORG });

    expect(page.data.length).toBeGreaterThan(6); // 6 fixtures + the live item
    expect(page.data.some(e => e._id === live._id)).toBe(true);
    expect(page.data.some(e => e._id.startsWith('demo-'))).toBe(true);
    // Due in a minute → tighter SLA than any fixture → leads the queue.
    expect(page.data[0]._id).toBe(live._id);
    expect(page.nextCursor).toBe('cursor-1');
  });

  it('survives a live outage by serving the fixture deck alone', async () => {
    mockGet.mockRejectedValue(new Error('backend down'));

    const page = await fetchEscalations({ organizationId: ORG });

    expect(page.data).toHaveLength(6);
    expect(page.data.every(e => e._id.startsWith('demo-'))).toBe(true);
    expect(page.nextCursor).toBeNull();
  });

  it('keeps cursor pages purely live — the deck is injected on page one only', async () => {
    const live = liveEscalation();
    mockGet.mockResolvedValue({ data: { data: [live], nextCursor: null } });

    const page = await fetchEscalations({ organizationId: ORG, cursor: 'cursor-1' });

    expect(page.data).toHaveLength(1);
    expect(page.data[0]._id).toBe(live._id);
  });
});

describe('fetchEscalationCounts under the overlay', () => {
  it('the badge counts both worlds', async () => {
    mockGet.mockRejectedValueOnce(new Error('down'));
    const fixturesOnly = await fetchEscalationCounts(ORG);

    mockGet.mockResolvedValue({ data: LIVE_COUNTS });
    const merged = await fetchEscalationCounts(ORG);

    expect(merged.total).toBe(fixturesOnly.total + LIVE_COUNTS.total);
    expect(merged.critical).toBe(fixturesOnly.critical + LIVE_COUNTS.critical);
    expect(merged.slaRisk).toBe(fixturesOnly.slaRisk + LIVE_COUNTS.slaRisk);
  });
});

describe('per-item routing under the overlay', () => {
  it('serves demo ids from fixtures without touching the network', async () => {
    const detail = await fetchEscalation(ORG, 'demo-esc-sophie-ct-upgrade');

    expect(detail.escalation._id).toBe('demo-esc-sophie-ct-upgrade');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('sends real ids (push deep links) to the live API', async () => {
    const live = liveEscalation();
    mockGet.mockResolvedValue({ data: { escalation: live, approval: null } });

    const detail = await fetchEscalation(ORG, live._id);

    expect(detail.escalation._id).toBe(live._id);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('decides demo ids in the fixture store and real ids against the backend', async () => {
    await approveEscalation('demo-esc-ava-acme-followup', { organizationId: ORG });
    expect(mockPost).not.toHaveBeenCalled();

    const live = liveEscalation();
    mockPost.mockResolvedValue({
      data: { escalation: { ...live, status: 'resolved' }, approval: {} },
    });
    await approveEscalation(live._id, { organizationId: ORG });
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});
