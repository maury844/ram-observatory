import { describe, expect, it } from 'vitest';
import {
  ASLEEP,
  AWAKE,
  COUNTRIES,
  DEVICE_KEYS,
  DEVICES,
  angerFraction,
  buildModel,
  compute,
  createEnvelopeCache,
  envelope,
  hhmm,
  idleColor,
  isSFNight,
  motionFor,
  occAt,
  pickMood,
  samGap,
  scrubLabel,
  sfHour,
  subsolar,
  unitsOf,
  type DeviceFlags,
} from '../src/model';

const model = buildModel();
const ALL_FLAGS: DeviceFlags[] = [false, true].flatMap((phone) =>
  [false, true].map((console) => ({ pc: true, phone, console })),
);
const PCS_ONLY: DeviceFlags = { pc: true, phone: false, console: false };
const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);

describe('country table', () => {
  it('has the ~80 countries of the prototype with sane values', () => {
    expect(COUNTRIES.length).toBe(80);
    for (const c of COUNTRIES) {
      expect(Math.abs(c.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(c.lon)).toBeLessThanOrEqual(180);
      expect(c.popM).toBeGreaterThan(0);
      expect(Math.abs(c.utcOffset)).toBeLessThanOrEqual(14);
    }
  });
});

describe('rescaling to installed base', () => {
  it.each(DEVICE_KEYS)('%s units sum exactly to the declared installed base', (k) => {
    const units = COUNTRIES.reduce((s, _c, i) => s + unitsOf(model, i, k), 0);
    expect(rel(units, DEVICES[k].base)).toBeLessThan(1e-12);
  });

  it.each(DEVICE_KEYS)('%s installed GB equals base × GB per device', (k) => {
    const gb = model.installedGB.reduce((s, row) => s + row[k], 0);
    expect(rel(gb, DEVICES[k].base * DEVICES[k].gb)).toBeLessThan(1e-12);
  });

  it('PC-only total is 1.5 B × 10.5 GB = 15.75 EB at any time', () => {
    for (const iso of ['2026-01-01T00:00:00Z', '2026-07-15T13:37:00Z']) {
      const r = compute(model, new Date(iso), PCS_ONLY);
      expect(rel(r.total, 15.75e9)).toBeLessThan(1e-12);
    }
  });
});

describe('occupancy & idle fraction', () => {
  it('occAt interpolates within the curve and wraps midnight', () => {
    const occ = DEVICES.pc.occ;
    expect(occAt(occ, 10)).toBeCloseTo(occ[10]!, 12);
    expect(occAt(occ, 24)).toBeCloseTo(occ[0]!, 12);
    expect(occAt(occ, -1)).toBeCloseTo(occ[23]!, 12);
    const v = occAt(occ, 23.5);
    expect(v).toBeGreaterThanOrEqual(Math.min(occ[23]!, occ[0]!));
    expect(v).toBeLessThanOrEqual(Math.max(occ[23]!, occ[0]!));
  });

  it('idle fraction stays in [0,1] for every device combo across a whole day', () => {
    const base = Date.UTC(2026, 10, 8);
    for (const flags of ALL_FLAGS) {
      for (let m = 0; m < 1440; m += 7) {
        const r = compute(model, new Date(base + m * 60_000), flags);
        expect(r.idleFraction).toBeGreaterThanOrEqual(0);
        expect(r.idleFraction).toBeLessThanOrEqual(1);
        for (const p of r.perCountry) {
          expect(p.idle).toBeGreaterThanOrEqual(0);
          expect(p.idle).toBeLessThanOrEqual(p.total + 1e-6);
          expect(p.localHour).toBeGreaterThanOrEqual(0);
          expect(p.localHour).toBeLessThan(24);
        }
        for (const t of r.byRegion.values()) {
          expect(t.idle).toBeLessThanOrEqual(t.total + 1e-6);
        }
      }
    }
  });

  it('regions sum to the global totals', () => {
    const r = compute(model, new Date('2026-11-08T12:00:00Z'), ALL_FLAGS[3]!);
    const sum = [...r.byRegion.values()].reduce((s, t) => s + t.total, 0);
    expect(rel(sum, r.total)).toBeLessThan(1e-12);
  });
});

describe('envelope', () => {
  const days = ['2026-01-15T12:00:00Z', '2026-03-08T12:00:00Z', '2026-11-01T12:00:00Z'];
  it.each(days)('lo < hi and the night range nests inside the day range (%s)', (iso) => {
    for (const flags of ALL_FLAGS) {
      const e = envelope(model, flags, new Date(iso));
      expect(e.lo).toBeLessThan(e.hi);
      expect(e.nlo).toBeLessThan(e.nhi);
      expect(e.nlo).toBeGreaterThanOrEqual(e.lo);
      expect(e.nhi).toBeLessThanOrEqual(e.hi);
      expect(e.lo).toBeGreaterThan(0);
      expect(e.hi).toBeLessThanOrEqual(1);
    }
  });

  it('cache returns the same object for the same day+devices and recomputes on toggle', () => {
    const get = createEnvelopeCache(model);
    const d = new Date('2026-11-08T03:00:00Z');
    const a = get(PCS_ONLY, d);
    expect(get(PCS_ONLY, new Date('2026-11-08T22:00:00Z'))).toBe(a);
    expect(get({ ...PCS_ONLY, phone: true }, d)).not.toBe(a);
  });
});

describe('SF night (America/Los_Angeles, DST-aware)', () => {
  it.each([
    // 13:30Z is 05:30 PST (night) but 06:30 PDT (day): the DST switch decides.
    ['2026-03-07T13:30:00Z', true], // Sat before spring-forward: PST
    ['2026-03-08T13:30:00Z', false], // spring-forward day (10:00Z): now PDT → 06:30
    ['2026-10-31T13:30:00Z', false], // Sat before fall-back: PDT → 06:30
    ['2026-11-01T13:30:00Z', true], // fall-back day (09:00Z): now PST → 05:30
    // 23:00 local edge, summer
    ['2026-07-01T05:59:00Z', false], // 22:59 PDT
    ['2026-07-01T06:00:00Z', true], // 23:00 PDT
    ['2026-07-01T12:59:00Z', true], // 05:59 PDT
    ['2026-07-01T13:00:00Z', false], // 06:00 PDT
  ] as const)('%s → night=%s', (iso, night) => {
    expect(isSFNight(new Date(iso))).toBe(night);
  });

  it('reports midnight as hour 0, never 24', () => {
    expect(sfHour(new Date('2026-07-01T07:00:00Z'))).toBe(0);
    expect(sfHour(new Date('2026-01-01T08:00:00Z'))).toBe(0);
  });

  it('the repeated 01:00 hour on fall-back day is handled', () => {
    expect(sfHour(new Date('2026-11-01T08:30:00Z'))).toBe(1); // 01:30 PDT
    expect(sfHour(new Date('2026-11-01T09:30:00Z'))).toBe(1); // 01:30 PST
  });
});

describe('subsolar point', () => {
  it('equinox noon UTC is near lon 0, lat 0', () => {
    const [lon, lat] = subsolar(new Date('2026-03-20T12:00:00Z'));
    expect(Math.abs(lon)).toBeLessThan(3);
    expect(Math.abs(lat)).toBeLessThan(1);
  });

  it('solstices put the sun over the tropics', () => {
    expect(subsolar(new Date('2026-06-21T12:00:00Z'))[1]).toBeCloseTo(23.44, 0);
    expect(subsolar(new Date('2026-12-21T12:00:00Z'))[1]).toBeCloseTo(-23.44, 0);
  });

  it('moves ~15° west per hour and stays in [-180, 180]', () => {
    const a = subsolar(new Date('2026-03-20T12:00:00Z'))[0];
    const b = subsolar(new Date('2026-03-20T13:00:00Z'))[0];
    expect(a - b).toBeCloseTo(15, 1);
    for (let h = 0; h < 24; h++) {
      const [lon] = subsolar(new Date(Date.UTC(2026, 0, 1, h)));
      expect(lon).toBeGreaterThanOrEqual(-180);
      expect(lon).toBeLessThanOrEqual(180);
    }
  });
});

describe('mood bands', () => {
  it.each([
    [0, false, 'calm'],
    [0.399, false, 'calm'],
    [0.4, false, 'concerned'],
    [0.749, false, 'concerned'],
    [0.75, false, 'furious'],
    [1, false, 'furious'],
    [0, true, 'sleep'],
    [0.499, true, 'sleep'],
    [0.5, true, 'nightmare'],
    [1, true, 'nightmare'],
    [-3, false, 'calm'],
    [7, false, 'furious'],
    [Number.NaN, true, 'sleep'],
  ] as const)('anger %s, night=%s → %s', (a, night, key) => {
    expect(pickMood(a, night).key).toBe(key);
  });

  it('anger uses the night range while asleep and is clamped', () => {
    const env = { lo: 0.8, hi: 0.9, nlo: 0.85, nhi: 0.88 };
    expect(angerFraction(0.8, env, false)).toBe(0);
    expect(angerFraction(0.9, env, false)).toBe(1);
    expect(angerFraction(0.85, env, false)).toBeCloseTo(0.5, 12);
    expect(angerFraction(0.85, env, true)).toBe(0);
    expect(angerFraction(0.95, env, true)).toBe(1);
    expect(angerFraction(0.5, env, false)).toBe(0);
  });

  it('band tables are sorted and cover [0,1]', () => {
    for (const bands of [AWAKE, ASLEEP]) {
      const maxes = bands.map((m) => m.max);
      expect([...maxes].sort((a, b) => a - b)).toEqual(maxes);
      expect(maxes[maxes.length - 1]).toBeGreaterThan(1);
    }
  });

  it('furious shakes, sleep breathes, otherwise wobble', () => {
    expect(motionFor(pickMood(0.9, false), false)).toBe('shake');
    expect(motionFor(pickMood(0.1, true), true)).toBe('snore');
    expect(motionFor(pickMood(0.9, true), true)).toBe('snore');
    expect(motionFor(pickMood(0.1, false), false)).toBe('wobble');
  });
});

describe('formatting & colour', () => {
  it('scrub labels', () => {
    expect(scrubLabel(0)).toBe('NOW');
    expect(scrubLabel(185)).toBe('+3h 05m');
    expect(scrubLabel(-30)).toBe('−0h 30m');
  });
  it('hh:mm never prints 60 minutes', () => {
    expect(hhmm(23.99999)).toBe('23:59');
    expect(hhmm(5.75)).toBe('05:45');
    expect(hhmm(-1)).toBe('23:00');
  });
  it('sam gap', () => {
    expect(samGap(86.7)).toBe('8.3 pts short of the claim');
    expect(samGap(96)).toBe('1.0 pts past the claim');
  });
  it('idle ramp clamps and hits its stops', () => {
    expect(idleColor(0.1)).toBe('rgb(106, 75, 28)');
    expect(idleColor(0.86)).toBe('rgb(245, 165, 36)');
    expect(idleColor(2)).toBe('rgb(255, 77, 77)');
  });
});

describe('hero scale phrases', async () => {
  const { SCALE_PHRASES, scaleTier, scalePhrase, bigWords, times } =
    await import('../src/model/scale');
  it('formats big numbers with two significant digits', () => {
    expect(bigWords(9.65e12)).toBe('9.7 trillion');
    expect(bigWords(1.4e11)).toBe('140 billion');
    expect(bigWords(3600)).toBe('3,600');
    expect(times(83.4)).toBe('83');
    expect(times(1.86)).toBe('1.9');
  });
  it('maps day position to tiers', () => {
    expect(scaleTier(0)).toBe('low');
    expect(scaleTier(0.5)).toBe('mid');
    expect(scaleTier(1)).toBe('high');
  });
  it('every phrase renders sane text across the whole possible range (10–60 EB)', () => {
    for (const list of Object.values(SCALE_PHRASES)) {
      expect(list).toHaveLength(3);
      for (const p of list) {
        for (const eb of [10, 14, 46, 60]) {
          const s = p(eb * 1e18);
          expect(s).not.toMatch(/NaN|Infinity|undefined/);
          expect(s.length).toBeGreaterThan(20);
        }
      }
    }
  });
  it('rotates within a tier and is stable inside a rotation window', () => {
    const a = scalePhrase(14e18, 0, 0);
    expect(scalePhrase(14e18, 0, 19_999)).toBe(a);
    expect(scalePhrase(14e18, 0, 20_000)).not.toBe(a);
  });
});
