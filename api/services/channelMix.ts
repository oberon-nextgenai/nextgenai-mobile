import { http } from '@/api/client/http';
import { PATHS } from '@/api/client/paths';

/**
 * Channel mix — how many interactions each channel handled, and where the source
 * data genuinely records it, what share ran without a human.
 *
 * Mirrors `oberon-nextgenai-api/src/modules/analytics/types/channel-mix.types.ts`.
 *
 * Read the contract carefully before rendering this: a channel that is **absent**
 * from `channels` could not be counted, which is a different statement from
 * `count: 0` ("we counted, there were none"). The UI must not collapse the two.
 */

export const CHANNEL_MIX_CHANNELS = ['calls', 'email', 'sms', 'whatsapp', 'teams'] as const;
export type ChannelMixChannel = (typeof CHANNEL_MIX_CHANNELS)[number];

export interface ChannelMixEntry {
  channel: ChannelMixChannel;
  count: number;
  /**
   * 0–100. Present only where the collection records human involvement — at the
   * time of writing that is WhatsApp alone. Absent means "not derivable", never
   * "zero percent".
   */
  aiHandledPct?: number;
}

export interface ChannelMix {
  totalInteractions: number;
  channels: ChannelMixEntry[];
}

export interface ChannelMixParams {
  /** ISO 8601. Defaults server-side to the last 7 days; `to` is exclusive. */
  from?: string;
  to?: string;
}

export async function fetchChannelMix(
  organizationId: string,
  params: ChannelMixParams = {},
): Promise<ChannelMix> {
  const { data } = await http.get<ChannelMix>(PATHS.analytics.channelMix(organizationId), {
    params,
  });
  return data;
}

/** Display labels. The API's keys are machine names; these are what a person reads. */
export const CHANNEL_LABEL: Record<ChannelMixChannel, string> = {
  calls: 'Calls',
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  teams: 'Teams',
};

/**
 * What each channel's count actually counts.
 *
 * The unit is not uniform and the backend documents why: voice and email are one
 * row per message, while SMS, WhatsApp and Teams are conversations with activity
 * in the window, because their messages are embedded arrays that cannot be summed
 * without loading every document. Surfacing this in the UI is the honest move —
 * otherwise the card implies five comparable numbers when it has two kinds.
 */
export const CHANNEL_UNIT: Record<ChannelMixChannel, 'messages' | 'conversations'> = {
  calls: 'messages',
  email: 'messages',
  sms: 'conversations',
  whatsapp: 'conversations',
  teams: 'conversations',
};
