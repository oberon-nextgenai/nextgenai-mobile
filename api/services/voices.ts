import { http } from '../client/http';
import { PATHS } from '../client/paths';
import type { VoiceConfig } from './types';

export interface VoicesFilter {
  organizationId: string;
  provider?: string;
  gender?: string;
  active?: boolean;
}

export async function fetchVoices(filter: VoicesFilter): Promise<VoiceConfig[]> {
  const res = await http.get<VoiceConfig[] | { data?: VoiceConfig[] }>(PATHS.voices.list, {
    params: {
      organizationId: filter.organizationId,
      provider: filter.provider,
      gender: filter.gender,
      active: filter.active != null ? String(filter.active) : undefined,
    },
  });
  const body = res.data as unknown;
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object' && Array.isArray((body as { data?: VoiceConfig[] }).data)) {
    return (body as { data: VoiceConfig[] }).data;
  }
  return [];
}
