import { fetchOrganizations } from './auth';
import { http } from '@/api/client/http';
import type { Organization } from './types';

jest.mock('@/api/client/http');

const mockGet = http.get as unknown as jest.Mock;

describe('fetchOrganizations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the array when the response is an array of organizations', async () => {
    const orgs: Organization[] = [
      { _id: 'org_1', name: 'Org One' },
      { _id: 'org_2', name: 'Org Two' },
    ];
    mockGet.mockResolvedValue({ data: orgs });

    const result = await fetchOrganizations();

    expect(result).toEqual(orgs);
  });

  it('throws when the response is not an array (e.g., HTML from a gateway starting up)', async () => {
    // A gateway mid-deploy returns 200 with HTML "starting up" page instead of JSON
    mockGet.mockResolvedValue({ data: '<html><body>Starting up...</body></html>' });

    await expect(fetchOrganizations()).rejects.toThrow('Unexpected /orgs response shape');
  });

  it('throws when the response is an object but not an array', async () => {
    // API returns an object (e.g., error envelope) instead of an array
    mockGet.mockResolvedValue({ data: { error: 'Internal server error' } });

    await expect(fetchOrganizations()).rejects.toThrow('Unexpected /orgs response shape');
  });

  it('throws when the response is null', async () => {
    mockGet.mockResolvedValue({ data: null });

    await expect(fetchOrganizations()).rejects.toThrow('Unexpected /orgs response shape');
  });
});
