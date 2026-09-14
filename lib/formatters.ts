import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function fmtDateTime(input?: string | Date | number | null): string {
  if (input == null) return '—';
  try {
    const d = typeof input === 'string' ? parseISO(input) : new Date(input);
    return format(d, 'MMM d, h:mm a');
  } catch {
    return String(input);
  }
}

export function fmtRelative(input?: string | Date | number | null): string {
  if (input == null) return '—';
  try {
    const d = typeof input === 'string' ? parseISO(input) : new Date(input);
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return String(input);
  }
}

export function fmtPct(v?: number | null, digits = 1): string {
  if (v == null || Number.isNaN(v)) return '—';
  return `${v.toFixed(digits)}%`;
}

export function fmtNumber(v?: number | null): string {
  if (v == null || Number.isNaN(v)) return '—';
  return v.toLocaleString();
}

export function fmtDuration(minutes?: number | null): string {
  if (minutes == null || Number.isNaN(minutes)) return '—';
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes < 60) return `${minutes.toFixed(1)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes - h * 60);
  return `${h}h ${m}m`;
}

/**
 * Aggregate voice minutes — the unit that carries consumption across the app.
 *
 * `fmtDuration` is the per-item reading (a 3.4-minute call); this is the ledger
 * reading (1,284 minutes across the workforce), so it stays whole and
 * comma-grouped rather than collapsing into hours.
 */
export function fmtMinutes(v?: number | null): string {
  if (v == null || Number.isNaN(v)) return '—';
  return `${Math.round(v).toLocaleString()} min`;
}

/**
 * There is deliberately NO currency formatter here.
 *
 * Prime Mobile never renders a monetary amount — not metered spend, not
 * per-run cost, not the amount under an approval. Consumption is quoted in
 * minutes (`fmtMinutes`) and volume in counts (`fmtNumber`). A `fmtCurrency`
 * lived here until 2026-09-14; it was removed rather than left unused so the
 * call sites had to be resolved instead of silently re-adopted. Prime's own
 * output is scrubbed separately — see `lib/prime/sanitizeMoney.ts`.
 */
