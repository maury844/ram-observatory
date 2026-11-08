import { fixed, samGap } from '../model/format';
import { binds, ref, scaleSetter, textSetter } from './dom';

export function createHero() {
  const setEB = textSetter(binds('heroEB'));
  const setPct = textSetter(binds('heroPct'));
  const setTotal = textSetter(binds('heroTotal'));
  const setGap = textSetter(binds('samGap'));
  const setBar = scaleSetter(binds('heroBar')[0] as HTMLElement);
  const meter = ref('heroMeter');
  let lastNow = '';
  return {
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
