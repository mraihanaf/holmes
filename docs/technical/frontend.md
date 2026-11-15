# Frontend

The frontend is a browser SPA with a terminal-style HUD. It follows the Osiris client stack and visual system, with three deliberate changes: Vite instead of Next.js, larger type for legibility, and analysis panels instead of OSINT layers.

## 1. Stack

| Concern | Choice | Notes |
|---|---|---|
| Build | Vite (Nx project `web`) | Static SPA; no SSR |
| Framework | React 19 + TypeScript | |
| Styling | Tailwind CSS 4 + CSS variables | Osiris tokens |
| Backend client | `convex/react` | Queries, mutations, actions |
| Map | MapLibre GL + react-map-gl | Point/bbox selection |
| Charts | uPlot (preferred) or lightweight-charts | Time series, trend line, CI band |
| Motion | framer-motion | HUD transitions; respect reduced motion |
| Icons | lucide-react | |
| Tests | Vitest + Playwright | Unit and demo-flow tests |

Do not use Next.js. Osiris uses it for API routes and SSR; Convex replaces the API routes and the SPA has no SEO requirement.

## 2. Osiris HUD adaptation

Start from the Osiris `TERMINAL` preset:

```css
--bg-void: #000a06;
--bg-primary: #001410;
--bg-secondary: #00201a;
--bg-tertiary: #002d24;
--accent: #00ff9c;
--accent-dim: #00b36b;
--text-primary: #c8ffe4;
--text-secondary: #5fbf95;
--text-muted: #2e6b52;
--text-heading: #7dffc4;
--font-hud: "JetBrains Mono", "Courier New", monospace;
--font-body: "Inter", system-ui, sans-serif;
```

Use gold `#D4AF37` and cyan `#00E5FF` sparingly for secondary status and data-source accents. The terminal green is the primary identity.

For the globe, atmosphere, camera choreography, terrain, custom WebGL layers, and the full HUD composition, see `osiris-globe-and-hud.md`.

### Panels

Borrow Osiris’s glass panel, but keep it subtle:

```css
.glass-panel {
  background: rgba(0, 20, 16, 0.88);
  backdrop-filter: blur(20px) saturate(1.2);
  border: 1px solid rgba(0, 255, 156, 0.16);
  border-radius: 12px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
}
```

### HUD text

```css
.hud-label {
  font-family: var(--font-hud);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.hud-value {
  font-family: var(--font-hud);
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
```

Osiris uses 7px labels. Do not copy that. The judges must read the verdict and axes from a projector.

### Motion

- Subtle panel fade/slide on load.
- Status-line pulse for live jobs.
- A single scanline accent is allowed; no constant CRT flicker.
- Respect `prefers-reduced-motion`.

## 3. Layout

Desktop:

```text
┌────────────────────────────────────────────────────────────────────┐
│ COMMAND  /detect jakarta T2M 2000 2025        MODE: CACHED  [SHARE]│
├───────────────┬──────────────────────────────────┬─────────────────┤
│ VARIABLES     │ MAP / CHART                      │ EVIDENCE        │
│               │                                  │                 │
│ T2M   +0.21   │  monthly series + trend line     │ source          │
│ PRECIP +0.80  │  confidence band                 │ dataset version │
│ AOD   +0.04   │                                  │ retrieval date  │
│ SOIL  ...     │  [RAW] [DESEASONALIZED] [ANNUAL] │ citation        │
│               │                                  │ quality flags   │
├───────────────┴──────────────────────────────────┴─────────────────┤
│ VERDICT  Temperature increased 0.21 °C/decade · p < 0.001 · n=312  │
├────────────────────────────────────────────────────────────────────┤
│ STATUS  cache hit · 312 months · stats 1.0.0 · NASA POWER · 12:04Z │
└────────────────────────────────────────────────────────────────────┘
```

Mobile: the map/chart fills the screen; variables, evidence, and analyst panels become bottom drawers.

## 4. Components

| Component | Responsibility |
|---|---|
| `CommandBar` | Prompt input, autocomplete, run command, share |
| `StatusLine` | Cache/live mode, source, job progress, method version, clock |
| `VariableRail` | Catalog grouped by category; signal-to-noise badge after a scan |
| `RegionPicker` | Preset places, coordinate input, map point/bbox |
| `SeriesChart` | Raw monthly points, rolling mean, trend line, CI band, gaps |
| `VerdictPanel` | Direction, slope, p-value, n, test, caveats |
| `EvidencePanel` | Source, dataset version, retrieval time, citation, license |
| `AnalystPanel` | Agent thread, streaming text, tool-call cards, approval button |
| `JobTicker` | Active jobs with stage and progress |
| `MethodsDrawer` | Method explanation, assumptions, limitations |
| `ShareCase` | Copy URL, export JSON, copy citation |
| `MobileDrawer` | Bottom-sheet wrapper for the rails on small screens |

