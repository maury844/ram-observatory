/** Find a required element by data-ref; fails loudly if the HTML and code drift apart. */
export function ref<T extends HTMLElement = HTMLElement>(
  name: string,
  root: ParentNode = document,
): T {
  const el = root.querySelector<T>(`[data-ref="${name}"]`);
  if (!el) throw new Error(`Missing [data-ref="${name}"]`);
  return el;
}

/** All elements with data-bind=name (a value can appear in several places). */
export function binds(name: string, root: ParentNode = document): HTMLElement[] {
  const els = [...root.querySelectorAll<HTMLElement>(`[data-bind="${name}"]`)];
  if (els.length === 0) throw new Error(`Missing [data-bind="${name}"]`);
  return els;
}

/** Memoized textContent setter: skips the DOM write when the string hasn't changed. */
export function textSetter(els: HTMLElement | HTMLElement[]): (s: string) => void {
  const list = Array.isArray(els) ? els : [els];
  let last: string | null = null;
  return (s) => {
    if (s === last) return;
    last = s;
    for (const el of list) el.textContent = s;
  };
}

/** Memoized horizontal fill (0..1) via transform — no layout per frame. */
export function scaleSetter(el: HTMLElement): (frac: number) => void {
  let last = -1;
  return (frac) => {
    const f = Math.round(Math.max(0, Math.min(1, frac)) * 10_000) / 10_000;
    if (f === last) return;
    last = f;
    el.style.transform = `scaleX(${f})`;
  };
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

export const media = (q: string): MediaQueryList => window.matchMedia(q);
export const COMPACT_QUERY = '(max-width: 699px)';
