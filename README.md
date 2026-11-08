# Global Idle RAM Observatory

A live, satirical dashboard that estimates how much **consumer DRAM on Earth is doing nothing right now**, and shows it on a 3D globe with the real day/night terminator. A bobblehead "Chief RAM Officer" gets angrier as the idle share climbs, and sleeps through San Francisco's night.

> **Satire.** This page riffs on remarks by OpenAI's CEO that consumer RAM is a "quite terrible" use of the world's DRAM because it sits idle ~95% of the time ([The Verge][verge], [TweakTown][tweaktown]). The numbers come from a back-of-the-envelope Fermi model built on public figures and labeled guesses. They are not measurements. The project isn't affiliated with OpenAI or anyone else. Your RAM is fine. It's allowed to rest.

UI: _Refined Direction C · Broadcast_ (PCB-2026-11 · rev C).

---

## Quick start

Requires **Node 22** (see `.nvmrc`). All scripts are plain npm scripts and work the same on Windows, macOS and Linux.

```sh
npm ci            # install exact versions from package-lock.json
npm run dev       # dev server with HMR → http://localhost:5173
npm run build     # typecheck (tsc --noEmit) + production build → dist/
npm run preview   # serve dist/ locally → http://localhost:4173
npm test          # Vitest unit tests for the model and state
npm run lint      # ESLint + Prettier check
npm run format    # Prettier write
npm run images -- <dir>   # re-process bobblehead images (see below)
```

### Deploying

`dist/` is a fully static site built with `base: './'`, so every URL in it is relative. Copy it to any static host or sub-path: GitHub Pages (project or user site), Netlify, S3, a file share. It makes no server calls and no third-party requests. Fonts are self-hosted and the land outlines are bundled.

For GitHub Pages, either push `dist/` to a `gh-pages` branch, or add a Pages workflow that runs `npm ci && npm run build` and uploads `dist/`.

---

## Project structure

```
ram-observatory/
├─ index.html                 # semantic page shell (all static copy lives here)
├─ public/favicon.svg
├─ scripts/
│  └─ process-bobbleheads.mjs # sharp: trim transparent margins → WebP
├─ src/
│  ├─ main.ts                 # entry: fonts + styles + startApp()
│  ├─ app.ts                  # wiring: store → model → smoother → views, rAF + 1 s tick
│  ├─ model/                  # pure, DOM-free, unit-tested
│  │  ├─ countries.ts         # ~80-country table (pop, UTC offset, per-capita tiers, region)
│  │  ├─ devices.ts           # PCs / phones / consoles: base, GB, capacity, 24 h occupancy
│  │  ├─ model.ts             # rescale tiers to installed base; precompute GB per country
│  │  ├─ compute.ts           # idle/total by device, region, country at a given instant
│  │  ├─ envelope.ts          # daily min/max idle fraction (+ SF-night range), memoized
│  │  ├─ time.ts              # UTC hours, DST-aware San Francisco clock, SF-night test
│  │  ├─ sun.ts               # subsolar / antisolar point
│  │  ├─ mood.ts              # anger fraction + mood bands, copy, animation choice
│  │  ├─ color.ts             # idle colour ramp (#6A4B1C → #F5A524 → #FF7A1A → #FF4D4D)
│  │  └─ format.ts            # EB, hh:mm, scrub label, "pts short of the claim"
│  ├─ state/
│  │  ├─ store.ts             # ~30-line observable store (get/set/subscribe)
│  │  ├─ app-state.ts         # AppState, actions (toggle, scrub, live, spin)
│  │  └─ smoother.ts          # frame-rate-independent exponential easing of numbers
│  ├─ globe/
│  │  ├─ globe.ts             # canvas orthographic globe, drag/keys/hover/tap
│  │  ├─ tooltip.ts           # country tooltip (text nodes, no innerHTML)
│  │  ├─ land.ts              # lazy world-atlas land-110m → GeoJSON
│  │  └─ palette.ts           # globe colours
│  ├─ ui/                     # one module per panel; each memoizes its DOM writes
│  │  ├─ header.ts  hero.ts  scrubber.ts  devices.ts  mood.ts  regions.ts  donate.ts
│  │  └─ dom.ts               # ref()/binds()/textSetter()/scaleSetter() helpers
│  ├─ styles/                 # tokens, base, layout, components, hero, globe, motion
│  └─ assets/
│     ├─ bobblehead/{calm,concerned,furious,sleep,nightmare}.webp
│     └─ pcb-trace.svg        # faint seamless board texture (480 px tile)
└─ tests/
   ├─ model.test.ts           # rescaling, [0,1] bounds, envelope, DST, sun, moods, format
   └─ state.test.ts           # store, actions, smoother
```

