import { fixed, samGap } from '../model/format';
import { scalePhrase } from '../model/scale';
import { binds, ref, scaleSetter, textSetter } from './dom';

export function createHero() {
  const setEB = textSetter(binds('heroEB'));
  const setPct = textSetter(binds('heroPct'));
  const setTotal = textSetter(binds('heroTotal'));
  const setGap = textSetter(binds('samGap'));
  const setBar = scaleSetter(binds('heroBar')[0] as HTMLElement);
  const meter = ref('heroMeter');
  const setScale = textSetter(binds('heroScale'));
  let lastNow = '';
  return {
    /** The "how much is that?" line. `dayPosition` is 0 at the busiest hour, 1 at the most idle. */
    renderScale(idleEB: number, dayPosition: number, nowMs: number): void {
      setScale(scalePhrase(idleEB * 1e18, dayPosition, nowMs));
    },
    render(idleEB: number, totalEB: number, pct: number): void {
      setEB(fixed(idleEB, 2));
      setTotal(fixed(totalEB, 2));
      setPct(fixed(pct, 2));
      setBar(pct / 100);
      setGap(samGap(pct));
      const now = pct.toFixed(1);
      if (now !== lastNow) {
        lastNow = now;
        meter.setAttribute('aria-valuenow', now);
        meter.setAttribute('aria-valuetext', `${now}% idle`);
      }
    },
  };
}
