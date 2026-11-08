import { DEVICE_KEYS, DEVICES, type DeviceFlags, type DeviceKey } from '../model/devices';
import { fixed } from '../model/format';
import { actions, type AppStore } from '../state/app-state';
import { h, ref, textSetter } from './dom';

interface RowRefs {
  row: HTMLElement;
  sw: HTMLButtonElement;
  setIdle: (s: string) => void;
  setPct: (s: string) => void;
}

export function createDevices(store: AppStore) {
  const host = ref('devices');
  const rows = new Map<DeviceKey, RowRefs>();

  for (const k of DEVICE_KEYS) {
    const d = DEVICES[k];
    const row = h('div', 'devrow');
    const sw = h('button', 'sw');
    sw.type = 'button';
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-label', d.name);
    sw.append(h('b'));
    sw.firstElementChild?.append(h('i'));
    if (d.locked) {
      sw.setAttribute('aria-disabled', 'true');
      sw.title = 'PCs are the whole point';
    } else {
      sw.addEventListener('click', () => actions.toggleDevice(store, k));
    }

    const text = h('div', 'devrow__text');
    text.append(h('div', 'devrow__name', d.name), h('div', 'devrow__meta mono', d.meta));

    const vals = h('div', 'devrow__vals mono');
    const idleLine = h('div', 'devrow__idle');
    const idleNum = h('span', '', '—');
    idleLine.append(idleNum, ' ', h('span', 'devrow__unit', 'EB'));
    const pctLine = h('div', 'devrow__pct');
    const pctNum = h('span', '', '—');
    pctLine.append(pctNum, '% idle');
    vals.append(idleLine, pctLine);

    row.append(sw, text, vals);
    host.append(row);
    rows.set(k, { row, sw, setIdle: textSetter(idleNum), setPct: textSetter(pctNum) });
  }

  return {
    renderFlags(enabled: DeviceFlags): void {
      for (const [k, r] of rows) {
        const on = enabled[k];
        r.sw.setAttribute('aria-checked', String(on));
        r.row.classList.toggle('off', !on);
      }
    },
    renderValues(get: (key: string) => number | undefined): void {
      for (const [k, r] of rows) {
        r.setIdle(fixed(get(`d_${k}_idle`), 2));
        r.setPct(fixed(get(`d_${k}_pct`), 1));
      }
    },
  };
}
