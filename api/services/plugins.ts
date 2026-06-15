import { http } from '../client/http';
import { PATHS } from '../client/paths';
import type {
  Plugin,
  PluginCategory,
  Integration,
  CreateIntegrationDto,
  UpdateIntegrationDto,
} from './types';

/** Marketplace listing. Supports server-side `category` + `search` filters. */
export async function fetchPluginCatalog(params?: {
  category?: string;
  search?: string;
}): Promise<Plugin[]> {
  const res = await http.get<Plugin[] | { plugins: Plugin[] }>(PATHS.plugins.catalog, {
    params,
  });
  const data = res.data;
  return Array.isArray(data) ? data : (data?.plugins ?? []);
}

export async function fetchPluginByType(type: string): Promise<Plugin> {
  const res = await http.get<Plugin>(PATHS.plugins.byType(type));
  return res.data;
}

export async function fetchPluginCategories(): Promise<PluginCategory[]> {
  const res = await http.get<PluginCategory[] | { categories: PluginCategory[] }>(
    PATHS.plugins.categories,
  );
  const data = res.data;
  return Array.isArray(data) ? data : (data?.categories ?? []);
}

export async function fetchInstalledIntegrations(
  organizationId: string,
  params?: { type?: string; status?: string },
): Promise<Integration[]> {
  const res = await http.get<Integration[] | { integrations: Integration[] }>(
    PATHS.integrations.list,
    { params: { organizationId, ...(params ?? {}) } },
  );
  const data = res.data;
  return Array.isArray(data) ? data : (data?.integrations ?? []);
}

export async function fetchIntegration(
  id: string,
  organizationId: string,
): Promise<Integration> {
  const res = await http.get<Integration>(PATHS.integrations.detail(id), {
    params: { organizationId },
  });
  return res.data;
}

export async function installIntegration(
  organizationId: string,
  dto: CreateIntegrationDto,
): Promise<Integration> {
  const res = await http.post<Integration>(PATHS.integrations.list, {
    organizationId,
    ...dto,
  });
  return res.data;
}

export async function updateIntegration(
  id: string,
  organizationId: string,
  dto: UpdateIntegrationDto,
): Promise<Integration> {
  const res = await http.put<Integration>(PATHS.integrations.detail(id), {
    organizationId,
    ...dto,
  });
  return res.data;
}

export async function uninstallIntegration(
  id: string,
  organizationId: string,
): Promise<{ message?: string }> {
  const res = await http.delete<{ message?: string }>(
    PATHS.integrations.detail(id),
    { params: { organizationId } },
  );
  return res.data;
}

export async function testIntegration(
  id: string,
  organizationId: string,
): Promise<{ ok?: boolean; message?: string; [k: string]: unknown }> {
  const res = await http.post(PATHS.integrations.test(id), { organizationId });
  return res.data as Record<string, unknown>;
}
