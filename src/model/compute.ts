import type { Country, Region } from './countries';
import { DEVICE_KEYS, occAt, type DeviceFlags, type DeviceKey } from './devices';
import type { Model } from './model';
import { utcHours } from './time';

export interface Totals {
  /** GB installed (decimal). */
  total: number;
  /** GB idle right now. */
  idle: number;
}

export interface CountryResult extends Totals {
  readonly country: Country;
  /** Local standard time, 0 ≤ h < 24. */
  readonly localHour: number;
  /** Per-device breakdown, computed for every device regardless of the toggles. */
  readonly dev: Readonly<Record<DeviceKey, Totals>>;
}

export interface ComputeResult extends Totals {
  /** idle / total for the enabled devices (0 when nothing is installed). */
  readonly idleFraction: number;
  /** Per-device worldwide totals, for every device regardless of the toggles. */
  readonly byDev: Readonly<Record<DeviceKey, Totals>>;
  /** Enabled devices only. Insertion order follows the country table. */
  readonly byRegion: ReadonlyMap<Region, Totals>;
  readonly perCountry: readonly CountryResult[];
}

/**
 * idle(country, device) = installed × (1 − occupancy(local hour) × capacity-in-use)
 *
 * Summed over countries. Only enabled devices contribute to total/idle/byRegion/perCountry.total;
 * byDev and perCountry.dev always include every device so the UI can show what a toggle would add.
 */
export function compute(model: Model, d: Date, enabled: DeviceFlags): ComputeResult {
  const uh = utcHours(d);
  const byDev = {} as Record<DeviceKey, Totals>;
  for (const k of DEVICE_KEYS) byDev[k] = { total: 0, idle: 0 };
  const byRegion = new Map<Region, Totals>();
  const perCountry: CountryResult[] = [];
  let total = 0;
  let idle = 0;

  model.countries.forEach((c, i) => {
    const lh = (((uh + c.utcOffset) % 24) + 24) % 24;
    const gbRow = model.installedGB[i];
    let ct = 0;
    let ci = 0;
    const dev = {} as Record<DeviceKey, Totals>;
    for (const k of DEVICE_KEYS) {
      const spec = model.devices[k];
      const gb = gbRow?.[k] ?? 0;
      const used = gb * occAt(spec.occ, lh) * spec.cap;
      const di = gb - used;
      dev[k] = { total: gb, idle: di };
      byDev[k].total += gb;
      byDev[k].idle += di;
      if (enabled[k]) {
        ct += gb;
        ci += di;
      }
    }
    total += ct;
    idle += ci;
    const r = byRegion.get(c.region) ?? { total: 0, idle: 0 };
    r.total += ct;
    r.idle += ci;
    byRegion.set(c.region, r);
    perCountry.push({ country: c, total: ct, idle: ci, localHour: lh, dev });
  });

  return { total, idle, idleFraction: total > 0 ? idle / total : 0, byDev, byRegion, perCountry };
}
