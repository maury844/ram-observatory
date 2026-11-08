/** Idle-share colour ramp shared by the globe dots, legend and tooltip (warm palette). */
const STOPS: readonly (readonly [number, readonly [number, number, number]])[] = [
  [0.7, [0x6a, 0x4b, 0x1c]],
  [0.86, [0xf5, 0xa5, 0x24]],
  [0.95, [0xff, 0x7a, 0x1a]],
  [1.0, [0xff, 0x4d, 0x4d]],
];

/** Piecewise-linear RGB ramp over idle fraction 0.70 → 1.00, clamped at both ends. */
export function idleColor(f: number): string {
  const first = STOPS[0];
  const last = STOPS[STOPS.length - 1];
  if (!first || !last) return '#f5a524';
  let rgb: readonly [number, number, number] = first[1];
  if (f >= last[0]) rgb = last[1];
  else if (f > first[0]) {
    for (let i = 1; i < STOPS.length; i++) {
      const a = STOPS[i - 1];
      const b = STOPS[i];
      if (a && b && f <= b[0]) {
        const t = (f - a[0]) / (b[0] - a[0]);
        rgb = [0, 1, 2].map((j) => Math.round(a[1][j]! + (b[1][j]! - a[1][j]!) * t)) as [
          number,
          number,
          number,
        ];
        break;
      }
    }
  }
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}
