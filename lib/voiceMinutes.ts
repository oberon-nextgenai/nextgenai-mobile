/**
 * Talk time as the unit of consumption.
 *
 * Prime Mobile quotes what the workforce consumed in minutes rather than
 * money (see the note in `lib/formatters.ts`). The analytics payloads report
 * an AVERAGE duration per call, so a total is that average over the calls it
 * was averaged across — no extra request, and no figure the API did not
 * already supply.
 */

/**
 * Total minutes across a population of calls, or `undefined` when either
 * factor is missing. `undefined` rather than `0`: a tile showing "0 min"
 * asserts that nothing happened, which is a different claim from "we were not
 * told" — the same distinction `executiveHooks` draws for call signal.
 */
export function totalVoiceMinutes(
  averageDurationMinutes?: number | null,
  totalCalls?: number | null,
): number | undefined {
  if (averageDurationMinutes == null || totalCalls == null) return undefined;
  if (Number.isNaN(averageDurationMinutes) || Number.isNaN(totalCalls)) return undefined;
  return averageDurationMinutes * totalCalls;
}
