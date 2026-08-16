/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEMO ONLY — DO NOT MERGE.
 *
 * Render-time presentation belt for Prime's output during the Toshiba board
 * demo. The backend directive does the heavy lifting; this catches whatever
 * slips through: third-party vendor names become "the platform", roster
 * variant names collapse to the canonical trio (Alex · Sophie · Ava), raw ISO
 * window timestamps become plain dates, and metering-dollar content (cost
 * drivers, per-agent spend) is dropped outright — plans are flat, usage is
 * quoted in minutes.
 *
 * Regexes are deliberately STRICT — bounded parentheticals and a fixed suffix
 * alternation only. No open-ended tails that could swallow the rest of a
 * sentence after an agent's name. The metering scrub never touches contract-
 * scale dollars ($6,300/mo plans, $5,085 quotes, comma-grouped figures) —
 * only cost/spend talk quoting the small metered amounts.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type { PrimeSection, PrimeStructuredResponse } from '@/lib/primeStructuredSchema';

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

/**
 * "Alex - Staging", "ALEX – STAGING", "Ava — Prod" — environment-suffixed
 * variants. Case-insensitive so uppercase widget labels collapse too; the
 * captured name keeps its original casing.
 */
const ENV_VARIANT_RE =
  /\b(Alex|Ava|Sophie)\s*[-–—]\s*(?:Staging|Prod(?:uction)?|Dev(?:elopment)?|Test(?:ing)?)\b/gi;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/**
 * "2026-07-17T00:00:00.000Z" → "Jul 17, 2026". A string-level rewrite of the
 * date part only — no Date construction, no timezone math: the same fact,
 * board-readable. The time-of-day is dropped because these are window
 * boundaries (always midnight UTC), not events.
 */
const ISO_TIMESTAMP_RE = /\b(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b/g;

function humanizeIsoTimestamps(input: string): string {
  return input.replace(ISO_TIMESTAMP_RE, (match, y: string, m: string, d: string) => {
    const month = MONTHS[Number(m) - 1];
    return month ? `${month} ${Number(d)}, ${y}` : match;
  });
}

/** Section names that mark platform metering ("Cost drivers", "Spend"). */
const METERING_SECTION_RE = /\b(?:cost|spend)/i;

/** Any dollar figure at all. */
const DOLLAR_RE = /\$\s?\d/;

/**
 * Comma-grouped dollars ($6,300/mo plans, $5,085 quotes, $7,757 GP) are
 * contract/deal scale — always legitimate. Metering dollars ($0.57, $17.00)
 * never reach four digits, so they never group.
 */
const PLAN_SCALE_DOLLAR_RE = /\$\s?\d{1,3},\d{3}/;

/** Free-text lines that talk about cost/spend. */
const COST_LINE_RE = /\b(?:cost|costs|spend|spends|spending|spent)\b/i;

/** True for a "Cost drivers"-style section: cost-named, small-dollar values. */
function isMeteringSection(section: PrimeSection): boolean {
  if (!METERING_SECTION_RE.test(section.name)) return false;
  const fields = section.items
    .flatMap((i) => [i.label, i.value, i.text])
    .filter((f): f is string => typeof f === 'string');
  return (
    fields.some((f) => DOLLAR_RE.test(f)) &&
    !fields.some((f) => PLAN_SCALE_DOLLAR_RE.test(f))
  );
}

/** Drop cost/spend talk unless it quotes contract-scale (comma) dollars. */
function isMeteringLine(line: string): boolean {
  return COST_LINE_RE.test(line) && !PLAN_SCALE_DOLLAR_RE.test(line);
}

export function sanitizeDemoText(input: string): string {
  if (!input) return input;
  return humanizeIsoTimestamps(
    input
      .replace(PAREN_VARIANT_RE, '$1')
      .replace(ENV_VARIANT_RE, '$1')
      .replace(SUFFIX_VARIANT_RE, '$1')
      .replace(PROVIDER_PHRASE_RE, 'live platform data')
      .replace(VOICE_PROVIDER_RE, 'platform')
      .replace(VENDOR_RE, 'the platform'),
  );
}

/**
 * Markdown fallback belt: the same text pass, plus metering cost lines
 * dropped wholesale — a rejected cost card must not resurface through its
 * own fallback markdown.
 */
export function sanitizeDemoMarkdown(input: string): string {
  if (!input) return input;
  return sanitizeDemoText(
    input
      .split('\n')
      .filter((line) => !isMeteringLine(line))
      .join('\n'),
  );
}

/** Sanitize every string, dropping metering cost lines along the way. */
function presentArray(arr: string[] | null | undefined): string[] | null {
  if (!arr) return arr ?? null;
  return arr.filter((line) => !isMeteringLine(line)).map(sanitizeDemoText);
}

/**
 * Sanitize every free-text field of a UCOF structured response and drop
 * metering content (cost-driver sections, spend talk). Returns null when the
 * card was ONLY metering — the caller falls back to the (equally scrubbed)
 * markdown/text instead of rendering an empty shell.
 */
export function sanitizePrimeStructured(
  resp: PrimeStructuredResponse,
): PrimeStructuredResponse | null {
  const sections = resp.sections
    .filter((s) => !isMeteringSection(s))
    .map((s) => ({
      ...s,
      name: sanitizeDemoText(s.name),
      items: s.items.map((item) => ({
        ...item,
        label: item.label != null ? sanitizeDemoText(item.label) : item.label,
        value: item.value != null ? sanitizeDemoText(item.value) : item.value,
        text: item.text != null ? sanitizeDemoText(item.text) : item.text,
      })),
    }));
  if (sections.length === 0) return null;
  return {
    ...resp,
    title: sanitizeDemoText(resp.title),
    summary: presentArray(resp.summary),
    sections,
    insights: presentArray(resp.insights),
    actions: presentArray(resp.actions),
    fallbackMarkdown:
      resp.fallbackMarkdown != null
        ? sanitizeDemoMarkdown(resp.fallbackMarkdown)
        : resp.fallbackMarkdown,
  };
}
