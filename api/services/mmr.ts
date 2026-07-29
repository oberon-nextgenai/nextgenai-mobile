import { http } from '../client/http';
import { PATHS } from '../client/paths';

/**
 * MMR (meter reading) campaign operations.
 *
 * An MMR campaign is a fleet of meters grouped by whoever is responsible for
 * reading them. A *contact group* is one customer contact plus the meters they
 * own; progress is measured in readings collected against meters owed, not in
 * calls placed.
 */

export type MmrGroupStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'cant_collect';

export const MMR_GROUP_STATUSES: MmrGroupStatus[] = [
  'pending',
  'in-progress',
  'completed',
  'failed',
  'cant_collect',
];

/** Human labels for the statuses, which are stored in mixed casing styles. */
export const MMR_STATUS_LABEL: Record<MmrGroupStatus, string> = {
  pending: 'Pending',
  'in-progress': 'In progress',
  completed: 'Completed',
  failed: 'Failed',
  cant_collect: "Can't collect",
};

export interface MmrContactGroup {
  groupId: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactPhoneExtension?: string;
  meterSerials?: string[];
  preferredChannel?: 'email' | 'phone';
  status?: MmrGroupStatus;
  attemptsCount?: number;
  smsAttemptsCount?: number;
  lastContactedAt?: string;
  lastOutcome?: string;
  completedCount?: number;
  totalCount?: number;
  emailBounced?: boolean;
  escalated?: boolean;
}

export interface MmrDevice {
  serial: string;
  meterType: 'BW' | 'CLR';
  model?: string;
  siteName?: string;
  address?: string;
  location?: string;
  previousReading?: number;
  contactGroupId?: string;
}

export interface MmrStats {
  totalContactGroups?: number;
  pendingGroups?: number;
  inProgressGroups?: number;
  completedGroups?: number;
  failedGroups?: number;
  totalDevices?: number;
  uniqueDeviceCount?: number;
  totalReadingsCollected?: number;
  completionPercentage?: number;
}

export interface MmrCampaignDetails {
  campaign?: {
    _id?: string;
    name?: string;
    status?: string;
    mmrData?: {
      devices?: MmrDevice[];
      contactGroups?: MmrContactGroup[];
      collectedReadings?: unknown[];
      excelFileName?: string;
      uploadedAt?: string;
    };
  };
  stats?: MmrStats;
}

export interface MmrCallStatus {
  totalCalls?: number;
  queuedCalls?: number;
  inProgressCalls?: number;
  completedCalls?: number;
  failedCalls?: number;
  successRate?: number;
  [key: string]: unknown;
}

export interface MmrEmailStatus {
  sent?: number;
  failed?: number;
  pending?: number;
  total?: number;
  [key: string]: unknown;
}

export interface MmrUploadSummary {
  uploadId: string;
  fileName: string;
  uploadedAt: string;
  contactGroupCount: number;
  deviceCount: number;
  totalRows: number;
  validRows: number;
  warnings: number;
  errors: number;
  consumedByCampaignId?: string;
  consumedAt?: string;
  expiresAt: string;
}

export interface MmrUploadDetail extends MmrUploadSummary {
  contactGroups: MmrContactGroup[];
  warningMessages: string[];
  errorMessages: string[];
}

export async function fetchMmrDetails(
  campaignId: string,
  orgId: string,
): Promise<MmrCampaignDetails> {
  const res = await http.get<MmrCampaignDetails>(PATHS.campaigns.mmr.details(campaignId), {
    params: { organizationId: orgId },
  });
  return res.data;
}

export async function fetchMmrCallStatus(
  campaignId: string,
  orgId: string,
): Promise<MmrCallStatus> {
  const res = await http.get<MmrCallStatus>(PATHS.campaigns.mmr.callStatus(campaignId), {
    params: { organizationId: orgId },
  });
  return res.data;
}

export async function fetchMmrEmailStatus(
  campaignId: string,
  orgId: string,
): Promise<MmrEmailStatus> {
  const res = await http.get<MmrEmailStatus>(PATHS.campaigns.mmr.emailStatus(campaignId), {
    params: { organizationId: orgId },
  });
  return res.data;
}

export async function startCampaign(campaignId: string, orgId: string): Promise<void> {
  await http.post(PATHS.campaigns.start(campaignId), { organizationId: orgId });
}

