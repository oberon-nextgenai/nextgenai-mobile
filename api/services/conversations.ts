import { http } from '@/api/client/http';
import { PATHS } from '@/api/client/paths';

/**
 * Conversations — the conversation records an organization owns.
 *
 * Mirrors `oberon-nextgenai-api/src/modules/conversations`. Read the schema
 * before rendering anything from this: it is deliberately thin.
 *
 *   organizationId? · contactId · agentId · createdBy? · updatedBy? · timestamps
 *
 * That is the whole document. There is **no** customer name, no message
 * preview, no transcript, no channel and no sentiment on a conversation — those
 * live in the per-provider collections the export endpoint stitches together
 * (`GET /api/conversations/export`), not here. Do not add optional fields to the
 * interface below in the hope that the server might send them; a field typed as
 * `string | undefined` reads to every call site as "sometimes present", which
 * for these four is simply false.
 *
 * `organizationId` is optional on the Mongoose schema — documents written before
 * the field existed have none — but it is required here, because every read is
 * an equality match on it. A row that comes back from `list` necessarily carries
 * the org it was fetched for. The corollary matters for the UI: pre-scoping rows
 * are invisible to every tenant until `scripts/backfill-conversation-
 * organization-id.ts` runs, so an empty list is an ordinary, expected result
 * rather than a failure.
 */

export interface Conversation {
  _id: string;
  organizationId: string;
  /** Opaque contact identifier. Not a name — the record does not carry one. */
  contactId: string;
  /** Opaque agent identifier, unresolved. */
  agentId: string;
  /** ISO string over HTTP (Mongoose `{ timestamps: true }`). */
  createdAt: string;
  updatedAt: string;
}

/**
 * The list is **not** paginated: the controller returns every conversation for
 * the org in one array. No cursor, no `total` — so no infinite query, and any
 * filtering the screen wants is client-side over the whole set.
 */
export async function fetchConversations(organizationId: string): Promise<Conversation[]> {
  const { data } = await http.get<Conversation[]>(PATHS.conversations.list, {
    params: { organizationId },
  });
  return data;
}
