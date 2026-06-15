import { z } from 'zod';

/**
 * UCOF (Universal Console Output Format) v1.
 * Ported verbatim from oberon-nextgenai-app/src/lib/prime-structured-schema.ts
 * so mobile validates structured Prime responses identically to web.
 */

export const UCOF_VERSION = 'ucof-1' as const;

export const RESPONSE_TYPES = ['status', 'analytics', 'error', 'action-result', 'info'] as const;
export type PrimeResponseType = (typeof RESPONSE_TYPES)[number];

export const DENSITY_MODES = ['low', 'medium', 'high'] as const;
export type PrimeDensityMode = (typeof DENSITY_MODES)[number];

export const SECTION_KINDS = ['metrics', 'list'] as const;
export type PrimeSectionKind = (typeof SECTION_KINDS)[number];

const MAX_TITLE_WORDS = 6;
const MAX_SUMMARY_LINES = 2;
const MAX_SECTION_ITEMS = 5;
const MAX_INSIGHTS = 3;
const MAX_ACTIONS = 5;

const primeSectionItemSchema = z
  .object({
    label: z.string().nullable().optional(),
    value: z.string().nullable().optional(),
    text: z.string().nullable().optional(),
  })
  .refine((item) => !!(item.label || item.value || item.text), {
    message: 'section item must have at least one of label, value, text',
  });

const primeSectionSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(SECTION_KINDS),
  items: z.array(primeSectionItemSchema).min(1).max(MAX_SECTION_ITEMS),
});

export const primeStructuredResponseSchema = z.object({
  version: z.literal(UCOF_VERSION),
  responseType: z.enum(RESPONSE_TYPES),
  densityMode: z.enum(DENSITY_MODES),
  title: z
    .string()
    .min(1)
    .refine(
      (t) => t.trim().split(/\s+/).filter(Boolean).length <= MAX_TITLE_WORDS,
      { message: `title must be <= ${MAX_TITLE_WORDS} words` },
    )
    .refine((t) => !/[.!?]$/.test(t.trim()), {
      message: 'title must not end with punctuation',
    }),
  summary: z.array(z.string().min(1)).max(MAX_SUMMARY_LINES).nullable().optional(),
  sections: z.array(primeSectionSchema).min(1),
  insights: z.array(z.string().min(1)).max(MAX_INSIGHTS).nullable().optional(),
  actions: z.array(z.string().min(1)).max(MAX_ACTIONS).nullable().optional(),
  fallbackMarkdown: z.string().nullable().optional(),
});

export type PrimeStructuredResponse = z.infer<typeof primeStructuredResponseSchema>;
export type PrimeSectionItem = z.infer<typeof primeSectionItemSchema>;
export type PrimeSection = z.infer<typeof primeSectionSchema>;

/**
 * Action chip wrapper used by MessageBubble/StructuredCard.
 * UCOF v1 ships actions as plain strings; the renderer wraps each one
 * into a {label, prompt} so the existing onActionTap contract still works.
 */
export interface PrimeAction {
  label: string;
  prompt?: string;
  href?: string;
  tone?: 'neutral' | 'primary' | 'danger';
}

/**
 * Accepts either a raw JSON string or an already-parsed value (the streaming
 * client passes already-parsed objects from `data:` SSE lines). Returns null
 * on any parse/validation failure so the caller can fall back to markdown.
 */
export function tryParsePrimeStructured(
  raw: unknown,
): PrimeStructuredResponse | null {
  if (raw == null) return null;
  let candidate: unknown = raw;
  if (typeof raw === 'string') {
    try {
      candidate = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const result = primeStructuredResponseSchema.safeParse(candidate);
  return result.success ? result.data : null;
}

/**
 * Pull `fallbackMarkdown` from any object shape (even one that fails the
 * strict schema). Useful when the structured payload is not valid UCOF but
 * carries a markdown fallback we should still render.
 */
export function pickFallbackMarkdown(raw: unknown): string | null {
  if (raw == null) return null;
  let candidate: unknown = raw;
  if (typeof raw === 'string') {
    try {
      candidate = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (
    candidate &&
    typeof candidate === 'object' &&
    'fallbackMarkdown' in candidate
  ) {
    const v = (candidate as { fallbackMarkdown?: unknown }).fallbackMarkdown;
    return typeof v === 'string' && v.trim() ? v : null;
  }
  return null;
}
