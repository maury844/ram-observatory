import { describe, expect, it, vi } from 'vitest';
import { actions, createAppStore } from '../src/state/app-state';
import { Smoother } from '../src/state/smoother';
import { createStore } from '../src/state/store';

describe('store', () => {
  it('notifies on change only, and unsubscribes', () => {
    const s = createStore({ a: 1, b: 'x' });
    const fn = vi.fn();
    const off = s.subscribe(fn);
    s.set({ a: 1 });
    expect(fn).not.toHaveBeenCalled();
    s.set({ a: 2 });
    expect(fn).toHaveBeenCalledWith({ a: 2, b: 'x' }, { a: 1, b: 'x' });
    off();
    s.set({ a: 3 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('PCs cannot be toggled off; scrub is clamped to ±12 h', () => {
    const s = createAppStore(false);
    actions.toggleDevice(s, 'pc');
    expect(s.get().enabled.pc).toBe(true);
    actions.toggleDevice(s, 'phone');
    expect(s.get().enabled.phone).toBe(true);
    actions.scrub(s, 9999);
    expect(s.get().offsetMin).toBe(720);
  });

  it('reduced motion starts with the globe paused', () => {
    expect(createAppStore(true).get().spinning).toBe(false);
    expect(createAppStore(false).get().spinning).toBe(true);
  });
});

describe('smoother', () => {
  it('snaps on first target, then eases monotonically toward the next', () => {
    const sm = new Smoother(600);
    sm.setTarget('x', 10);
    expect(sm.get('x')).toBe(10);
    sm.setTarget('x', 20);
    sm.step(16);
    const a = sm.get('x')!;
    expect(a).toBeGreaterThan(10);
    expect(a).toBeLessThan(20);
    for (let i = 0; i < 1000; i++) sm.step(16);
    expect(sm.get('x')).toBe(20);
    expect(sm.step(16)).toBe(false);
  });

  it('clamps huge dt so a background tab does not overshoot', () => {
    const sm = new Smoother(600);
    sm.setTarget('x', 0);
    sm.setTarget('x', 1);
    sm.step(60_000);
    expect(sm.get('x')!).toBeLessThan(1);
  });
});

describe('donate script', async () => {
  const { DONATE_SCRIPT } = await import('../src/ui/donate');
  it('only ever moves forward and stops short of 100%', () => {
    const pcts = DONATE_SCRIPT.map((s) => s.pct);
    pcts.forEach((p, i) => expect(p).toBeGreaterThan(i === 0 ? 0 : (pcts[i - 1] ?? 0)));
    expect(pcts.at(-1)).toBeLessThan(100);
  });
  it('takes long enough to feel real but not forever (20–35 s)', () => {
    const total = DONATE_SCRIPT.reduce((s, x) => s + x.ms, 0);
    expect(total).toBeGreaterThanOrEqual(20_000);
    expect(total).toBeLessThanOrEqual(35_000);
  });
});

describe('Smoother.target', () => {
  it('reports the destination immediately while the value is still animating', () => {
    const s = new Smoother(600);
    s.setTarget('x', 0);
    s.setTarget('x', 100);
    s.step(16);
    expect(s.get('x')).toBeLessThan(100);
    expect(s.target('x')).toBe(100);
  });
});
