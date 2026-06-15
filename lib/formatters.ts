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

export function fmtCurrency(v?: number | null): string {
  if (v == null || Number.isNaN(v)) return '—';
  return `$${v.toFixed(2)}`;
}
