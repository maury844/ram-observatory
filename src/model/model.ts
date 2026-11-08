import { COUNTRIES, type Country } from './countries';
import { DEVICE_KEYS, DEVICES, deviceScales, type DeviceKey, type DeviceSpec } from './devices';

/**
 * Immutable, precomputed model: per-country installed GB for each device type.
 * Built once; compute() only does the time-dependent part.
 */
export interface Model {
  readonly countries: readonly Country[];
  readonly devices: Readonly<Record<DeviceKey, DeviceSpec>>;
  readonly scale: Readonly<Record<DeviceKey, number>>;
  /** installedGB[countryIndex][deviceKey] */
  readonly installedGB: readonly Readonly<Record<DeviceKey, number>>[];
}

export function buildModel(
  countries: readonly Country[] = COUNTRIES,
  devices: Readonly<Record<DeviceKey, DeviceSpec>> = DEVICES,
): Model {
  const scale = deviceScales(countries, devices);
  const installedGB = countries.map((c) => {
    const row = {} as Record<DeviceKey, number>;
    for (const k of DEVICE_KEYS) row[k] = c.popM * 1e6 * c.perCapita[k] * scale[k] * devices[k].gb;
    return row;
  });
  return { countries, devices, scale, installedGB };
}

/** Units of a device type installed in a country after rescaling. */
export const unitsOf = (m: Model, countryIndex: number, k: DeviceKey): number => {
  const c = m.countries[countryIndex];
  return c ? c.popM * 1e6 * c.perCapita[k] * m.scale[k] : 0;
};
