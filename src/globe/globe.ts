import {
  geoCircle,
  geoDistance,
  geoGraticule10,
  geoOrthographic,
  geoPath,
  type GeoPermissibleObjects,
} from 'd3-geo';
import type { ComputeResult, CountryResult } from '../model/compute';
import type { DeviceFlags } from '../model/devices';
import { idleColor } from '../model/color';
import { antisolar, subsolar } from '../model/sun';
import { loadLand, type Land } from './land';
import { GLOBE } from './palette';
import { GlobeTooltip } from './tooltip';

export interface GlobeData {
  readonly result: ComputeResult;
  readonly date: Date;
  readonly enabled: DeviceFlags;
}

export interface GlobeOptions {
  /** Square container; the canvas fills it. */
  readonly stage: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly tip: HTMLElement;
  /** Ancestor with overflow:hidden — the tooltip is kept inside its visible box. */
  readonly clip: HTMLElement;
  /** Called when the user grabs the globe, so the app can stop auto-spin. */
  readonly onUserRotate: () => void;
  /** Compact (phone) layout: tooltip docks bottom-left, short labels. */
  readonly isCompact: () => boolean;
}

interface Dot {
  x: number;
  y: number;
  r: number;
  p: CountryResult;
}

const SPIN_DEG_PER_MS = 0.004; // prototype speed: 4°/s
const MAX_DPR = 2; // 3× backing stores on phones cost a lot of fill-rate for no visible gain
const GRATICULE = geoGraticule10();
const clampLat = (v: number) => Math.max(-80, Math.min(80, v));

/**
 * Live canvas orthographic globe: land, real solar terminator, sun marker, and one dot per
 * country sized by installed RAM and coloured by idle share. Drag/arrow keys to rotate,
 * hover (mouse) or tap (touch) for a tooltip.
 */
export class Globe {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly projection = geoOrthographic().clipAngle(90).precision(0.5);
  private readonly path;
  private readonly tooltip: GlobeTooltip;
  private land: Land | null = null;
  private data: GlobeData | null = null;
  private rotation: [number, number] = [-60, -15];
  private size = 0;
  private dpr = 1;
  private radius = 0;
  private dots: Dot[] = [];
  private spinning = false;
  private visible = true;
  private dirty = true;
  private hover: string | null = null;
  private pinned: string | null = null;
  private drag: {
    id: number;
    x: number;
    y: number;
    sx: number;
    sy: number;
    moved: boolean;
  } | null = null;
  private oceanFill: CanvasGradient | null = null;
  private haloFill: CanvasGradient | null = null;
  private readonly cleanups: (() => void)[] = [];

