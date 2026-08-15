import { fetchAgents } from './agents';
import { http } from '@/api/client/http';
import type { Agent } from './types';

jest.mock('@/api/client/http', () => ({
  http: { get: jest.fn() },
}));

const mockGet = http.get as jest.Mock;

function agent(overrides: Partial<Agent> & { _id: string; name: string }): Agent {
  return { type: 'text', status: 'active', ...overrides };
}

function respond(agents: Agent[]) {
  mockGet.mockResolvedValue({
    data: {
      data: agents,
      metadata: { total: agents.length, page: 1, limit: 20, totalPages: 1 },
    },
  });
}

describe('fetchAgents — hidden agents never reach the app', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('drops agents flagged hidden (the superadmin list includes them)', async () => {
    respond([
      agent({ _id: 'a1', name: 'Sophie' }),
      agent({ _id: 'a2', name: 'Old Pilot', hidden: true }),
      agent({ _id: 'a3', name: 'Ava (Nurture)', hidden: false }),
    ]);

    const res = await fetchAgents({ organizationId: 'org_1' });

    expect(res.items.map((a) => a.name)).toEqual(['Sophie', 'Ava (Nurture)']);
  });

  it('keeps agents that predate the hidden field entirely', async () => {
    respond([agent({ _id: 'a1', name: 'Alex' })]);

    const res = await fetchAgents({ organizationId: 'org_1' });

    expect(res.items).toHaveLength(1);
    expect(res.items[0].name).toBe('Alex');
  });
});
