/**
 * "How much is that?" — pre-written comparisons for the hero number.
 *
 * Three tiers follow where the current idle fraction sits within today's range
 * (same day-position the mood uses, but always the full-day range): busiest
 * hour → most idle hour. Each tier has three phrasings; the figures inside them
 * are derived from the live idle bytes and rounded to two significant digits
 * so they don't flicker every second.
 *
 * Reference constants (round, well-known figures; this is satire, not a citation):
 */
const FLOPPY_BYTES = 1.44e6;
const FLOPPY_MM = 3.3;
const MOON_KM = 384_400;
const CHROME_TAB_BYTES = 200e6; // a modest modern tab
const WORLD_POP = 8.2e9;
const LOC_BYTES = 10e12; // the folklore "Library of Congress = 10 TB"
const H100_BYTES = 80e9;
const AGC_BYTES = 4096; // Apollo Guidance Computer: 2048 16-bit words of erasable memory
const MP3_BYTES_PER_S = 16_000; // 128 kbps
const SECONDS_PER_YEAR = 31_557_600;
const HOMO_SAPIENS_YEARS = 300_000;
const BEACH_SAND_GRAINS = 7.5e18; // the often-quoted University of Hawaiʻi estimate
const UNIVERSE_YEARS = 13.8e9;
const DVD_BYTES = 4.7e9;
const DVD_MM = 1.2;
const ISS_KM = 420;

const WORDS: readonly [number, string][] = [
  [1e18, 'quintillion'],
  [1e15, 'quadrillion'],
  [1e12, 'trillion'],
  [1e9, 'billion'],
  [1e6, 'million'],
];

/** 2 significant digits, spelled with a scale word: 9.7 trillion, 140 billion, 23 million. */
export function bigWords(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  for (const [v, w] of WORDS) {
    if (n >= v) return `${sig2(n / v)} ${w}`;
  }
  return sig2(n);
}

/** Multiplier text: 1 decimal under 10, two significant digits above (so it doesn't flicker). */
export function times(k: number): string {
  if (!Number.isFinite(k) || k <= 0) return '0';
  return k < 10 ? k.toFixed(1).replace(/\.0$/, '') : sig2(k);
}

function sig2(x: number): string {
  if (x === 0) return '0';
  const p = 10 ** (Math.floor(Math.log10(x)) - 1);
  const r = Math.round(x / p) * p;
  return r >= 10 ? Math.round(r).toLocaleString('en-US') : r.toFixed(1).replace(/\.0$/, '');
}

export type ScaleTier = 'low' | 'mid' | 'high';
type Phrase = (bytes: number) => string;

export const SCALE_PHRASES: Readonly<Record<ScaleTier, readonly Phrase[]>> = {
  // Busiest hour of the day: "even now…"
  low: [
    (b) => {
      const n = b / FLOPPY_BYTES;
      return `Even near the busiest hour, that's ${bigWords(n)} floppy disks. Stacked, ${times((n * FLOPPY_MM) / 1e6 / MOON_KM)}× the distance to the Moon.`;
    },
    (b) => {
      const n = b / CHROME_TAB_BYTES;
      return `Enough to keep ${bigWords(n)} Chrome tabs open — about ${times(n / WORLD_POP)} for every person on Earth.`;
    },
    (b) =>
      `That's ${bigWords(b / LOC_BYTES)} Libraries of Congress, by the classic 10 TB estimate. Nobody is reading any of them.`,
  ],
  // Middle of the range.
  mid: [
    (b) =>
      `That's the memory of ${bigWords(b / H100_BYTES)} Nvidia H100s, sitting in bedrooms and pockets.`,
    (b) =>
      `Enough to give ${bigWords(b / AGC_BYTES)} Apollo Guidance Computers their full 4 KB. They went to the Moon on that.`,
    (b) => {
      const yrs = b / MP3_BYTES_PER_S / SECONDS_PER_YEAR;
      return `Room for ${bigWords(yrs)} years of nonstop MP3s — ${times(yrs / HOMO_SAPIENS_YEARS)}× longer than humans have existed.`;
    },
  ],
  // Most idle hour of the day.
  high: [
    (b) =>
      `One byte per grain, that's ${times(b / BEACH_SAND_GRAINS)}× the often-quoted count of sand grains on every beach on Earth.`,
    (b) =>
      `Read at one byte per second, it would take ${times(b / SECONDS_PER_YEAR / UNIVERSE_YEARS)}× the age of the universe to get through it.`,
    (b) => {
      const n = b / DVD_BYTES;
      const km = (n * DVD_MM) / 1e6;
      return `That's ${bigWords(n)} DVDs. Stacked, ${bigWords(km)} km high — ${times(km / ISS_KM)}× higher than the ISS.`;
    },
  ],
};

export function scaleTier(dayPosition: number): ScaleTier {
  // Same breakpoints as the awake moods (calm < 0.40 ≤ concerned < 0.75 ≤ furious).
  return dayPosition < 0.4 ? 'low' : dayPosition < 0.75 ? 'mid' : 'high';
}

/** Phrases rotate every `rotateMs` within the current tier. */
export function scalePhrase(
  idleBytes: number,
  dayPosition: number,
  nowMs: number,
  rotateMs = 20_000,
): string {
  const list = SCALE_PHRASES[scaleTier(dayPosition)];
  const phrase = list[Math.floor(nowMs / rotateMs) % list.length] ?? list[0];
  return phrase ? phrase(idleBytes) : '';
}
