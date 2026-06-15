import { http } from '../client/http';
import { PATHS } from '../client/paths';
import type { ToolAvailable, StoredPrimeMessage } from './types';

export async function fetchAvailableTools(
  organizationId: string,
): Promise<{ tools: ToolAvailable[]; organizationId: string }> {
  const res = await http.post<{ tools: ToolAvailable[]; organizationId: string }>(
    PATHS.chat.toolsAvailable,
    { organizationId },
  );
  return res.data;
}

export async function fetchPrimeHistory(
  organizationId: string,
): Promise<StoredPrimeMessage[]> {
  const res = await http.get<StoredPrimeMessage[] | { messages: StoredPrimeMessage[] }>(
    PATHS.chat.history(organizationId),
  );
  return Array.isArray(res.data) ? res.data : (res.data?.messages ?? []);
}

export async function clearPrimeHistory(organizationId: string): Promise<void> {
  await http.delete(PATHS.chat.clearHistory(organizationId));
}

/**
 * Save a single Prime message. Only used for client-created welcome/system
 * entries. Do NOT call this on stream completion — backend already persists
 * both user and assistant messages during /api/chat/stream.
 */
export async function savePrimeMessage(payload: {
  organizationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}): Promise<StoredPrimeMessage> {
  const res = await http.post<StoredPrimeMessage>(PATHS.chat.saveMessage, payload);
  return res.data;
}
