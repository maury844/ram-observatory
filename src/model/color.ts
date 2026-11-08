/** Idle-share colour ramp shared by the globe dots, legend and tooltip (warm palette). */
type RGB = readonly [r: number, g: number, b: number];
interface Stop {
  readonly at: number;
  readonly rgb: RGB;
}

// Keep in sync with --ramp in src/styles/tokens.css.
const STOPS: readonly [Stop, ...Stop[]] = [
  { at: 0.7, rgb: [0x6a, 0x4b, 0x1c] },
  { at: 0.86, rgb: [0xf5, 0xa5, 0x24] },
  { at: 0.95, rgb: [0xff, 0x7a, 0x1a] },
  { at: 1.0, rgb: [0xff, 0x4d, 0x4d] },
];

const lerp = (a: number, b: number, t: number): number => Math.round(a + (b - a) * t);
const css = ([r, g, b]: RGB): string => `rgb(${r}, ${g}, ${b})`;

/** Piecewise-linear RGB ramp over idle fraction 0.70 → 1.00, clamped at both ends. */
export function idleColor(f: number): string {
  let prev: Stop = STOPS[0];
  if (!(f > prev.at)) return css(prev.rgb); // also catches NaN
  for (const stop of STOPS.slice(1)) {
    if (f <= stop.at) {
      const t = (f - prev.at) / (stop.at - prev.at);
      return css([
        lerp(prev.rgb[0], stop.rgb[0], t),
        lerp(prev.rgb[1], stop.rgb[1], t),
        lerp(prev.rgb[2], stop.rgb[2], t),
      ]);
    }
    prev = stop;
  }
  return css(prev.rgb);
}
