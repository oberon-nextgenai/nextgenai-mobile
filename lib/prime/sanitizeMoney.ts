/**
 * Money scrub for everything Prime says.
 *
 * Prime Mobile renders no monetary amount anywhere — metered spend, per-run
 * cost and the amount under an approval alike. The structural surfaces were
 * handled by removing `fmtCurrency` (see `lib/formatters.ts`); this is the belt
 * for the one channel that cannot be enumerated, namely the model's own prose
 * and its UCOF sections.
 *
 * This is a descendant of the Toshiba demo's presentation belt, with its
 * central exemption REMOVED: that version deliberately preserved
 * contract-scale dollars (`$6,300/mo` plans, comma-grouped quotes) and scrubbed
 * only small metering amounts. Here there is no such carve-out — a figure is a
 * figure.
 *
 * A client-side belt is defence in depth, not the primary control. The durable
 * fix is the Prime system directive on the API side; regexes over model prose
 * will always miss some phrasing, so treat a leak as an API-side bug rather
 * than a reason to grow the patterns here without bound.
 */
import type { PrimeSection, PrimeStructuredResponse } from '@/lib/primeStructuredSchema';

/**
 * A currency amount in any of the shapes a model actually emits: a symbol
 * before the figure (`$1,234.56`, `€50`), an ISO code on either side
 * (`USD 1,200`, `1,200 USD`), or the amount spelled with its unit
 * (`1,200 dollars`). Symbols are matched with an optional space because models
 * emit both `$ 50` and `$50`.
 */
const CURRENCY_SYMBOL = '[$€£¥₹]';
const CURRENCY_CODE = '(?:USD|EUR|GBP|JPY|INR|CAD|AUD|CHF)';
const AMOUNT = String.raw`\d[\d,]*(?:\.\d+)?`;

const MONEY_RE = new RegExp(
  [
    // $1,234.56 · US$ 50 · €50
    String.raw`(?:US\s*)?${CURRENCY_SYMBOL}\s?${AMOUNT}`,
    // USD 1,200 · 1,200 USD
    String.raw`\b${CURRENCY_CODE}\s?${AMOUNT}\b`,
    String.raw`\b${AMOUNT}\s?${CURRENCY_CODE}\b`,
    // 1,200 dollars · 0.57 dollars per run
    String.raw`\b${AMOUNT}\s?(?:dollars?|euros?|pounds?|cents?)\b`,
  ].join('|'),
  'i',
);

/**
 * Section names that exist to report money. Matched on the NAME alone — a
 * "Cost drivers" section whose values happen to carry no `$` is still a money
 * section, and dropping it by name is what keeps the scrub from depending on
 * how the model chose to format its figures.
 */
const MONEY_SECTION_RE = /\b(?:cost|costs|spend|spending|budget|billing|invoice|revenue|pricing|price)\b/i;

/** True when a string shows an actual amount. */
export function containsMoney(input: string): boolean {
  return MONEY_RE.test(input);
}

/**
 * Whole-line drop rather than in-place redaction: a sentence built around a
 * figure reads as damaged once the figure is cut out ("The contract is worth
 * ."), and a `[redacted]` marker in a chat bubble advertises exactly what it
 * was meant to withhold.
 */
function isMoneyLine(line: string): boolean {
  return containsMoney(line);
}

/**
 * Name-based only, deliberately. A section that EXISTS to report money goes
 * wholesale; a section that merely carries one money item among others (a
 * "Workforce" block with a stray spend row) keeps its shape and loses the row
 * to the item-level filter below. Testing items here as well would collapse
 * the second case into the first and throw away good rows.
 */
function isMoneySection(section: PrimeSection): boolean {
  return MONEY_SECTION_RE.test(section.name);
}

/** Drop money-bearing lines from a block of free text. */
export function sanitizeMoneyText(input: string): string {
  if (!input) return input;
  return input
    .split('\n')
    .filter((line) => !isMoneyLine(line))
    .join('\n');
}

/** Sanitize a string array, dropping money-bearing entries entirely. */
function sanitizeLines(arr: string[] | null | undefined): string[] | null {
  if (!arr) return arr ?? null;
  const kept = arr.filter((line) => !isMoneyLine(line));
  return kept.length > 0 ? kept : null;
}

/**
 * Strip money from a UCOF structured response.
 *
 * Returns `null` when every section was a money section — the caller then falls
 * back to the (equally scrubbed) markdown rather than rendering an empty card.
 */
export function sanitizeMoneyStructured(
  resp: PrimeStructuredResponse,
): PrimeStructuredResponse | null {
  const sections = resp.sections
    .filter((section) => !isMoneySection(section))
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          ![item.label, item.value, item.text].some(
            (field) => typeof field === 'string' && containsMoney(field),
          ),
      ),
    }))
    // An item-level scrub can empty a section; the schema requires at least one
    // item, so a hollowed section is dropped rather than rendered bare.
    .filter((section) => section.items.length > 0);

  if (sections.length === 0) return null;

  return {
    ...resp,
    summary: sanitizeLines(resp.summary),
    sections,
    insights: sanitizeLines(resp.insights),
    actions: sanitizeLines(resp.actions),
    fallbackMarkdown:
      resp.fallbackMarkdown != null
        ? sanitizeMoneyText(resp.fallbackMarkdown)
        : resp.fallbackMarkdown,
  };
}
