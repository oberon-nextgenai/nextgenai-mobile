import { http } from '../client/http';
import { PATHS } from '../client/paths';

export interface Campaign {
  _id: string;
  name: string;
  description?: string;
  organizationId: string;
  status: string;
  assistantId?: string;
  phoneNumberId?: string;
  contacts?: string[];
  vapiCampaignId?: string;
  settings?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

interface ListResponse {
  data: Campaign[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchCampaigns(
  orgId: string,
  filters?: { status?: string; tab?: string; search?: string },
): Promise<Campaign[]> {
  const res = await http.get<ListResponse>(PATHS.campaigns.list, {
    params: {
      organizationId: orgId,
      page: 1,
      limit: 100,
      status: filters?.status,
      tab: filters?.tab,
      search: filters?.search,
    },
  });
  return res.data?.data ?? [];
}

export async function fetchCampaign(id: string, orgId: string): Promise<Campaign> {
  const res = await http.get<Campaign>(PATHS.campaigns.detail(id), {
    params: { organizationId: orgId },
  });
  return res.data;
}