Data flow: user actions update the **store**. A store change or the 1-second tick calls `recompute()`, which runs `compute()` for the simulated time and feeds the **Smoother**'s targets and the globe. A single `requestAnimationFrame` loop then eases the displayed numbers (τ = 600 ms) and spins/redraws the globe. Views only write to the DOM when a formatted string actually changes.

---

## How the model works

For every country _c_, device type _d_ and the current instant:

```
installed GB(c,d) = population(c) × perCapita(c,d) × scale(d) × GB per device(d)
idle GB(c,d)      = installed × (1 − occupancy_d(local hour of c) × capacity-in-use_d)
```

- **Rescaling.** The per-capita columns are hand-coded penetration tiers, not counts. `scale(d)` is chosen so the world sum equals the declared installed base exactly (unit-tested).
- **Local time** uses each country's **standard** UTC offset (no DST), one point per country. Occupancy curves are 24 hourly values with smoothstep interpolation.
- **Idle share** = Σ idle / Σ installed over the enabled devices. PCs are always on. Smartphones and consoles are toggles, off by default.
- **Terribleness (anger)** = where the current idle share sits between today's minimum and maximum (sampled every 10 min over the UTC day). While it's night in San Francisco (23:00–06:00 `America/Los_Angeles`, DST-aware), the range is restricted to the SF-night samples. Moods: awake calm < 0.40 ≤ concerned < 0.75 ≤ furious; asleep sleep < 0.50 ≤ nightmare.
- **Night shading** is the real solar terminator: a 90° cap around the antisolar point, computed from the equation of time and solar declination (good to ~1°).

### Assumptions

