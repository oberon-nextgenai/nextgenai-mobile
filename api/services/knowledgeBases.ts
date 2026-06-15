import { http } from '../client/http';
import { PATHS } from '../client/paths';
import type { KnowledgeBase } from './types';

export async function fetchKnowledgeBases(orgId: string): Promise<KnowledgeBase[]> {
  const res = await http.get<
    KnowledgeBase[] | { data?: KnowledgeBase[]; documents?: KnowledgeBase[] }
  >(PATHS.knowledgeBases.documents, {
    params: { organizationId: orgId },
  });
  const body = res.data as unknown;
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object') {
    const b = body as { data?: KnowledgeBase[]; documents?: KnowledgeBase[] };
    if (Array.isArray(b.data)) return b.data;
    if (Array.isArray(b.documents)) return b.documents;
  }
  return [];
}
