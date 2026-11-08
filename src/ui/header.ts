import { pad2, utcClock } from '../model/format';
import { sfClock } from '../model/time';
import { binds, textSetter } from './dom';

export function createHeader() {
  const setUtc = textSetter(binds('utcClock'));
  const setSf = textSetter(binds('sfClock'));
  const setLive = textSetter(binds('liveLabel'));
  const dots = binds('liveDot');
  return {
    render(d: Date, offsetMin: number): void {
      setUtc(utcClock(d));
      const sf = sfClock(d);
      setSf(`${pad2(sf.hour)}:${pad2(sf.minute)} SF`);
      setLive(offsetMin ? 'SCRUBBED' : 'LIVE');
      for (const dot of dots) dot.classList.toggle('paused', offsetMin !== 0);
    },
  };
}
