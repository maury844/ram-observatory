import type { AppStore } from '../state/app-state';
import { binds, ref, textSetter } from './dom';

const STEPS = [
  'Locating your DIMMs…',
  'Negotiating with your motherboard…',
  'Compressing 16 GB into a URL…',
  'Routing through the nearest hyperscaler…',
  'Almost there…',
];
const FAILED = 6;
const STEP_MS = 700;

/** The donate gag: five fake progress steps, then a guaranteed failure. */
export function createDonate(store: AppStore) {
  const btn = ref<HTMLButtonElement>('donateBtn');
  const bar = binds('donateBar')[0] as HTMLElement;
  const setMsg = textSetter(binds('donateMsg'));
  const setBtn = textSetter(btn);
  const timers: number[] = [];

  btn.addEventListener('click', () => {
    const step = store.get().donateStep;
    if (step > 0 && step < FAILED) return; // busy
    timers.forEach(clearTimeout);
    timers.length = 0;
    store.set({ donateStep: 1 });
    for (let i = 2; i <= FAILED; i++) {
      timers.push(window.setTimeout(() => store.set({ donateStep: i }), (i - 1) * STEP_MS));
    }
  });

  return {
    render(step: number): void {
      const failed = step >= FAILED;
      const busy = step > 0 && !failed;
      // aria-disabled (not disabled) keeps keyboard focus on the button while it "uploads".
      btn.setAttribute('aria-disabled', String(busy));
      setBtn(
        failed
          ? 'Try again (it will not work)'
          : busy
            ? 'Uploading…'
            : 'Donate my idle RAM to the cloud',
      );
      setMsg(
        failed
          ? 'Upload failed: RAM is not hot-swappable over Wi-Fi. Your memory remains yours. Sorry, Sam.'
          : busy
            ? (STEPS[Math.min(step - 1, STEPS.length - 1)] ?? '')
            : 'One click. Zero exabytes.',
      );
      bar.style.width = `${failed ? 97 : Math.min(97, step * 19)}%`;
      bar.classList.toggle('fail', failed);
    },
  };
}
