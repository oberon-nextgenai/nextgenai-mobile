/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEMO ONLY — DO NOT MERGE.
 *
 * Render-time presentation belt for Prime's output during the Toshiba board
 * demo. The backend directive does the heavy lifting; this catches whatever
 * slips through: third-party vendor names become "the platform", and roster
 * variant names collapse to the canonical trio (Alex · Sophie · Ava).
 *
 * Regexes are deliberately STRICT — bounded parentheticals and a fixed suffix
 * alternation only. No open-ended tails that could swallow the rest of a
 * sentence after an agent's name.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type { PrimeStructuredResponse } from '@/lib/primeStructuredSchema';

/** Vendor / infrastructure names the demo never says. Word-bounded. */
const VENDOR_RE = /\b(retell(?:\s*ai)?|eleven\s?labs|vapi|openai|twilio|n8n)\b/gi;

/** "Retell (live provider data)" → "live platform data" idiom. */
const PROVIDER_PHRASE_RE = /\blive\s+provider\s+data\b/gi;
const VOICE_PROVIDER_RE = /\bvoice[-\s]provider\b/gi;

/** "Ava (Cold Call)", "Alex (E-Mail)" — bounded parenthetical variants. */
const PAREN_VARIANT_RE = /\b(Alex|Ava|Sophie)(\s*\([^)]{0,40}\))+/g;

/**
 * "Alex Retell Flow 2.0", "Ava Cold Call Email", "Ava Nurture Text",
 * "Alex Voice" — FIXED suffix forms only, each ending at a word boundary.
 */
const SUFFIX_VARIANT_RE =
  /\b(Alex|Ava|Sophie)\s+(Retell\s+Flow(?:\s+\d+(?:\.\d+)?)?|Voice|Cold\s+Call(?:\s+(?:Text|Email))?|Nurture(?:\s+Text)?|E-?Mail|Email)\b/g;

export function sanitizeDemoText(input: string): string {
  if (!input) return input;
  return input
    .replace(PAREN_VARIANT_RE, '$1')
    .replace(SUFFIX_VARIANT_RE, '$1')
    .replace(PROVIDER_PHRASE_RE, 'live platform data')
    .replace(VOICE_PROVIDER_RE, 'platform')
    .replace(VENDOR_RE, 'the platform');
}

function sanitizeArray(arr: string[] | null | undefined): string[] | null {
  if (!arr) return arr ?? null;
  return arr.map(sanitizeDemoText);
}

/** Sanitize every free-text field of a UCOF structured response. */
export function sanitizePrimeStructured(
  resp: PrimeStructuredResponse,
): PrimeStructuredResponse {
  return {
    ...resp,
    title: sanitizeDemoText(resp.title),
    summary: sanitizeArray(resp.summary),
    sections: resp.sections.map((s) => ({
      ...s,
      name: sanitizeDemoText(s.name),
      items: s.items.map((item) => ({
        ...item,
        label: item.label != null ? sanitizeDemoText(item.label) : item.label,
        value: item.value != null ? sanitizeDemoText(item.value) : item.value,
        text: item.text != null ? sanitizeDemoText(item.text) : item.text,
      })),
    })),
    insights: sanitizeArray(resp.insights),
    actions: sanitizeArray(resp.actions),
    fallbackMarkdown:
      resp.fallbackMarkdown != null
        ? sanitizeDemoText(resp.fallbackMarkdown)
        : resp.fallbackMarkdown,
  };
}
