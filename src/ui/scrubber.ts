import { scrubLabel } from '../model/format';
import { actions, type AppState, type AppStore } from '../state/app-state';
import { binds, ref, textSetter } from './dom';

export function createScrubber(store: AppStore) {
  const input = ref<HTMLInputElement>('scrub');
  const liveBtn = ref<HTMLButtonElement>('liveBtn');
  const spinBtn = ref<HTMLButtonElement>('spinBtn');
  const setLabel = textSetter(binds('scrubLabel'));
  const setSpin = textSetter(binds('spinLabel'));

  input.addEventListener('input', () => actions.scrub(store, Number(input.value)));
  liveBtn.addEventListener('click', () => {
    actions.goLive(store);
    input.focus(); // the button disables itself; don't strand keyboard focus on <body>
  });
  spinBtn.addEventListener('click', () => actions.setSpinning(store, !store.get().spinning));

  return {
    render(s: AppState): void {
      const v = String(s.offsetMin);
      if (input.value !== v) input.value = v;
      const label = scrubLabel(s.offsetMin);
      setLabel(label);
      input.setAttribute('aria-valuetext', s.offsetMin ? `${label} from now` : 'now');
      liveBtn.disabled = s.offsetMin === 0;
      setSpin(s.spinning ? 'PAUSE' : 'SPIN');
      spinBtn.classList.toggle('is-paused', !s.spinning);
      spinBtn.setAttribute('aria-label', s.spinning ? 'Pause globe rotation' : 'Spin the globe');
    },
  };
}
