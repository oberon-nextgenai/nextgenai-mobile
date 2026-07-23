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
 * Transcribe a recorded audio clip to text via the backend (OpenAI Whisper).
 * Sends multipart/form-data; overrides the axios instance's default JSON content type.
 */
export async function transcribeAudio(organizationId: string, uri: string): Promise<string> {
  const form = new FormData();
  // React Native FormData file shape.
  form.append('file', { uri, name: 'voice.m4a', type: 'audio/m4a' } as unknown as Blob);
  form.append('organizationId', organizationId);

  const res = await http.post<{ text: string }>(PATHS.chat.transcribe, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.text;
}

/**
 * Synthesize Prime's spoken reply. Requests base64 JSON (mobile cannot stream binary
 * bytes as conveniently as the web client), returning MP3 audio as base64.
 */
export async function synthesizeSpeech(
  organizationId: string,
  text: string,
): Promise<{ audioBase64: string; mimeType: string }> {
  const res = await http.post<{ audioBase64: string; mimeType: string }>(PATHS.chat.tts, {
    text,
    organizationId,
    mode: 'base64',
  });
  return res.data;
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
