import type { Country } from './countries';

export const DEVICE_KEYS = ['pc', 'phone', 'console'] as const;
export type DeviceKey = (typeof DEVICE_KEYS)[number];
export type DeviceFlags = Readonly<Record<DeviceKey, boolean>>;

export interface DeviceSpec {
  readonly key: DeviceKey;
  readonly name: string;
  /** Worldwide installed base (units). Per-capita tiers are rescaled to hit this exactly. */
  readonly base: number;
  /** Average DRAM per installed unit, GB (decimal). */
  readonly gb: number;
  /** Share of the device's RAM that is "working" while a human is actively using it. */
  readonly cap: number;
  /** PCs are the whole point: always counted, toggle is locked on. */
  readonly locked: boolean;
  readonly defaultOn: boolean;
  /** Short label shown under the device name. */
  readonly meta: string;
  /** P(device actively serving a human) for each local hour 00..23. */
  readonly occ: readonly number[];
}

// Values ported verbatim from the prototype. See README "How the model works" for sources.
export const DEVICES: Readonly<Record<DeviceKey, DeviceSpec>> = {
  pc: {
    key: 'pc',
    name: 'PCs',
    base: 1.5e9,
    gb: 10.5,
    cap: 0.55,
    locked: true,
    defaultOn: true,
    meta: '1.5 B units · 10.5 GB · ~6.7 h/day',
    // prettier-ignore
    occ: [.03,.02,.02,.02,.02,.04,.10,.22,.38,.45,.47,.46,.40,.45,.47,.46,.42,.36,.32,.34,.36,.30,.18,.08],
  },
  phone: {
    key: 'phone',
    name: 'Smartphones',
    base: 6.5e9,
    gb: 5.5,
    cap: 0.6,
    locked: false,
    defaultOn: false,
    meta: '6.5 B units · 5.5 GB · ~4.8 h/day',
    // prettier-ignore
    occ: [.04,.02,.02,.02,.02,.05,.12,.22,.25,.22,.22,.24,.28,.24,.22,.22,.24,.28,.32,.36,.40,.38,.28,.12],
  },
  console: {
    key: 'console',
    name: 'Consoles',
    base: 3.0e8,
    gb: 12,
    cap: 0.9,
    locked: false,
    defaultOn: false,
    meta: '300 M units · 12 GB · ~2.2 h/day',
    // prettier-ignore
    occ: [.03,.02,.01,.01,.01,.01,.02,.03,.04,.05,.06,.07,.08,.08,.09,.11,.14,.17,.20,.24,.26,.22,.14,.07],
  },
};

export const DEFAULT_FLAGS: DeviceFlags = {
  pc: DEVICES.pc.defaultOn,
  phone: DEVICES.phone.defaultOn,
  console: DEVICES.console.defaultOn,
};

/**
 * Per-device multiplier that turns "population × per-capita tier" into units so that the
 * sum over all countries equals the declared installed base.
 */
export function deviceScales(
  countries: readonly Country[],
  devices: Readonly<Record<DeviceKey, DeviceSpec>> = DEVICES,
): Record<DeviceKey, number> {
  const out = {} as Record<DeviceKey, number>;
  for (const k of DEVICE_KEYS) {
    const raw = countries.reduce((s, c) => s + c.popM * 1e6 * c.perCapita[k], 0);
    out[k] = raw > 0 ? devices[k].base / raw : 0;
  }
  return out;
}

/** Smoothstep-interpolated occupancy at fractional local hour h (wraps around midnight). */
export function occAt(curve: readonly number[], h: number): number {
  const hh = ((h % 24) + 24) % 24;
  const i = Math.floor(hh);
  const f = hh - i;
  const a = curve[i] ?? 0;
  const b = curve[(i + 1) % 24] ?? 0;
  const t = f * f * (3 - 2 * f);
  return a + (b - a) * t;
}

/** Stable cache key for a set of enabled devices, e.g. "pc+console". */
export const flagsKey = (flags: DeviceFlags): string =>
  DEVICE_KEYS.filter((k) => flags[k]).join('+');
