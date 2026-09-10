/**
 * Day parts by the device's local clock — the one timezone the person holding
 * the phone actually lives in.
 *
 * The small hours belong to the evening: a brief opened at 00:15 is a late
 * night, not a morning, so "morning" starts at 05:00. Boundaries: 05–11
 * morning, 12–17 afternoon, everything else evening.
 */
export type DayPart = 'morning' | 'afternoon' | 'evening';

export function dayPart(date: Date = new Date()): DayPart {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'evening';
}

/** The greeting's opener — "Good morning", "Good afternoon", "Good evening". */
export const GREETING_BY_PART: Record<DayPart, string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
};

/** The brief card's eyebrow, matched to the same clock as the greeting. */
export const BRIEF_LABEL_BY_PART: Record<DayPart, string> = {
  morning: 'Morning brief',
  afternoon: 'Afternoon brief',
  evening: 'Evening brief',
};
