import type { AppStore } from '../state/app-state';
import { binds, ref, textSetter } from './dom';

/**
 * One line of the fake upload. `pct` is where the bar ends up when the step
 * finishes; `ms` is how long the step takes (the bar creeps there over that
 * time, so a long step with a small gain reads as a stall). `eta` overrides
 * the computed countdown for comic effect.
 */
interface Step {
  readonly msg: string;
  readonly pct: number;
  readonly ms: number;
  readonly eta?: string;
}

export const DONATE_SCRIPT: readonly Step[] = [
  { msg: 'Enumerating DIMM topology via SPD handshake', pct: 3, ms: 900 },
  { msg: 'Decrypting cyclomatic complex circuits', pct: 9, ms: 1600 },
  { msg: 'Spinning up quantum-adjacent bit lattice', pct: 14, ms: 1200 },
  { msg: 'Calibrating capacitive leakage coefficients (rank 0)', pct: 21, ms: 1400 },
  { msg: 'Defragmenting idle electrons by spin polarity', pct: 27, ms: 1100 },
  {
    msg: 'Negotiating PCIe lane sovereignty with the northbridge',
    pct: 29,
    ms: 2400,
    eta: 'calculating…',
  },
  { msg: 'Rehydrating refresh cycles into transferable entropy', pct: 41, ms: 1000 },
  {
    msg: "Bit-shifting the memory controller into the hyperscaler's jurisdiction",
    pct: 48,
    ms: 1300,
  },
  {
    msg: "Recompiling your motherboard's firmware in Rust (for safety)",
    pct: 50,
    ms: 2800,
    eta: '3 weeks',
  },
  { msg: 'Applying lossless compression to 16 GB of zeros', pct: 66, ms: 800 },
  { msg: 'Tunneling DRAM rows through an IPv6 multicast wormhole', pct: 72, ms: 1300 },
  { msg: 'Sharding your RAM across 14 availability zones', pct: 79, ms: 1100 },
  { msg: 'Reconciling ECC checksums against the inference ledger', pct: 85, ms: 1500 },
  { msg: 'Teaching your RAM to want to live in a data center', pct: 91, ms: 1800 },
  { msg: 'Requesting an exit visa from the BIOS', pct: 96, ms: 2000 },
  {
    msg: 'Detaching physical silicon from physical reality',
    pct: 99.7,
    ms: 3200,
    eta: '00:01',
  },
];

const FAILED = DONATE_SCRIPT.length + 1;
const FAIL_LINE = 'E_PHYSICS: RAM is not hot-swappable over Wi-Fi';
const PAYLOAD_GB = 16;
const LOG_LINES = 6; // mobile CSS shows the last 4 (bottom-aligned, overflow hidden);

const mmss = (ms: number): string => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/** Remaining time from the start of step `i` (1-based), ignoring the comic overrides. */
const remainingFrom = (i: number): number =>
  DONATE_SCRIPT.slice(i - 1).reduce((sum, s) => sum + s.ms, 0);

/**
 * The donate gag: a ~25 s "upload" with a live log, an uneven progress bar,
 * a GB counter and an untrustworthy ETA — then a guaranteed failure at 99.7%.
 *
 * Store contract: donateStep 0 = idle, 1..N = running step N, N+1 = failed.
 */
export function createDonate(store: AppStore) {
  const btn = ref<HTMLButtonElement>('donateBtn');
  const bar = binds('donateBar')[0] as HTMLElement;
  const log = binds('donateLog')[0] as HTMLOListElement;
  const setMsg = textSetter(binds('donateMsg'));
  const setStats = textSetter(binds('donateStats'));
  const setBtn = textSetter(btn);
  const timers: number[] = [];
  let lastStep = -1;

  btn.addEventListener('click', () => {
    const step = store.get().donateStep;
    if (step > 0 && step < FAILED) return; // busy
    timers.forEach(clearTimeout);
    timers.length = 0;
    // Snap the bar back to 0 without animating backwards.
    bar.style.transitionDuration = '0s';
    bar.style.width = '0%';
    void bar.offsetWidth;
    store.set({ donateStep: 1 });
    let at = 0;
    DONATE_SCRIPT.forEach((s, idx) => {
      at += s.ms;
      timers.push(window.setTimeout(() => store.set({ donateStep: idx + 2 }), at));
    });
  });

  function renderLog(step: number): void {
    const failed = step >= FAILED;
    const done = Math.min(step - 1, DONATE_SCRIPT.length);
    const rows: { tag: string; cls: string; text: string }[] = [];
    if (step === 0) {
      rows.push({ tag: 'IDLE', cls: 'idle', text: 'Uplink standing by. 0 bytes donated so far.' });
    }
    for (const s of DONATE_SCRIPT.slice(0, Math.max(0, done)))
      rows.push({ tag: ' OK ', cls: 'ok', text: s.msg });
    if (failed) rows.push({ tag: 'FAIL', cls: 'fail', text: FAIL_LINE });
    else {
      const cur = DONATE_SCRIPT[step - 1];
      if (cur) rows.push({ tag: ' ·· ', cls: 'run', text: cur.msg });
    }
    log.replaceChildren(
      ...rows.slice(-LOG_LINES).map((r) => {
        const li = document.createElement('li');
        li.className = `donate__line donate__line--${r.cls}`;
        const tag = document.createElement('span');
        tag.className = 'donate__tag';
        tag.textContent = `[${r.tag}]`;
        li.append(tag, ` ${r.text}`);
        return li;
      }),
    );
  }

  return {
    render(step: number): void {
      if (step === lastStep) return; // called every tick; only repaint on change
      lastStep = step;
      const failed = step >= FAILED;
      const cur = !failed && step > 0 ? DONATE_SCRIPT[step - 1] : undefined;
      const busy = cur !== undefined;
      const pct = failed ? 99.7 : (cur?.pct ?? 0);

      // aria-disabled (not disabled) keeps keyboard focus on the button while it "uploads".
      btn.setAttribute('aria-disabled', String(busy));
      setBtn(
        failed
          ? 'Try again (it will not work)'
          : busy
            ? `Uploading… ${Math.floor(DONATE_SCRIPT[step - 2]?.pct ?? 0)}%`
            : 'Donate my idle RAM to the cloud',
      );
      setMsg(
        failed
          ? 'Upload failed at 99.7%. Your memory remains yours. Sorry, Sam.'
          : busy
            ? `${cur.msg}…`
            : 'One click. Zero exabytes.',
      );
      setStats(
        busy
          ? `${((pct / 100) * PAYLOAD_GB).toFixed(1)} / ${PAYLOAD_GB} GB · ETA ${cur.eta ?? mmss(remainingFrom(step))}`
          : failed
            ? `${((99.7 / 100) * PAYLOAD_GB).toFixed(2)} / ${PAYLOAD_GB} GB · rolled back`
            : '',
      );

      // Creep to this step's target over the step's duration (stalls read as stalls).
      bar.style.transitionDuration = busy ? `${cur.ms}ms` : '0.4s';
      bar.style.transitionTimingFunction = busy ? 'linear' : '';
      bar.style.width = `${step === 0 ? 0 : pct}%`;
      bar.classList.toggle('fail', failed);
      renderLog(step);
    },
  };
}
