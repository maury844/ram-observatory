import { fixed } from '../model/format';
import { h, ref, scaleSetter, textSetter } from './dom';

interface RegionRow {
  el: HTMLElement;
  setPct: (s: string) => void;
  setBar: (f: number) => void;
  order: number;
}

/** Bars show the 70–100% window so small differences are visible (same as the prototype). */
export const REGION_WINDOW = { lo: 70, hi: 100 } as const;

export function createRegions() {
  const host = ref('regions');
  const rows = new Map<string, RegionRow>();

  const ensure = (name: string): RegionRow => {
    let r = rows.get(name);
    if (!r) {
      const el = h('div', 'region');
      const label = h('div', 'region__name', name);
      label.title = name;
      const track = h('div', 'track');
      const fill = h('div', 'bar-fill region__fill');
      track.append(fill);
      const pct = h('div', 'region__pct mono', '—');
      el.append(label, track, pct);
      host.append(el);
      r = { el, setPct: textSetter(pct), setBar: scaleSetter(fill), order: -1 };
      rows.set(name, r);
    }
    return r;
  };

  return {
    /** values: region → idle % (smoothed). Sorted most-idle first via CSS order (no DOM moves). */
    render(values: readonly { name: string; pct: number }[]): void {
      const sorted = [...values].sort((a, b) => b.pct - a.pct);
      const seen = new Set<string>();
      sorted.forEach((v, i) => {
        const r = ensure(v.name);
        seen.add(v.name);
        r.el.hidden = false;
        if (r.order !== i) {
          r.order = i;
          r.el.style.order = String(i);
        }
        r.setPct(fixed(v.pct, 1));
        r.setBar((v.pct - REGION_WINDOW.lo) / (REGION_WINDOW.hi - REGION_WINDOW.lo));
      });
      for (const [name, r] of rows) if (!seen.has(name)) r.el.hidden = true;
    },
  };
}
