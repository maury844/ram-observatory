import { DEFAULT_FLAGS, DEVICES, type DeviceFlags, type DeviceKey } from '../model/devices';
import { createStore, type Store } from './store';

export const SCRUB_RANGE_MIN = 720; // ±12 h
export const SCRUB_STEP_MIN = 5;

export interface AppState {
  readonly enabled: DeviceFlags;
  /** Minutes the simulated clock is offset from real time (scrubber). */
  readonly offsetMin: number;
  readonly spinning: boolean;
  /** Donate gag: 0 idle, 1–5 uploading, 6 failed. */
  readonly donateStep: number;
  readonly reducedMotion: boolean;
}

export type AppStore = Store<AppState>;

export function createAppStore(reducedMotion: boolean): AppStore {
  return createStore<AppState>({
    enabled: DEFAULT_FLAGS,
    offsetMin: 0,
    // Auto-spin is motion the user didn't ask for: off by default under reduced motion.
    spinning: !reducedMotion,
    donateStep: 0,
    reducedMotion,
  });
}

export const actions = {
  toggleDevice(store: AppStore, k: DeviceKey): void {
    if (DEVICES[k].locked) return;
    store.set((s) => ({ enabled: { ...s.enabled, [k]: !s.enabled[k] } }));
  },
  scrub(store: AppStore, offsetMin: number): void {
    const clamped = Math.max(-SCRUB_RANGE_MIN, Math.min(SCRUB_RANGE_MIN, Math.round(offsetMin)));
    store.set({ offsetMin: clamped });
  },
  goLive(store: AppStore): void {
    store.set({ offsetMin: 0 });
  },
  setSpinning(store: AppStore, spinning: boolean): void {
    store.set({ spinning });
  },
};

export const simTime = (s: AppState, nowMs: number = Date.now()): Date =>
  new Date(nowMs + s.offsetMin * 60_000);
