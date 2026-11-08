import calm from '../assets/bobblehead/calm.webp';
import concerned from '../assets/bobblehead/concerned.webp';
import furious from '../assets/bobblehead/furious.webp';
import nightmare from '../assets/bobblehead/nightmare.webp';
import sleep from '../assets/bobblehead/sleep.webp';
import { angerTicks, motionFor, pickMood, type MoodKey } from '../model/mood';
import { binds, ref, scaleSetter, textSetter } from './dom';

/** Swap these files (same names) to change the Chief RAM Officer. See README. */
export const MOOD_IMAGES: Readonly<Record<MoodKey, string>> = {
  calm,
  concerned,
  furious,
  sleep,
  nightmare,
};

const MOTION_CLASSES = ['wobble', 'shake', 'snore'] as const;
const TONE_CLASSES = ['mood-calm', 'mood-concerned', 'mood-furious', 'mood-sleep'] as const;

export function createMood() {
  const img = ref<HTMLImageElement>('bust');
  const labelEls = binds('moodLabel');
  const setLabel = textSetter(labelEls);
  const setQuote = textSetter(binds('moodQuote'));
  const setPct = textSetter(binds('angerPct'));
  const setBar = scaleSetter(binds('angerBar')[0] as HTMLElement);
  const setLo = textSetter(binds('tickLo'));
  const setHi = textSetter(binds('tickHi'));
  let lastKey: MoodKey | null = null;
  let lastMotion = '';

  binds('angerBar').forEach((el) => el.classList.add('bar-fill'));

  // Warm the cache so mood swaps don't flash an empty frame.
  const preload = () => {
    for (const src of Object.values(MOOD_IMAGES)) {
      const i = new Image();
      i.decoding = 'async';
      i.src = src;
    }
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(preload, { timeout: 3000 });
  else setTimeout(preload, 1500);

  return {
    render(anger: number, night: boolean): void {
      const m = pickMood(anger, night);
      if (m.key !== lastKey) {
        lastKey = m.key;
        img.src = MOOD_IMAGES[m.key];
        img.alt = m.alt;
        setQuote(m.quote);
        for (const el of labelEls) {
          el.classList.remove(...TONE_CLASSES);
          el.classList.add(`mood-${m.tone}`);
        }
      }
      setLabel(m.label);
      const motion = motionFor(m, night);
      if (motion !== lastMotion) {
        lastMotion = motion;
        img.classList.remove(...MOTION_CLASSES);
        img.classList.add(motion);
      }
      setPct((anger * 100).toFixed(0));
      setBar(anger);
      const [lo, hi] = angerTicks(night);
      setLo(lo);
      setHi(hi);
    },
  };
}
