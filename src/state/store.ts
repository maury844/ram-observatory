export type Listener<T> = (state: Readonly<T>, prev: Readonly<T>) => void;

export interface Store<T extends object> {
  get(): Readonly<T>;
  /** Shallow-merge a patch (or the result of an updater). No-op if nothing changed. */
  set(patch: Partial<T> | ((s: Readonly<T>) => Partial<T>)): void;
  /** Returns an unsubscribe function. */
  subscribe(listener: Listener<T>): () => void;
}

/** Minimal observable store: shallow merge, synchronous notify, change detection by ===. */
export function createStore<T extends object>(initial: T): Store<T> {
  let state: Readonly<T> = Object.freeze({ ...initial });
  const listeners = new Set<Listener<T>>();
  return {
    get: () => state,
    set(patch) {
      const p = typeof patch === 'function' ? patch(state) : patch;
      const changed = (Object.keys(p) as (keyof T)[]).some((k) => !Object.is(p[k], state[k]));
      if (!changed) return;
      const prev = state;
      state = Object.freeze({ ...state, ...p });
      for (const l of [...listeners]) l(state, prev);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