/**
 * Stop a campaign.
 *
 * Terminal, not a pause: an active campaign becomes `cancelled` and its
 * provisioned phone number is released. `CampaignStatus.PAUSED` exists in the
 * enum but nothing ever sets it. The confirm copy at the call site says so.
 */
export async function stopCampaign(campaignId: string, orgId: string): Promise<void> {
  await http.post(PATHS.campaigns.stop(campaignId), { organizationId: orgId });
}

export async function resendMmrEmail(
  campaignId: string,
  groupId: string,
  orgId: string,
): Promise<{ success: boolean; error?: string }> {
  const res = await http.post<{ success: boolean; error?: string }>(
    PATHS.campaigns.mmr.resendEmail(campaignId),
    { contactGroupId: groupId, organizationId: orgId },
  );
  return res.data;
}

export async function markGroupCantCollect(
  campaignId: string,
  groupId: string,
  orgId: string,
): Promise<void> {
  await http.patch(PATHS.campaigns.mmr.cantCollect(campaignId, groupId), {
    organizationId: orgId,
  });
}

export interface MmrContactUpdate {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactPhoneExtension?: string;
}

export async function updateGroupContact(
  campaignId: string,
  groupId: string,
  orgId: string,
  updates: MmrContactUpdate,
): Promise<void> {
  await http.patch(PATHS.campaigns.mmr.updateContact(campaignId, groupId), {
    organizationId: orgId,
    ...updates,
  });
}

/** Staged spreadsheet uploads. */

export async function fetchMmrUploads(orgId: string): Promise<MmrUploadSummary[]> {
  const res = await http.get<MmrUploadSummary[]>(PATHS.campaigns.mmr.uploads, {
    params: { organizationId: orgId },
  });
  return res.data;
}

/**
 * Upload a spreadsheet and stage it under an id.
 *
 * Sent as multipart with the content type left unset: React Native's fetch
 * layer has to append the multipart boundary itself, and forcing
 * `multipart/form-data` without one produces a body the server cannot parse.
 * The axios default of `application/json` would do exactly that, so it is
 * explicitly cleared here.
 */
export async function uploadMmrSpreadsheet(
  orgId: string,
  file: { uri: string; name: string; mimeType?: string },
): Promise<MmrUploadDetail> {
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  } as unknown as Blob);

  const res = await http.post<MmrUploadDetail>(PATHS.campaigns.mmr.uploads, form, {
    params: { organizationId: orgId },
    headers: { 'Content-Type': undefined },
    transformRequest: value => value,
  });
  return res.data;
}

export async function discardMmrUpload(uploadId: string, orgId: string): Promise<void> {
  await http.delete(PATHS.campaigns.mmr.upload(uploadId), {
    params: { organizationId: orgId },
  });
}

export interface CreateFromUploadBody {
  name: string;
  description?: string;
  assistantId?: string;
}

export async function createCampaignFromUpload(
  uploadId: string,
  orgId: string,
  body: CreateFromUploadBody,
): Promise<{ campaign: { _id: string; name: string }; summary: Record<string, unknown> }> {
  const res = await http.post<{
    campaign: { _id: string; name: string };
    summary: Record<string, unknown>;
  }>(PATHS.campaigns.mmr.uploadToCampaign(uploadId), { ...body, organizationId: orgId });
  return res.data;
}

export interface CloneMmrBody {
  name: string;
  description?: string;
  excludeCantCollect?: boolean;
  rollForwardReadings?: boolean;
}

export async function cloneMmrCampaign(
  campaignId: string,
  orgId: string,
  body: CloneMmrBody,
): Promise<{
  campaign: { _id: string; name: string };
  summary: {
    sourceCampaignName: string;
    contactGroups: number;
    meters: number;
    readingsRolledForward: number;
    groupsExcluded: number;
    groupsWithBouncedEmail: number;
  };
}> {
  const res = await http.post(PATHS.campaigns.mmr.clone(campaignId), {
    ...body,
    organizationId: orgId,
  });
  return res.data as never;
}

/** URL for the Excel export, for handing to the share sheet. */
export function mmrExportUrl(campaignId: string, orgId: string): string {
  const base = http.defaults.baseURL ?? '';
  return `${base}${PATHS.campaigns.mmr.exportXlsx(campaignId)}?organizationId=${encodeURIComponent(orgId)}`;
}
