import { http } from '../client/http';
import { PATHS } from '../client/paths';
import type { Department } from './types';

export async function fetchDepartments(orgId: string): Promise<Department[]> {
  const res = await http.get<Department[] | { data?: Department[] }>(
    PATHS.orgs.departments(orgId),
  );
  const body = res.data as unknown;
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object' && Array.isArray((body as { data?: Department[] }).data)) {
    return (body as { data: Department[] }).data;
  }
  return [];
}