## 5. State

- **URL is the source of truth** for the view:

  ```text
  /?v=T2M&place=jakarta&from=2000&to=2025&agg=monthly&seasonal=deseasonalized&case=jakarta-temperature
  ```

- Convex subscriptions provide server state:

  ```ts
  const analysis = useQuery(api.analyses.get, { cacheKey });
  const job = useQuery(api.jobs.get, jobId ? { jobId } : "skip");
  ```

- Local state: command input, open panels, hovered point, selected variable.
- No Redux or Zustand unless a measured need appears.
- Do not store analyses in localStorage; the cache lives in Convex.
- Do store the last command and UI preferences in localStorage if useful.

## 6. Command grammar

The command bar is the terminal identity. It should accept both commands and natural place/variable names.

```text
detect <place> <variable> [start] [end]
scan <place> [start] [end]
case <slug>
compare <place-a> <place-b> <variable>
share
methods
sources
help
```

Examples:

```text
detect jakarta T2M 2000 2025
scan jakarta 2000 2025
case wisconsin-aod
compare jakarta surabaya PRECTOTCORR
```

Behavior:

- Autocomplete variables from `catalog.listVariables`.
- Autocomplete places from presets and the geocoder.
- `Enter` runs; `Shift+Enter` opens in a new case; `Esc` closes.
- `/` focuses the command bar from anywhere.
- `?` opens the help overlay.
- Unknown commands show a short usage line, not a stack trace.

The command bar is a UX layer over the same URL state and Convex queries. It is not a shell and must not execute arbitrary code.

## 7. Chart requirements

- X axis: time, labeled with years.
- Y axis: variable units, with a clear label.
- Raw monthly points as a thin line or dots.
- 12-month rolling mean as a thicker line.
- Fitted trend line with a 95% confidence band.
- Missing values are gaps, not zero.
- Tooltip: date, value, unit, QC flag, source.
- Toggle: `RAW` / `DESEASONALIZED` / `ANNUAL`.
- Show `n`, period, and method near the chart.
- If `status = insufficient_data`, show the series but replace the trend line with an explanation.
- Do not hide the data behind the verdict. The chart is the evidence.

## 8. Loading, empty, and error states

- **Loading:** skeleton chart with `FETCHING SERIES` and the job stage.
- **Empty:** `No data for this variable and place. Try another variable or period.`
- **Insufficient data:** show the available series and a clear minimum-length explanation.
- **Source error:** `NASA POWER is unavailable. Showing cached data from 2026-11-14.` with a retry button.
- **Stats error:** show the series; `Trend test unavailable` with retry.
- **Agent error:** deterministic analysis remains; `Analyst unavailable` in the panel.
- Never show a blank panel without a reason.

## 9. Accessibility and legibility

- Body text at least 13px; HUD labels at least 10px; chart labels at least 11px.
- Contrast ratio at least 4.5:1 for body text.
- Keyboard navigation for the command bar, variable rail, and panels.
- Visible focus rings, not just color changes.
- `aria-live` for job status and verdict changes.
- `prefers-reduced-motion` disables scanlines and large transitions.
- Do not use color alone to encode significant/non-significant; use text and shape too.

## 10. Demo polish

- Default route shows a curated case immediately; no empty dashboard.
- A `CASES` strip is visible without opening a menu.
- The cache/live badge is always visible.
- Share URL works in a logged-out incognito window.
- The 30-second demo path: open Jakarta case → show chart → toggle deseasonalized → point at verdict → run agent → show verified brief.
- Record the video in `DEMO_MODE=cached`.

## 11. Acceptance criteria

- First meaningful content in under 2 seconds on a warm deploy.
- Cached case chart renders in under 1 second.
- The app works at 1280×720 and on a phone-width viewport.
- No text is smaller than 10px.
- A share URL restores the same variable, place, period, and view mode.
- The command bar and all panels are keyboard reachable.
- The terminal aesthetic is visible but does not reduce readability.
