/** 1 EB = 1e9 GB (decimal units throughout). */
export const GB_PER_EB = 1e9;
export const toEB = (gb: number): number => gb / GB_PER_EB;

export const fixed = (v: number | undefined, digits: number): string =>
  v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(digits);

export const pad2 = (n: number): string => String(Math.floor(n)).padStart(2, '0');

/** "HH:MM" for a fractional hour of day. */
export function hhmm(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  // Round to the minute first so 23:59.99 doesn't print as "23:60".
  const totalMin = Math.floor(h * 60 + 1e-9);
  return `${pad2(totalMin / 60)}:${pad2(totalMin % 60)}`;
}

/** Scrubber label: "NOW", "+3h 05m", "−0h 30m" (U+2212 minus). */
export function scrubLabel(offsetMin: number): string {
  if (!offsetMin) return 'NOW';
  const sign = offsetMin > 0 ? '+' : '−';
  const a = Math.abs(offsetMin);
  return `${sign}${Math.floor(a / 60)}h ${pad2(a % 60)}m`;
}

/** Distance from the "95% idle" claim, e.g. "8.3 pts short of the claim". */
export function samGap(pct: number): string {
  const gap = 95 - pct;
  return `${Math.abs(gap).toFixed(1)} pts ${gap > 0 ? 'short of' : 'past'} the claim`;
}

/** "Sun, 08 Nov 2026 18:20:11 UTC" */
export const utcClock = (d: Date): string => d.toUTCString().replace(' GMT', ' UTC');
