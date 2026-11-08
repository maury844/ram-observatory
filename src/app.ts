import { Globe } from './globe/globe';
import { compute, type ComputeResult } from './model/compute';
import { DEVICE_KEYS } from './model/devices';
import { createEnvelopeCache } from './model/envelope';
import { toEB } from './model/format';
import { buildModel } from './model/model';
import { angerFraction } from './model/mood';
import { isSFNight } from './model/time';
import { createAppStore, simTime, type AppState } from './state/app-state';
import { Smoother } from './state/smoother';
import { createDevices } from './ui/devices';
import { COMPACT_QUERY, media, ref } from './ui/dom';
import { createDonate } from './ui/donate';
import { createHeader } from './ui/header';
import { createHero } from './ui/hero';
import { createMood } from './ui/mood';
import { createRegions } from './ui/regions';
import { createScrubber } from './ui/scrubber';

const TICK_MS = 1000;

/**
 * Wires model → store → views.
 *
 *   store change / 1 s tick ──► recompute() ──► targets ──► Smoother ──► rAF render
 *                                   │                                    (numbers, bars, mood)
 *                                   └──► globe.setData() / discrete UI (clock, switches, scrubber)
 */
export function startApp(): () => void {
  const reducedMq = media('(prefers-reduced-motion: reduce)');
  const compactMq = media(COMPACT_QUERY);
  const store = createAppStore(reducedMq.matches);
  const model = buildModel();
  const getEnvelope = createEnvelopeCache(model);
  const smoother = new Smoother(600);

  const header = createHeader();
  const hero = createHero();
  const scrubber = createScrubber(store);
  const devices = createDevices(store);
  const regions = createRegions();
  const mood = createMood();
  const donate = createDonate(store);
  const globe = new Globe({
    stage: ref('globeStage'),
    canvas: ref<HTMLCanvasElement>('globeCanvas'),
    tip: ref('globeTip'),
    clip: ref('heroClip'),
    onUserRotate: () => store.set({ spinning: false }),
    isCompact: () => compactMq.matches,
  });

  let night = false;
  let regionNames: string[] = [];

  function setTargets(result: ComputeResult, anger: number): void {
    smoother.setTarget('idleEB', toEB(result.idle));
    smoother.setTarget('totalEB', toEB(result.total));
    smoother.setTarget('pct', 100 * result.idleFraction);
    smoother.setTarget('anger', anger);
    for (const k of DEVICE_KEYS) {
      const b = result.byDev[k];
      smoother.setTarget(`d_${k}_idle`, toEB(b.idle));
      smoother.setTarget(`d_${k}_pct`, b.total ? (100 * b.idle) / b.total : 0);
    }
    regionNames = [];
    for (const [name, t] of result.byRegion) {
      if (t.total <= 0) continue;
      regionNames.push(name);
      smoother.setTarget(`r_${name}`, (100 * t.idle) / t.total);
    }
  }

  function recompute(): void {
    const s = store.get();
    const d = simTime(s);
    const result = compute(model, d, s.enabled);
    const env = getEnvelope(s.enabled, d);
    night = isSFNight(d);
    setTargets(result, angerFraction(result.idleFraction, env, night));
    if (s.reducedMotion) smoother.snap();
    globe.setData({ result, date: d, enabled: s.enabled });
    header.render(d, s.offsetMin);
    renderSmoothed();
  }

  function renderSmoothed(): void {
    const v = (k: string) => smoother.get(k) ?? 0;
    hero.render(v('idleEB'), v('totalEB'), v('pct'));
    devices.renderValues((k) => smoother.get(k));
    regions.render(regionNames.map((name) => ({ name, pct: v(`r_${name}`) })));
    mood.render(v('anger'), night);
  }

  function renderState(s: AppState, prev?: AppState): void {
    scrubber.render(s);
    devices.renderFlags(s.enabled);
    donate.render(s.donateStep);
    globe.setSpinning(s.spinning);
    if (
      !prev ||
      s.enabled !== prev.enabled ||
      s.offsetMin !== prev.offsetMin ||
      s.reducedMotion !== prev.reducedMotion
    ) {
      recompute();
    }
  }

  const unsubscribe = store.subscribe((s, prev) => renderState(s, prev));
  const onReduced = (e: MediaQueryListEvent) =>
    store.set((s) => ({ reducedMotion: e.matches, spinning: e.matches ? false : s.spinning }));
  reducedMq.addEventListener('change', onReduced);

  renderState(store.get());
  smoother.snap();
  renderSmoothed();

  const interval = window.setInterval(recompute, TICK_MS);
  const onVisible = () => {
    if (!document.hidden) recompute();
  };
  document.addEventListener('visibilitychange', onVisible);

  let raf = 0;
  let last = performance.now();
  const frame = (t: number) => {
    const dt = t - last;
    last = t;
    if (smoother.step(dt)) renderSmoothed();
    globe.frame(dt);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    clearInterval(interval);
    unsubscribe();
    reducedMq.removeEventListener('change', onReduced);
    document.removeEventListener('visibilitychange', onVisible);
    globe.destroy();
  };
}