  constructor(private readonly opts: GlobeOptions) {
    const ctx = opts.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not available');
    this.ctx = ctx;
    this.path = geoPath(this.projection, ctx);
    this.tooltip = new GlobeTooltip(opts.tip);

    const ro = new ResizeObserver(() => this.resize());
    ro.observe(opts.stage);
    this.cleanups.push(() => ro.disconnect());

    // Don't burn frames spinning a globe that's scrolled off-screen.
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) this.visible = e.isIntersecting;
      if (this.visible) this.dirty = true;
    });
    io.observe(opts.stage);
    this.cleanups.push(() => io.disconnect());

    this.bindPointer();
    this.resize();
    loadLand()
      .then((land) => {
        this.land = land;
        this.dirty = true;
      })
      .catch((err: unknown) => console.error('Failed to load land outlines', err));
  }

  setData(data: GlobeData): void {
    this.data = data;
    this.dirty = true;
  }

  setSpinning(on: boolean): void {
    this.spinning = on;
  }

  /** Call once per animation frame. */
  frame(dtMs: number): void {
    if (Math.min(window.devicePixelRatio || 1, MAX_DPR) !== this.dpr) {
      this.resize(); // window moved to a screen with a different pixel ratio (or zoom changed)
    }
    if (this.spinning && !this.drag && this.visible) {
      this.rotation = [(this.rotation[0] + dtMs * SPIN_DEG_PER_MS) % 360, this.rotation[1]];
      this.dirty = true;
    }
    if (this.dirty && this.visible) this.draw();
  }

  destroy(): void {
    for (const c of this.cleanups) c();
  }

  private resize(): void {
    const s = Math.round(this.opts.stage.clientWidth);
    // Mid-layout the stage can briefly measure ~0 (e.g. while the hero grid reflows across a
    // breakpoint); a negative radius would throw in createRadialGradient.
    if (s < 40) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    if (s === this.size && dpr === this.dpr) return;
    this.size = s;
    this.dpr = dpr;
    const c = this.opts.canvas;
    c.width = Math.round(s * dpr);
    c.height = Math.round(s * dpr);
    this.radius = s / 2 - Math.max(6, s * 0.02);
    this.projection.translate([s / 2, s / 2]).scale(this.radius);
    const R = this.radius;
    const ocean = this.ctx.createRadialGradient(
      s / 2 - R * 0.3,
      s / 2 - R * 0.35,
      R * 0.1,
      s / 2,
      s / 2,
      R,
    );
    ocean.addColorStop(0, GLOBE.oceanHi);
    ocean.addColorStop(1, GLOBE.oceanLo);
    this.oceanFill = ocean;
    const halo = this.ctx.createRadialGradient(s / 2, s / 2, R * 0.92, s / 2, s / 2, R * 1.08);
    halo.addColorStop(0, GLOBE.halo);
    halo.addColorStop(1, 'rgba(245,165,36,0)');
    this.haloFill = halo;
    this.dirty = true;
    this.draw();
  }

  private center(): [number, number] {
    return [-this.rotation[0], -this.rotation[1]];
  }

  private draw(): void {
    this.dirty = false;
    const { ctx, size: s, radius: R } = this;
    if (s <= 0) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, s, s);
    this.projection.rotate(this.rotation);
    const cx = s / 2;
    const cy = s / 2;

    // halo + ocean
    if (this.haloFill) {
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.08, 0, 2 * Math.PI);
      ctx.fillStyle = this.haloFill;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.fillStyle = this.oceanFill ?? GLOBE.oceanLo;
    ctx.fill();

    ctx.beginPath();
    this.path(GRATICULE);
    ctx.strokeStyle = GLOBE.graticule;
    ctx.lineWidth = 0.6;
    ctx.stroke();

    if (this.land) {
      ctx.beginPath();
      this.path(this.land as GeoPermissibleObjects);
      ctx.fillStyle = GLOBE.land;
      ctx.fill();
      ctx.strokeStyle = GLOBE.landStroke;
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    const data = this.data;
    if (data) {
      // night hemisphere = 90° cap around the antisolar point
      const night = geoCircle().center(antisolar(data.date)).radius(90).precision(2)();
      ctx.beginPath();
      this.path(night);
      ctx.fillStyle = GLOBE.night;
      ctx.fill();
      ctx.strokeStyle = GLOBE.terminator;
      ctx.lineWidth = 1;
      ctx.stroke();

      const sun = subsolar(data.date);
      if (geoDistance(sun, this.center()) < Math.PI / 2) {
        const sp = this.projection(sun);
        if (sp) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(sp[0], sp[1], Math.max(4, R * 0.018), 0, 2 * Math.PI);
          ctx.fillStyle = GLOBE.sun;
          ctx.shadowColor = GLOBE.sun;
          ctx.shadowBlur = 14;
          ctx.fill();
          ctx.restore();
        }
      }
      this.drawDots(data);
    }

    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.strokeStyle = GLOBE.rim;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    this.syncTooltip();
  }

  private drawDots(data: GlobeData): void {
    const { ctx } = this;
    const per = data.result.perCountry;
    let maxGB = 0;
    for (const p of per) maxGB = Math.max(maxGB, p.total);
    const maxR = Math.max(12, 22 * (this.radius / 250));
    const center = this.center();
    const active = this.activeName();
    this.dots = [];
    let ring: Dot | null = null;
    for (const p of per) {
      if (p.total <= 0) continue;
      const ll: [number, number] = [p.country.lon, p.country.lat];
      if (geoDistance(ll, center) > Math.PI / 2 - 0.02) continue;
      const xy = this.projection(ll);
      if (!xy) continue;
      const r = Math.max(2.5, maxGB > 0 ? Math.sqrt(p.total / maxGB) * maxR : 0);
      const f = p.idle / p.total;
      ctx.beginPath();
      ctx.arc(xy[0], xy[1], r, 0, 2 * Math.PI);
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = idleColor(f);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = GLOBE.dotStroke;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      const dot = { x: xy[0], y: xy[1], r, p };
      this.dots.push(dot);
      if (p.country.name === active) ring = dot;
    }
    if (ring) {
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, Math.max(5, ring.r + 3), 0, 2 * Math.PI);
      ctx.strokeStyle = GLOBE.ring;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private activeName(): string | null {
    return this.hover ?? this.pinned;
  }

  private hitTest(clientX: number, clientY: number, coarse: boolean): Dot | null {
    const rect = this.opts.canvas.getBoundingClientRect();
    const scale = rect.width > 0 ? this.size / rect.width : 1;
    const mx = (clientX - rect.left) * scale;
    const my = (clientY - rect.top) * scale;
    const slop = coarse ? 14 : 8;
    let hit: Dot | null = null;
    for (const d of this.dots) {
      if (Math.hypot(d.x - mx, d.y - my) < Math.max(d.r, slop) + 2 && (!hit || d.r < hit.r))
        hit = d;
    }
    return hit;
  }

  private setHover(name: string | null): void {
    if (name === this.hover) return;
    this.hover = name;
    this.opts.canvas.style.cursor = name ? 'pointer' : '';
    this.dirty = true;
  }

  /** Position and fill the tooltip for the active country, or hide it. */
  private syncTooltip(): void {
    const name = this.activeName();
    const dot = name ? this.dots.find((d) => d.p.country.name === name) : undefined;
    const tip = this.opts.tip;
    if (!dot || !this.data) {
      if (!tip.hidden) tip.hidden = true;
      // A pinned country that rotated behind the globe stays pinned and reappears on return.
      return;
    }
    const compact = this.opts.isCompact();
    this.tooltip.update(dot.p, this.data.enabled, compact);
    tip.classList.toggle('is-docked', compact);
    if (tip.hidden) tip.hidden = false;
    if (compact) {
      tip.style.left = '';
      tip.style.top = '';
      return;
    }
    // Dot position in stage CSS px, then clamp into the part of the stage that is actually
    // visible (the globe bleeds off the hero's right edge, which clips it).
    const stageRect = this.opts.stage.getBoundingClientRect();
    const clipRect = this.opts.clip.getBoundingClientRect();
    const k = stageRect.width / (this.size || 1);
    const x = dot.x * k;
    const y = dot.y * k;
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const minX = Math.max(0, clipRect.left - stageRect.left) + 4;
    const maxX =
      Math.min(
        stageRect.width,
        clipRect.right - stageRect.left,
        window.innerWidth - stageRect.left,
      ) -
      tw -
      4;
    const minY = Math.max(0, clipRect.top - stageRect.top) + 4;
    const maxY = Math.min(stageRect.height, clipRect.bottom - stageRect.top) - th - 4;
    let left = x + dot.r * k + 14;
    if (left > maxX) left = x - dot.r * k - 14 - tw; // flip to the left of the dot
    left = Math.max(minX, Math.min(maxX, left));
    const top = Math.max(minY, Math.min(maxY, y - th / 2));
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
  }

  private rotateBy(dLon: number, dLat: number): void {
    this.rotation = [this.rotation[0] + dLon, clampLat(this.rotation[1] + dLat)];
    this.dirty = true;
  }

  private bindPointer(): void {
    const c = this.opts.canvas;
    const on = <K extends keyof HTMLElementEventMap>(
      type: K,
      fn: (e: HTMLElementEventMap[K]) => void,
    ) => {
      c.addEventListener(type, fn);
      this.cleanups.push(() => c.removeEventListener(type, fn));
    };

    on('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        sx: e.clientX,
        sy: e.clientY,
        moved: false,
      };
      // Mouse/pen capture immediately; touch keeps native vertical scrolling (touch-action: pan-y)
      // and only becomes a drag once it moves horizontally — the browser cancels it otherwise.
      if (e.pointerType !== 'touch') c.setPointerCapture(e.pointerId);
    });

    on('pointermove', (e) => {
      const d = this.drag;
      if (d && d.id === e.pointerId) {
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) {
          d.moved = true;
          if (e.pointerType === 'touch') c.setPointerCapture(e.pointerId);
          this.opts.onUserRotate();
        }
        if (d.moved) {
          d.x = e.clientX;
          d.y = e.clientY;
          const k = 87.5 / Math.max(80, this.radius); // ≈0.35°/px at R=250 (prototype feel)
          this.rotateBy(dx * k, -dy * k);
          this.setHover(null);
        }
        return;
      }
      if (e.pointerType === 'mouse') {
        this.setHover(this.hitTest(e.clientX, e.clientY, false)?.p.country.name ?? null);
      }
    });

    const end = (e: PointerEvent, cancelled: boolean) => {
      const d = this.drag;
      if (!d || d.id !== e.pointerId) return;
      this.drag = null;
      if (c.hasPointerCapture(e.pointerId)) c.releasePointerCapture(e.pointerId);
      if (cancelled || d.moved) return;
      // A tap/click without movement pins (or unpins) a country.
      const hit = this.hitTest(e.clientX, e.clientY, e.pointerType !== 'mouse');
      const name = hit?.p.country.name ?? null;
      this.pinned = name && name === this.pinned && e.pointerType !== 'mouse' ? null : name;
      this.dirty = true;
    };
    on('pointerup', (e) => end(e, false));
    on('pointercancel', (e) => end(e, true));
    on('pointerleave', (e) => {
      if (e.pointerType === 'mouse') this.setHover(null);
    });

    on('keydown', (e) => {
      const step = e.shiftKey ? 30 : 10;
      const map: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, step],
        ArrowDown: [0, -step],
      };
      const mv = map[e.key];
      if (mv) {
        e.preventDefault();
        this.opts.onUserRotate();
        this.rotateBy(mv[0], mv[1]);
      } else if (e.key === 'Escape' && this.pinned) {
        this.pinned = null;
        this.dirty = true;
      }
    });
  }
}
