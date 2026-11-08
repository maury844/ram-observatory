import { compute } from './compute';
import { flagsKey, type DeviceFlags } from './devices';
import type { Model } from './model';
import { isSFNight, utcDayStart } from './time';

/** Range of the global idle fraction over a UTC day, overall and during SF night. */
export interface Envelope {
  lo: number;
  hi: number;
  /** Range restricted to samples where it is night in San Francisco (23:00–06:00 PT). */
  nlo: number;
  nhi: number;
}

export const ENVELOPE_STEP_MIN = 10;

/**
 * Sample the idle fraction every 10 minutes across the UTC day containing `ref`.
 * The occupancy curves repeat daily, so the overall range is date-independent; the SF-night
 * sub-range shifts by an hour across DST, which is why the day matters.
 */
export function envelope(model: Model, enabled: DeviceFlags, ref: Date): Envelope {
  let lo = 1;
  let hi = 0;
  let nlo = 1;
  let nhi = 0;
  const base = utcDayStart(ref).getTime();
  for (let m = 0; m < 1440; m += ENVELOPE_STEP_MIN) {
    const d = new Date(base + m * 60_000);
    const f = compute(model, d, enabled).idleFraction;
    lo = Math.min(lo, f);
    hi = Math.max(hi, f);
    if (isSFNight(d)) {
      nlo = Math.min(nlo, f);
      nhi = Math.max(nhi, f);
    }
  }
  // Defensive: should never happen (SF night always overlaps a UTC day), but never return lo>hi.
  if (nlo > nhi) {
    nlo = lo;
    nhi = hi;
  }
  return { lo, hi, nlo, nhi };
}

/**
 * Memoized envelope keyed by (UTC day, enabled devices). A toggle or a scrub across UTC
 * midnight costs one recompute (~144 × compute); everything else is a map lookup.
 */
export function createEnvelopeCache(model: Model, maxEntries = 16) {
  const cache = new Map<string, Envelope>();
  return (enabled: DeviceFlags, ref: Date): Envelope => {
    const key = `${utcDayStart(ref).getTime()}|${flagsKey(enabled)}`;
    let env = cache.get(key);
    if (!env) {
      env = envelope(model, enabled, ref);
      cache.set(key, env);
      if (cache.size > maxEntries) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
    }
    return env;
  };
}
