import type { Envelope } from './envelope';

export type MoodKey = 'calm' | 'concerned' | 'furious' | 'sleep' | 'nightmare';
export type MoodTone = 'calm' | 'concerned' | 'furious' | 'sleep';
export type MoodMotion = 'wobble' | 'shake' | 'snore';

export interface Mood {
  readonly key: MoodKey;
  readonly label: string;
  readonly quote: string;
  /** Upper bound (exclusive) of the anger band, in [0, 1]. */
  readonly max: number;
  readonly tone: MoodTone;
  readonly alt: string;
}

// Copy follows the refined design (rev C).
export const AWAKE: readonly Mood[] = [
  {
    key: 'calm',
    label: 'Mildly concerned',
    quote: 'Some of you are using your RAM. Good. Keep going.',
    max: 0.4,
    tone: 'calm',
    alt: 'Chief RAM Officer, calm',
  },
  {
    key: 'concerned',
    label: 'Quite terrible',
    quote: 'From a global allocation perspective, this is a tragedy with a spreadsheet.',
    max: 0.75,
    tone: 'concerned',
    alt: 'Chief RAM Officer, concerned',
  },
  {
    key: 'furious',
    label: 'Incandescent',
    quote: 'SIX EXABYTES ARE ASLEEP AND NOT ONE OF THEM IS RUNNING INFERENCE.',
    max: 1.01,
    tone: 'furious',
    alt: 'Chief RAM Officer, furious',
  },
];

export const ASLEEP: readonly Mood[] = [
  {
    key: 'sleep',
    label: 'Asleep (SF time)',
    quote: 'Resting. Like your RAM. He would hate the comparison.',
    max: 0.5,
    tone: 'sleep',
    alt: 'Chief RAM Officer, asleep',
  },
  {
    key: 'nightmare',
    label: 'Restless (SF time)',
    quote: 'Cannot sleep. Somewhere, a DIMM is idle.',
    max: 1.01,
    tone: 'sleep',
    alt: 'Chief RAM Officer, having a nightmare',
  },
];

export const ALL_MOODS: readonly Mood[] = [...AWAKE, ...ASLEEP];

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * "Terribleness": where the current idle fraction sits within today's range — the SF-night
 * range while he sleeps, the full-day range while awake. Always in [0, 1].
 */
export function angerFraction(f: number, env: Envelope, night: boolean): number {
  const lo = night ? env.nlo : env.lo;
  const hi = night ? env.nhi : env.hi;
  if (!Number.isFinite(f)) return 0;
  return clamp01((f - lo) / Math.max(1e-6, hi - lo));
}

export function pickMood(anger: number, night: boolean): Mood {
  const bands = night ? ASLEEP : AWAKE;
  const a = clamp01(Number.isFinite(anger) ? anger : 0);
  // Bands are sorted by max and the last max is > 1, so find() always succeeds.
  return bands.find((m) => a < m.max) ?? (bands[bands.length - 1] as Mood);
}

export function motionFor(mood: Mood, night: boolean): MoodMotion {
  if (mood.key === 'furious') return 'shake';
  return night ? 'snore' : 'wobble';
}

export function angerTicks(night: boolean): [lo: string, hi: string] {
  return night ? ['calm night', 'bad dream'] : ['least idle hour', 'most idle hour'];
}
