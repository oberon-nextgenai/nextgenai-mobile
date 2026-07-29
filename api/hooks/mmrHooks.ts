import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import * as mmr from '@/api/services/mmr';
import { useInstalledIntegrations } from '@/api/hooks/pluginHooks';
import { resolveMmrEntitlement, type MmrEntitlement } from '@/lib/mmr/entitlement';
import { QUERY_KEYS } from '@/lib/constants';

export { MMR_PLUGIN_TYPE } from '@/lib/mmr/entitlement';
export type { MmrEntitlement } from '@/lib/mmr/entitlement';

/**
 * Whether this workspace may see MMR features on mobile.
 *
 * Gated on an installed `mmr-campaigns` integration. Two things are worth
 * knowing about that:
 *
 * - The web app does **not** gate MMR this way. `ORG_SIDEBAR_MODULES` has no
 *   MMR entry — MMR lives under Campaigns — so an organization can be running
 *   meter reads today with no integration record at all, because installing
 *   the plugin has never had a server-side effect.
 * - So this can hide MMR from someone entitled to it. That is survivable only
 *   because mobile MMR is new: nobody loses access to something they already
 *   had. Every place this gate is applied says *why* the feature is missing
 *   rather than rendering nothing, so the fix is discoverable.
 *
 * This is a visibility affordance, not a security boundary — the API enforces
 * organization membership independently. The decision itself lives in
 * `lib/mmr/entitlement.ts`.
 */
export function useMmrEntitlement(orgId: string | null): MmrEntitlement {
  const integrations = useInstalledIntegrations(orgId);

  return useMemo(
    () =>
      resolveMmrEntitlement(integrations.data, {
        isPending: integrations.isPending,
        isError: integrations.isError,
      }),
    [integrations.data, integrations.isPending, integrations.isError],
  );
}

export function useMmrDetails(orgId: string | null, campaignId: string | undefined) {
  return useQuery({
    queryKey:
      orgId && campaignId ? QUERY_KEYS.mmrDetails(orgId, campaignId) : ['mmr', 'details', 'none'],
    enabled: Boolean(orgId && campaignId),
    queryFn: () => mmr.fetchMmrDetails(campaignId as string, orgId as string),
    staleTime: 30_000,
  });
}

export function useMmrCallStatus(
  orgId: string | null,
  campaignId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey:
      orgId && campaignId
        ? QUERY_KEYS.mmrCallStatus(orgId, campaignId)
        : ['mmr', 'call-status', 'none'],
    enabled: Boolean(orgId && campaignId) && enabled,
    queryFn: () => mmr.fetchMmrCallStatus(campaignId as string, orgId as string),
    staleTime: 30_000,
  });
}

export function useMmrEmailStatus(
  orgId: string | null,
  campaignId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey:
      orgId && campaignId
        ? QUERY_KEYS.mmrEmailStatus(orgId, campaignId)
        : ['mmr', 'email-status', 'none'],
    enabled: Boolean(orgId && campaignId) && enabled,
    queryFn: () => mmr.fetchMmrEmailStatus(campaignId as string, orgId as string),
    staleTime: 30_000,
  });
}

export function useMmrUploads(orgId: string | null) {
  return useQuery({
    queryKey: orgId ? QUERY_KEYS.mmrUploads(orgId) : ['mmr', 'uploads', 'none'],
    enabled: Boolean(orgId),
    queryFn: () => mmr.fetchMmrUploads(orgId as string),
    staleTime: 30_000,
  });
}

interface CampaignScope {
  orgId: string;
  campaignId: string;
}

/**
 * Invalidate everything that reflects a campaign's state.
 *
 * Every MMR write moves progress as well as the thing it targeted — a resent
 * email changes the email status and the group's attempt count — so the whole
 * campaign view is refetched rather than one query per action.
 */
function useCampaignInvalidator({ orgId, campaignId }: CampaignScope) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.mmrDetails(orgId, campaignId) });
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.mmrCallStatus(orgId, campaignId) });
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.mmrEmailStatus(orgId, campaignId) });
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.campaign(orgId, campaignId) });
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.campaigns(orgId) });
  };
}

export function useStartCampaign(scope: CampaignScope) {
  const invalidate = useCampaignInvalidator(scope);
  return useMutation({
    mutationFn: () => mmr.startCampaign(scope.campaignId, scope.orgId),
    onSuccess: () => {
      invalidate();
      Toast.show({ type: 'success', text1: 'Campaign started' });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Could not start the campaign' });
    },
  });
}

export function useStopCampaign(scope: CampaignScope) {
  const invalidate = useCampaignInvalidator(scope);
  return useMutation({
    mutationFn: () => mmr.stopCampaign(scope.campaignId, scope.orgId),
    onSuccess: () => {
      invalidate();
      Toast.show({ type: 'success', text1: 'Campaign stopped' });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Could not stop the campaign' });
    },
  });
}

export function useResendMmrEmail(scope: CampaignScope) {
  const invalidate = useCampaignInvalidator(scope);
  return useMutation({
    mutationFn: (groupId: string) =>
      mmr.resendMmrEmail(scope.campaignId, groupId, scope.orgId),
    onSuccess: result => {
      invalidate();
      // The endpoint answers 200 with `{ success: false }` for cases like a
      // group with no email address, so a 2xx is not on its own a send.
      if (result.success) {
        Toast.show({ type: 'success', text1: 'Email resent' });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Email not sent',
          text2: result.error ?? 'The server declined the resend',
        });
      }
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Could not resend the email' });
    },
  });
}

export function useMarkCantCollect(scope: CampaignScope) {
  const invalidate = useCampaignInvalidator(scope);
  return useMutation({
    mutationFn: (groupId: string) =>
      mmr.markGroupCantCollect(scope.campaignId, groupId, scope.orgId),
    onSuccess: () => {
      invalidate();
      Toast.show({ type: 'success', text1: "Marked can't collect" });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: "Could not mark can't collect" });
    },
  });
}

export function useUpdateGroupContact(scope: CampaignScope) {
  const invalidate = useCampaignInvalidator(scope);
  return useMutation({
    mutationFn: ({ groupId, updates }: { groupId: string; updates: mmr.MmrContactUpdate }) =>
      mmr.updateGroupContact(scope.campaignId, groupId, scope.orgId, updates),
    onSuccess: () => {
      invalidate();
      Toast.show({ type: 'success', text1: 'Contact updated' });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Could not update the contact' });
    },
  });
}

export function useUploadMmrSpreadsheet(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: { uri: string; name: string; mimeType?: string }) =>
      mmr.uploadMmrSpreadsheet(orgId, file),
    onSuccess: upload => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.mmrUploads(orgId) });
      Toast.show({
        type: 'success',
        text1: `${upload.deviceCount} meters read from the sheet`,
        text2: `${upload.contactGroupCount} contact groups · ask Prime to build the campaign`,
      });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      Toast.show({
        type: 'error',
        text1: 'Could not read that spreadsheet',
        text2: error.response?.data?.message,
      });
    },
  });
}

export function useDiscardMmrUpload(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uploadId: string) => mmr.discardMmrUpload(uploadId, orgId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.mmrUploads(orgId) });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Could not discard that upload' });
    },
  });
}
