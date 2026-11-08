import { utcHours } from './time';

/**
 * Approximate subsolar point [lon, lat] in degrees (NOAA-style low-precision formulas:
 * equation of time + Cooper's declination). Good to ~1°, plenty for a terminator on a globe.
 */
export function subsolar(d: Date): [lon: number, lat: number] {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const N = (d.getTime() - start) / 86_400_000; // fractional day of year
  const B = ((2 * Math.PI) / 365) * (N - 81);
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B); // minutes
  const decl = 23.44 * Math.sin(((2 * Math.PI) / 365) * (284 + N));
  const lon = -15 * (utcHours(d) + eot / 60 - 12);
  return [((((lon + 540) % 360) + 360) % 360) - 180, decl];
}

/** Antipode of the subsolar point: centre of the night hemisphere. */
export function antisolar(d: Date): [lon: number, lat: number] {
  const [lon, lat] = subsolar(d);
  return [lon > 0 ? lon - 180 : lon + 180, -lat];
}