| Input                       | Value used                        | Basis / source                                                                                                                                    |
| --------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| The remarks being satirised | "quite terrible", ~5% utilisation | [The Verge][verge], [TweakTown][tweaktown]                                                                                                        |
| PC installed base           | 1.5 B                             | ~280 M shipped/yr × ~5.5-yr life. Shipments: IDC/Omdia via [Tom's Hardware][toms]; [Counterpoint Q1 2026][cp-pc]                                  |
| RAM per PC (installed base) | 10.5 GB                           | TrendForce average notebook DRAM 10.5 GB (2023) → 12.6 GB (2025), via [TechPowerUp][tpu]; installed base is older                                 |
| PC active use               | ≈ 6.7 h/day                       | Hourly curve peaking ~47% at 10:00 and 15:00 local, ~2% at 03:00 (estimate)                                                                       |
| PC RAM in use when active   | 55%                               | Guess: browser + chat + music on a 16 GB machine                                                                                                  |
| Smartphones                 | 6.5 B × 5.5 GB                    | Average shipped smartphone DRAM hit 8.4 GB in 2025 ([Counterpoint][cp-phone]); the installed base is older. ~4.8 h/day; 60% "working" when active |
| Consoles                    | 300 M × 12 GB                     | Guess from active-user disclosures; evening-heavy, ~2.2 h/day; 90% used while gaming                                                              |
| Penetration tiers           | hand-coded                        | PCs/capita ~0.75 NA/W-EU/JP/KR, ~0.3 CN/LatAm, ~0.08 IN, ~0.05 SSA; rescaled to the bases above                                                   |
| Coastlines                  | 1:110m land                       | [Natural Earth][ne] (public domain) via [world-atlas][wa]                                                                                         |

"Idle" means not actively serving a human right now. Powered off, asleep, in a pocket, or cached by an app nobody is looking at all count, which is exactly the kind of accounting that makes 95% sound like a scandal.

To change a number, edit `src/model/devices.ts` or `src/model/countries.ts`, then update the methodology table in `index.html` and the table above. The tests will tell you if rescaling or bounds broke.

---

## Swapping the bobblehead images

The five moods map to five files in `src/assets/bobblehead/`: `calm`, `concerned`, `furious`, `sleep`, `nightmare` (`.webp`).

1. Put your new images in any folder, named `calm.png`, `concerned.png`, `furious.png`, `sleep.png`, `nightmare.png`. Transparent PNG or WebP works best. JPG works but won't trim.
2. Run `npm run images -- path/to/folder`. The script trims transparent margins, downsizes to at most 560 px tall (it never upscales), and writes optimized WebP files over the existing ones. Add `--height 720` for taller sources.
3. `npm run build`. Vite fingerprints the files, so caches bust automatically.

The panel shows a **bust crop**: the full figure is rendered 360 px tall and pinned 6 px from the top of a 170 px window (120×150 on phones), with a bottom fade. That framing assumes a bobblehead-proportioned figure whose head fills roughly the top 40% of the trimmed image. If your art is framed differently, adjust `.bust { top; height }` in `src/styles/components.css`. Animations: wobble (calm/concerned), fast shake (furious), slow breathe (asleep/nightmare). All three are disabled under `prefers-reduced-motion`.

---

## Accessibility & motion

- Every control is a real `<button>`/`<input>` with a ≥ 44 px hit target. Device toggles are `role="switch"` with `aria-checked`. The locked PC toggle uses `aria-disabled` so it stays focusable and explains itself.
- The scrubber exposes `aria-valuetext` ("+3h 05m from now"). The idle bar is a `role="meter"`. Mood changes and donate progress are announced politely.
- The globe canvas is focusable: arrow keys rotate it (Shift for bigger steps) and Esc clears a pinned country. On touch, vertical swipes still scroll the page.
- `prefers-reduced-motion: reduce` turns off globe auto-spin (you can still press _Spin_), number easing (values snap), bobblehead animation and the live-dot pulse.

---

## Licensing

- **Code:** MIT. See [LICENSE](LICENSE).
- **Bobblehead images** (`src/assets/bobblehead/`): the author's own assets, **not** covered by the MIT license. They caricature a real public figure for satire. If you fork this project, replace them with your own.
- **Natural Earth** data is public domain (via `world-atlas`, ISC). **Space Grotesk** and **JetBrains Mono** are SIL OFL 1.1 (via Fontsource).

[verge]: https://www.theverge.com/ai-artificial-intelligence/1023820/sam-altman-ram-shortage-cloud-servers
[tweaktown]: https://www.tweaktown.com/news/114419/sam-altman-says-your-pcs-ram-is-a-quite-terrible-use-of-the-worlds-limited-dram-supply/index.html
[cp-phone]: https://counterpointresearch.com/de/insights/Global-Smartphone-Average-DRAM-Hits-Record-8.4GB-in-2025
[tpu]: https://techpowerup.com/forums/threads/323872
[toms]: https://www.tomshardware.com/desktops/gaming-pcs/idc-slashes-2026-pc-shipment-forecast-amid-memory-shortages-total-pc-market-value-to-nonetheless-increase-to-usd274-billion-due-to-ongoing-price-hikes
[cp-pc]: https://counterpointresearch.com/cn/insights/global-pc-shipments-q1-2026
[ne]: https://www.naturalearthdata.com/
[wa]: https://github.com/topojson/world-atlas
