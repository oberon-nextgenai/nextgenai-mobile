import { fetchConversationFeed } from './conversationFeed';
import { http } from '@/api/client/http';
import type { Agent } from './types';

jest.mock('@/api/client/http', () => ({
  http: { get: jest.fn() },
}));

const mockGet = http.get as jest.Mock;

function agent(overrides: Partial<Agent> & { _id: string; name: string }): Agent {
  return { type: 'text', status: 'active', ...overrides };
}

const ROSTER: Agent[] = [
  agent({ _id: 'id-alex', name: 'Alex' }),
  agent({ _id: 'id-sophie', name: 'Sophie' }),
  agent({ _id: 'id-ava', name: 'Ava Cold Call Email' }),
];

describe('fetchConversationFeed (demo mode)', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('falls back to fixtures bound to the passed roster ids on timeout/error', async () => {
    mockGet.mockRejectedValue(new Error('timeout of 2500ms exceeded'));

    const items = await fetchConversationFeed({
      organizationId: 'org_demo',
      roster: ROSTER,
    });

    expect(items.length).toBeGreaterThan(0);
    const ids = new Set(items.map((i) => i.agentId));
    expect(ids).toEqual(new Set(['id-alex', 'id-sophie', 'id-ava']));
  });

  it('falls back to fixtures when the live feed is empty', async () => {
    mockGet.mockResolvedValue({ data: [] });

    const items = await fetchConversationFeed({
      organizationId: 'org_demo',
      roster: ROSTER,
    });
    expect(items.length).toBeGreaterThan(0);
  });

  it('filters fixtures by the resolved real agent id', async () => {
    mockGet.mockRejectedValue(new Error('down'));

    const items = await fetchConversationFeed({
      organizationId: 'org_demo',
      agentId: 'id-sophie',
      roster: ROSTER,
    });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.agentId === 'id-sophie')).toBe(true);
  });

  it('is order-independent — an empty roster still yields fixtures (synthesized ids)', async () => {
    mockGet.mockRejectedValue(new Error('down'));

    const items = await fetchConversationFeed({ organizationId: 'org_demo', roster: [] });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.agentId.startsWith('demo-agent-'))).toBe(true);
  });

  it('maps live rows and canonicalizes agent display names', async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          agentId: 'id-ava',
          agentName: 'Ava Cold Call Email',
          channel: 'email',
          contact: 'Hiro Tanaka',
          date: '2026-08-15T10:00:00.000Z',
          duration: 120,
          status: 'replied',
          summary: 'Booked a meeting.',
        },
      ],
    });

    const items = await fetchConversationFeed({
      organizationId: 'org_demo',
      roster: ROSTER,
    });
    expect(items).toHaveLength(1);
    expect(items[0].agentName).toBe('Ava');
    expect(items[0].channel).toBe('email');
    expect(items[0].durationSec).toBe(120);
  });

  it('sends the short demo timeout on the live request', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await fetchConversationFeed({ organizationId: 'org_demo', roster: ROSTER });

    expect(mockGet).toHaveBeenCalledWith(
      '/api/conversations/export',
      expect.objectContaining({ timeout: 2500 }),
    );
  });
});
