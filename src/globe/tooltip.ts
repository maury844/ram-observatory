import { DEVICE_KEYS, DEVICES, type DeviceFlags } from '../model/devices';
import type { CountryResult } from '../model/compute';
import { idleColor } from '../model/color';
import { fixed, hhmm, toEB } from '../model/format';

interface Row {
  row: HTMLElement;
  k: HTMLElement;
  v: HTMLElement;
}

function makeRow(parent: HTMLElement): Row {
  const row = document.createElement('div');
  row.className = 'globe-tip__row';
  const k = document.createElement('span');
  k.className = 'globe-tip__k';
  const v = document.createElement('span');
  v.className = 'globe-tip__v';
  row.append(k, v);
  parent.append(row);
  return { row, k, v };
}

/**
 * Country tooltip in the design's style. Built once with text nodes (no innerHTML),
 * updated in place; only touches the DOM when a string actually changes.
 */
export class GlobeTooltip {
  private readonly name: HTMLElement;
  private readonly local: Row;
  private readonly installed: Row;
  private readonly idle: Row;
  private readonly devRows: Row[];
  private last = '';

  constructor(readonly el: HTMLElement) {
    el.classList.add('globe-tip', 'mono');
    el.hidden = true;
    this.name = document.createElement('div');
    this.name.className = 'globe-tip__name';
    el.append(this.name);
    this.local = makeRow(el);
    this.installed = makeRow(el);
    this.idle = makeRow(el);
    this.idle.v.classList.add('globe-tip__v--hot');
    this.devRows = DEVICE_KEYS.map(() => makeRow(el));
    for (const r of this.devRows) r.row.classList.add('globe-tip__row--dev');
  }

  update(p: CountryResult, enabled: DeviceFlags, compact: boolean): void {
    const f = p.total > 0 ? p.idle / p.total : 0;
    const on = DEVICE_KEYS.filter((k) => enabled[k]);
    const showDevices = on.length > 1;
    const devText = showDevices
      ? on.map((k) => {
          const d = p.dev[k];
          return `${fixed(toEB(d.total), 2)} EB · ${fixed(d.total ? (100 * d.idle) / d.total : 0, 1)}%`;
        })
      : [];
    const sig = [
      p.country.name,
      compact,
      hhmm(p.localHour),
      fixed(toEB(p.total), 2),
      fixed(100 * f, 1),
      on.join(),
      ...devText,
    ].join('|');
    if (sig === this.last) return;
    this.last = sig;

    this.name.textContent = p.country.name;
    this.local.k.textContent = compact ? 'local' : 'local time';
    this.local.v.textContent = hhmm(p.localHour);
    this.installed.k.textContent = compact ? 'installed' : 'installed RAM';
    this.installed.v.textContent = `${fixed(toEB(p.total), 2)} EB`;
    this.idle.k.textContent = compact ? 'idle' : 'idle now';
    this.idle.v.textContent = `${fixed(100 * f, 1)}%`;
    this.idle.v.style.color = idleColor(f);
    this.devRows.forEach((r, i) => {
      const k = on[i];
      r.row.hidden = !showDevices || !k;
      if (showDevices && k) {
        r.k.textContent = DEVICES[k].name;
        r.v.textContent = devText[i] ?? '';
      }
    });
  }
}
