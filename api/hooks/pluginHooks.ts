import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import * as pluginsService from '@/api/services/plugins';
import { QUERY_KEYS } from '@/lib/constants';
import type {
  CreateIntegrationDto,
  UpdateIntegrationDto,
} from '@/api/services/types';

export function usePluginCatalog(filter?: { category?: string; search?: string }) {
  return useQuery({
    queryKey: QUERY_KEYS.pluginsCatalog(filter),
    queryFn: () => pluginsService.fetchPluginCatalog(filter),
    staleTime: 5 * 60_000,
  });
}

export function usePlugin(type: string | null) {
  return useQuery({
    queryKey: type ? QUERY_KEYS.plugin(type) : ['plugins', 'detail', 'none'],
    enabled: Boolean(type),
    queryFn: () => pluginsService.fetchPluginByType(type as string),
    staleTime: 5 * 60_000,
  });
}

export function usePluginCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.pluginCategories,
    queryFn: () => pluginsService.fetchPluginCategories(),
    staleTime: 5 * 60_000,
  });
}

export function useInstalledIntegrations(orgId: string | null) {
  return useQuery({
    queryKey: orgId ? QUERY_KEYS.installedIntegrations(orgId) : ['integrations', 'none'],
    enabled: Boolean(orgId),
    queryFn: () => pluginsService.fetchInstalledIntegrations(orgId as string),
    staleTime: 60_000,
  });
}

export function useIntegration(orgId: string | null, id: string | null) {
  return useQuery({
    queryKey: orgId && id ? QUERY_KEYS.integration(orgId, id) : ['integrations', 'none', 'detail'],
    enabled: Boolean(orgId && id),
    queryFn: () =>
      pluginsService.fetchIntegration(id as string, orgId as string),
    staleTime: 30_000,
  });
}

interface InstallArgs {
  orgId: string;
}

export function useInstallIntegration({ orgId }: InstallArgs) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateIntegrationDto) =>
      pluginsService.installIntegration(orgId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.installedIntegrations(orgId) });
      Toast.show({ type: 'success', text1: 'Plugin installed' });
    },
    onError: (err) => {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        (err as Error).message;
      Toast.show({ type: 'error', text1: 'Install failed', text2: String(message) });
    },
  });
}

interface IntegrationArgs {
  orgId: string;
  id: string;
}

export function useUpdateIntegration({ orgId, id }: IntegrationArgs) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateIntegrationDto) =>
      pluginsService.updateIntegration(id, orgId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.installedIntegrations(orgId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.integration(orgId, id) });
      Toast.show({ type: 'success', text1: 'Configuration saved' });
    },
    onError: (err) => {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        (err as Error).message;
      Toast.show({ type: 'error', text1: 'Save failed', text2: String(message) });
    },
  });
}

export function useUninstallIntegration({ orgId, id }: IntegrationArgs) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => pluginsService.uninstallIntegration(id, orgId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.installedIntegrations(orgId) });
      qc.removeQueries({ queryKey: QUERY_KEYS.integration(orgId, id) });
      Toast.show({ type: 'success', text1: 'Plugin uninstalled' });
    },
  });
}

export function useTestIntegration({ orgId, id }: IntegrationArgs) {
  return useMutation({
    mutationFn: () => pluginsService.testIntegration(id, orgId),
    onSuccess: (data) => {
      const ok =
        (data as { ok?: boolean }).ok ??
        (data as { healthy?: boolean }).healthy ??
        true;
      Toast.show({
        type: ok ? 'success' : 'error',
        text1: ok ? 'Connection OK' : 'Connection failed',
        text2:
          (data as { message?: string }).message ??
          (ok ? 'Plugin is reachable.' : 'Check configuration and try again.'),
      });
    },
    onError: (err) => {
      Toast.show({
        type: 'error',
        text1: 'Test failed',
        text2: (err as Error).message,
      });
    },
  });
}
