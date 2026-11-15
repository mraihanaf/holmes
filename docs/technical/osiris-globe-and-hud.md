# Osiris globe and HUD implementation guide

**Status:** reference guide, reverse-engineered 2026-11-14 from [`simplifaisoul/osiris`](https://github.com/simplifaisoul/osiris).
**Use:** build the visual layer of our Vite SPA. Osiris is a reference, not a dependency.
**License:** Osiris is MIT. If we copy code, keep its license notice.

This guide covers the parts we want: the 3D Earth globe, the dark atmosphere, the HUD frame, the splash/reveal, the map choreography, and the optional WebGL layers. It also records what *not* to copy.

## 1. Key finding: the globe is MapLibre, not Three.js

Osiris’s main 3D Earth is **MapLibre GL 6.7 with its adaptive globe projection**:

```ts
map.setProjection({ type: 'globe' });
```

MapLibre holds a true globe at overview zooms and transitions to a local flat projection as you zoom in. That gives us pan, zoom, tiles, markers, terrain, and globe curvature without building a custom Three.js sphere.

Three.js appears in Osiris only for specific 3D views (LiDAR field view, cutout scene, graph view), not the main globe. **Do not build a Three.js globe.** It would cost days and lose MapLibre’s interaction, tiles, and projection handling.

## 2. What Osiris composes

| Visual | Osiris implementation | Our use |
|---|---|---|
| **3D Earth** | MapLibre globe projection + CARTO Dark Matter style | Must ship |
| **Atmosphere** | `map.setSky` + fog + CSS vignette | Must ship |
| **Day/night** | GeoJSON solar-terminator polygon | High-impact, cheap |
| **3D terrain** | `raster-dem` + `setTerrain` at regional zoom | Optional |
| **3D buildings** | `fill-extrusion` from basemap building tiles | Optional |
| **Satellites at altitude** | Custom WebGL layer using `projectTileFor3D` | Optional |
| **Arcs and pulses** | Custom WebGL shaders with horizon culling | Optional |
| **Clouds / wind** | Custom WebGL layers | Not for MVP |
| **HUD** | React + Tailwind + framer-motion + CSS tokens | Must ship |
| **Splash** | React/framer-motion, waits for map `idle` | Must ship |
| **Camera controls** | Custom zoom/pan pad + keyboard | Must ship |

Reference files in Osiris:

| File | What it shows |
|---|---|
| `src/components/OsirisMap.tsx` | Map init, globe, sky, spin, terrain, buildings, custom layers |
| `src/lib/map-projection.ts` | Globe/mercator switch and terrain projection interpolation |
| `src/lib/map-terrain.ts` | Lazy terrain, fade-in, hysteresis, pixel-ratio cap |
| `src/lib/satellite-layer.ts` | Custom WebGL satellites at altitude |
| `src/lib/oi/globe.ts` | Custom WebGL arcs, pulses, shaders, horizon culling |
| `src/lib/live-clouds-layer.ts` | Custom WebGL cloud layer |
| `src/lib/wind-gl-layer.ts` | Custom WebGL wind streamlines |
| `src/app/page.tsx` | HUD layout, splash, rails, panels, reveal |
| `src/app/globals.css` | Tokens, glass panels, HUD text, overlays, animations |
| `src/components/GlobalStatusBar.tsx` | Bottom status ticker |
| `src/components/SearchBar.tsx` | Command/search overlay |
| `src/components/LayerPanel.tsx` | Dense left rail |
| `src/components/MapControls.tsx` | Hold-to-repeat camera pad |
| `src/components/TimeBox.tsx` | Docked control boxes |
| `src/components/StyleStudio.tsx` | Theme/palette customization |

## 3. Minimum globe implementation

Install:

```bash
pnpm add maplibre-gl
```

A minimal `GlobeMap.tsx` for our SPA:

```tsx
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export function GlobeMap({ onReady }: { onReady?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Open on the viewer's side of the planet. UTC offset is a cheap longitude stand-in.
    const facingLng = Math.max(-180, Math.min(180, -new Date().getTimezoneOffset() / 4));

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [facingLng, 20],
      zoom: 1.8,
      minZoom: 1.5,
      maxZoom: 18,
      maxPitch: 85,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    map.on("load", () => {
      map.resize();
      map.setProjection({ type: "globe" });
      map.setSky({
        "sky-color": "#04040A",
        "sky-horizon-blend": 0.5,
        "horizon-color": "#0a0a1a",
        "horizon-fog-blend": 0.3,
        "fog-color": "#04040A",
        "fog-ground-blend": 0.9,
      });
      if (map.getPitch() < 0.5) map.easeTo({ pitch: 20, duration: 1200 });
      map.once("idle", () => readyRef.current?.());
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0" />;
}
```

Important details from Osiris:

- MapLibre 6 requires **WebGL2**. Try a few context attribute fallbacks before failing. Osiris tries default, `low-power`, then `antialias: false`. A failed constructor leaves a canvas behind, so clear the container before retrying.
- Call `map.resize()` after the container has layout. A map created before its container has size starts at 400×300 and never recovers.
- The splash waits for `map.once('idle')`, not a fixed timer. `idle` means the tiles have drawn.
- `maxPitch: 85` allows a dramatic globe tilt; the HUD uses `20` as the resting pitch.
- On 2D/3D switch, only change pitch when arriving from the other mode; never re-tilt a camera the user has already placed.

## 4. Atmosphere, sky, and overlays

Osiris’s globe atmosphere is mostly three things:

1. **MapLibre sky/fog** with near-black colors and a soft horizon blend.
2. **CSS vignette** over the map.
3. **A very faint scanline layer** over the HUD.

```css
.vignette {
  background: radial-gradient(
    ellipse at center,
    transparent 40%,
    rgba(4, 4, 10, 0.6) 80%,
    rgba(4, 4, 10, 0.95) 100%
  );
}

.crt-scanlines {
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(255, 255, 255, 0.02) 3px,
    rgba(255, 255, 255, 0.02) 4px
  );
}
```

Use the scanlines at **0.02 opacity**, not as a visible CRT effect. The same applies to corner frames: a 1px gradient line in each corner, not a full border.

There is no post-processing bloom in Osiris. The glow comes from:

- CSS `drop-shadow` / `box-shadow` on HUD elements,
- additive blending in custom WebGL layers,
- bright marker cores with soft alpha edges.

Do not add a heavy bloom pass for the hackathon.

## 5. Day/night terminator

This is the cheapest high-impact globe feature. It is a GeoJSON polygon covering the dark side, added as a fill layer.

```ts
function solarTerminatorPolygon(now = new Date()) {
  const yearStart = Date.UTC(now.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - yearStart) / 86400000);
  const declination = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  const decRad = (declination * Math.PI) / 180;
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const subsolarLng = (12 - utcHours) * 15;

  const ring: [number, number][] = [];
  for (let lng = -180; lng <= 180; lng += 2) {
    const lngRad = ((lng - subsolarLng) * Math.PI) / 180;
    const lat = (Math.atan(-Math.cos(lngRad) / Math.tan(decRad)) * 180) / Math.PI;
    ring.push([lng, lat]);
  }

  const darkSide = declination >= 0 ? -90 : 90;
  ring.push([180, darkSide], [-180, darkSide], ring[0]);

  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [ring] },
  };
}
```

Add it after the basemap loads:

```ts
map.addSource("day-night", { type: "geojson", data: solarTerminatorPolygon() });
map.addLayer({
  id: "day-night-fill",
  type: "fill",
  source: "day-night",
  paint: { "fill-color": "#000022", "fill-opacity": 0.35 },
});
```

Refresh every 5 minutes:

```ts
setInterval(() => {
  const source = map.getSource("day-night") as maplibregl.GeoJSONSource;
  source.setData(solarTerminatorPolygon());
}, 5 * 60_000);
```

Osiris places this layer before most data layers so markers stay bright over the night side. Use a `beforeId` if you add it after other layers.

## 6. Camera choreography

### Opening view

- Center: viewer’s rough longitude, latitude `20`.
- Zoom: `1.8`, minimum `1.5`.
- Pitch: `20`, eased in over ~1.2s.
- The globe fills the screen; the HUD enters after the first `idle`.

### Demo spin

When no case is selected, spin slowly:

```ts
let raf = 0;
let last = performance.now();
const spin = (now: number) => {
  if (!map.isMoving() && !map.isZooming() && !document.hidden) {
    const center = map.getCenter();
    center.lng += (0.5 * (now - last)) / 1000; // 0.5° per second
    map.setCenter(center);
  }
  last = now;
  raf = requestAnimationFrame(spin);
};
raf = requestAnimationFrame(spin);
```

Stop the spin on any pointer interaction or when a case is selected. Disable it under `prefers-reduced-motion`.

### Fly to a case

```ts
map.flyTo({
  center: [lng, lat],
  zoom: 5.5,
  pitch: 35,
  bearing: 0,
  duration: 1800,
  essential: true,
});
```

For a region, use `map.fitBounds(bounds, { padding: 80, duration: 1400 })`, then `map.easeTo({ pitch: 25, duration: 600 })` if the tilt matters. `fitBounds` does not take a pitch option.

### 2D / 3D toggle

```ts
export function setProjection(map: maplibregl.Map, mode: "globe" | "mercator") {
  map.setProjection({ type: mode === "globe" ? "globe" : "mercator" });
  map.easeTo({ pitch: mode === "globe" ? 20 : 0, duration: 600 });
}
```

Do not reload the map. Do not recreate layers. The projection change is a map call.

### Splash reveal

Osiris’s sequence:

1. Splash paints immediately.
2. Stage timers advance the progress text.
3. The final stage waits for `mapReady`.
4. The splash fades with `opacity: 0, scale: 1.04`.
5. HUD pieces animate in with staggered delays (`0.15s`, `0.3s`, `0.45s`, `0.6s`).
6. If the map never becomes ready, a 7-second timeout lifts the splash anyway.

Implement the timeout. A splash that waits forever is worse than a plain loading screen.

## 7. Terrain and 3D buildings

These are optional for the trend app. The globe is the hero; terrain matters only when the user zooms into a region.

### Terrain

Use a public DEM instead of copying Osiris’s custom terrain protocol:

```ts
map.addSource("terrain", {
  type: "raster-dem",
  tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
  encoding: "terrarium",
  tileSize: 256,
  maxzoom: 15,
  attribution: "Terrain tiles: Mapzen / Amazon",
});
map.setTerrain({ source: "terrain", exaggeration: 1 });
```

Osiris’s terrain rules worth copying:

- Activate only at zoom **10+**.
- Disable below **9.5** to create hysteresis and avoid tile churn.
- Wait ~500ms after the camera settles before loading.
- Fade `exaggeration` from `0` to `1` over ~600ms, and back out before removal.
- Cap `maxPitch` at `60` while terrain is on.
- Cap pixel ratio at `1.5` on retina to avoid multiplying terrain framebuffers.
- Stop terrain requests before zooming out to the globe.

Projection while terrain is on:

```ts
const TERRAIN_GLOBE_PROJECTION = {
  type: ["interpolate", ["linear"], ["zoom"], 7, "vertical-perspective", 9, "mercator"],
} as const;
```

This avoids compiling both globe+terrain and mercator+terrain programs at the same time. When terrain is off, use plain `{ type: "globe" }`.

### 3D buildings

Find the basemap’s building layer, then add an extrusion:

```ts
const buildingLayer = map.getStyle().layers.find(
  (l): l is maplibregl.FillLayerSpecification =>
    l.type === "fill" && /^buildings?$/.test(l["source-layer"] ?? ""),
);

if (buildingLayer && !map.getLayer("osiris-3d-buildings")) {
  map.addLayer({
    id: "osiris-3d-buildings",
    type: "fill-extrusion",
    source: buildingLayer.source,
    "source-layer": buildingLayer["source-layer"],
    minzoom: 14.5,
    paint: {
      "fill-extrusion-height": ["coalesce", ["get", "height"], ["get", "render_height"], 5],
      "fill-extrusion-base": ["coalesce", ["get", "min_height"], ["get", "render_min_height"], 0],
      "fill-extrusion-color": [
        "interpolate", ["linear"], ["get", "height"],
        0, "#1a1a2e",
        20, "#16213e",
        50, "#0f3460",
        120, "#533483",
        300, "#e94560",
      ],
      "fill-extrusion-opacity": 0.75,
    },
  });
  if (map.getPitch() < 40) map.easeTo({ pitch: 50, duration: 1200 });
}
```

Remove the layer when the user turns 3D off. Do not leave it in the style.

## 8. Custom WebGL layers (optional)

Osiris’s signature motion comes from custom WebGL layers:

- **Satellites** at real altitude.
- **Arcs and pulses** for analysis links.
- **Clouds** lifted above the ground.
- **Wind** streamlines with comet pulses.

These are not required for the trend app. Add at most one signature layer (a scan pulse or a small set of arcs) after the core flow works.

### How the custom layers work

A MapLibre custom layer implements:

```ts
const layer: maplibregl.CustomLayerInterface = {
  id: "my-layer",
  type: "custom",
  renderingMode: "3d",
  onAdd(map, gl) { /* create buffers, programs */ },
  render(gl, args) { /* draw */ },
  onRemove(map, gl) { /* delete buffers */ },
};
map.addLayer(layer);
```

In the shader prelude MapLibre supplies:

- `projectTileFor3D(vec2 mercator, float elevation)` — places geometry on the globe or flat map, with the correct projection.
- `u_projection_matrix`
- `u_projection_tile_mercator_coords`
- `u_projection_clipping_plane`
- `u_projection_transition`
- `u_projection_fallback_matrix`

Using the prelude is what makes one shader work in both globe and mercator. Do not reimplement the projection on the CPU.

### Satellites

Osiris compresses altitude into a visible band:

- Floor 620 km so the marker clears the globe depth test.
- Ceiling 2,500 km so GEO stays inside the frustum.
- Square-root mapping from 150–36,000 km into that band.
- At zoom > 7, hide the layer; a satellite drawn over a city is misleading and steals clicks.

The marker is an instanced quad expanded in clip space, so it stays a constant pixel size. A separate picking pass writes the instance ID as color, so click targets match exactly what is drawn.

### Arcs and pulses

Osiris draws analysis arcs as ribbons of constant pixel width along great circles:

- Sample the great circle into points.
- Lift each point by a height profile.
- Expand the ribbon in screen space so width is constant.
- Discard vertices behind the horizon using the camera recovered from the clipping plane.
- Add a glow, a draw-in reveal, and a traveling pulse.
- Use additive blending for the glow.

This is a lot of shader code. For our app, a simpler version is enough: a pulsing ring at the selected place, plus a few MapLibre line layers for source links. If we want the full arc look, port `src/lib/oi/globe.ts` and `src/lib/oi/arcs.ts` after the rest works.

## 9. HUD layout

Osiris’s layout is a full-screen map with overlays. Reproduce the composition, not every panel.

```text
┌────────────────────────────────────────────────────────────────────┐
│ HEADER: mark · name · subtitle          STATUS: LIVE · LAYERS · ...│
│                                                                    │
│  COMMAND BAR (centered, opens on /)                                │
│                                                                    │
│ ┌──────────────┐                                    ┌───────────┐ │
│ │ VARIABLE     │                                    │ EVIDENCE  │ │
│ │ RAIL         │              GLOBE                 │ / ANALYST │ │
│ │              │                                    │ PANEL     │ │
│ └──────────────┘                                    └───────────┘ │
│                                                                    │
│ ┌──────────────┐                                    ┌───────────┐ │
│ │ 2D/3D · MAP  │                                    │ SHARE     │ │
│ └──────────────┘                                    └───────────┘ │
│                                                                    │
│ BOTTOM STATUS TICKER: cache · source · method · jobs · ZULU        │
└────────────────────────────────────────────────────────────────────┘
```

Z-index stack (from Osiris):

| Layer | z-index |
|---|---|
| Map | 0 |
| Corner frames | 1 |
| Vignette | 2 |
| Scanlines | 3 |
| HUD panels | 200–450 |
| Search / command overlays | 450 |
| Keyboard shortcuts | 500 |
| Splash | 999 |
| Expanded camera / full-screen media | 9000 |

Key rules:

- `main` is `fixed inset-0 overflow-hidden`.
- The map fills the screen; HUD panels are absolutely positioned.
- Panels are `pointer-events-auto`; containers are `pointer-events-none`.
- The bottom status bar is a thin ticker, not a large panel.
- On mobile, rails become bottom drawers; the map remains full-screen.
- The command bar is the terminal identity: monospace, `/` to focus, autocomplete, `Enter` to run.

### Splash composition

Osiris’s splash is a short tactical boot sequence, not a spinner:

- Background: `radial-gradient(ellipse at center, #0a0a14 0%, #04040A 70%)`.
- A slowly rotating outer ring with a bright dot, an inner ring, orbit arcs, and a crosshair.
- A thin scanline overlay drifting over the whole splash.
- Version badge top-left.
- Stage text: `ESTABLISHING SECURE CONNECTION...`, `INITIALIZING FEEDS...`, `CALIBRATING SENSORS...`, `SYSTEM READY`.
- A progress bar with percentages.
- Exit: `opacity: 0, scale: 1.04`, 0.7s; the globe is already behind it.

Keep it under 2 seconds when the map is ready. The 7-second timeout is the safety net, not the plan.

### HUD tags

Osiris uses small bordered tags for state:

```css
.gotham-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 3px;
  font-family: var(--font-hud);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid;
}

.gotham-tag--info {
  background: rgba(0, 229, 255, 0.08);
  color: #00e5ff;
  border-color: rgba(0, 229, 255, 0.2);
}

.gotham-tag--critical {
  background: rgba(255, 61, 61, 0.12);
  color: #ff3d3d;
  border-color: rgba(255, 61, 61, 0.3);
}
```

Use tags for `CACHED`, `LIVE`, `STALE`, `SIGNIFICANT`, `NOT SIGNIFICANT`, and source names. Do not use them for every sentence.

## 10. HUD components to adapt

| Osiris | Our component | Notes |
|---|---|---|
| `OsirisMap.tsx` | `GlobeMap.tsx` | Keep imperative map, drop Next.js imports |
| `GlobalStatusBar.tsx` | `StatusLine.tsx` | Cache/live, source, jobs, method, Zulu |
| `SearchBar.tsx` | `CommandBar.tsx` | Commands + place/variable autocomplete |
| `LayerPanel.tsx` | `VariableRail.tsx` | Categories, toggles, signal badges |
| `IntelFeed.tsx` | `EvidenceFeed.tsx` | Source, coverage, quality, citations |
| `ViewPresets.tsx` | `CasePresets.tsx` | Curated cases and regions |
| `MapControls.tsx` | `GlobeControls.tsx` | Zoom/pan pad, hold-to-repeat |
| `TimeBox.tsx` | `JobTicker.tsx` | Docked job/progress boxes |
| `ScaleBar.tsx` | `ScaleBar.tsx` | Keep the cartographic formula |
| `KeyboardShortcuts.tsx` | `Shortcuts.tsx` | `?` overlay |
| `StyleStudio.tsx` | optional `ThemeStudio.tsx` | Presets; not MVP |
| `SpaceCam.tsx` | optional `EarthCam.tsx` | Nice-to-have, not core |

## 11. HUD tokens and type

Use Osiris’s token structure, but start from its `TERMINAL` preset and raise the small type sizes.

```css
:root {
  --bg-void: #000a06;
  --bg-primary: #001410;
  --bg-secondary: #00201a;
  --bg-panel: rgba(0, 20, 16, 0.88);

  --accent: #00ff9c;
  --accent-dim: #00b36b;
  --gold-primary: #d4af37;
  --cyan-primary: #00e5ff;

  --text-primary: #c8ffe4;
  --text-secondary: #5fbf95;
  --text-muted: #2e6b52;
  --text-heading: #7dffc4;

  --border-primary: rgba(0, 255, 156, 0.16);
  --border-secondary: rgba(0, 255, 156, 0.08);

  --font-hud: "JetBrains Mono", "Courier New", monospace;
  --font-body: "Inter", system-ui, sans-serif;
}

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

Osiris uses 7px labels. Do not copy that. Use 10–12px labels and 13px body text. The judges need to read the verdict from across a room.

## 12. Animation and reveal

Osiris’s HUD enters as one sequence after the splash:

```ts
const HUD_EASE = [0.22, 1, 0.36, 1] as const;
const hudIn = (delay: number) => ({
  duration: 0.7,
  ease: HUD_EASE,
  delay,
});
```

Use it for:

- header: `y: -20`, delay `0.15`
- top-right status: `opacity`, delay `0.35`
- left rail: `x: -12`, delay `0.3`
- right tool rail: `x: 12`, delay `0.3`
- bottom controls: `y: 20`, delay `0.45`
- bottom ticker: `opacity`, delay `0.6`

Splash exit: `opacity: 0, scale: 1.04`, 0.7s. This makes the HUD feel like it is landing on a finished globe rather than appearing over a loading screen.

## 13. Performance rules

- Keep the map in a `useRef`; never put the map instance in React state.
- Update data with `source.setData(...)`, not by re-rendering the map.
- Add layers once, in a `map.on('load')` effect. Toggle visibility with `setLayoutProperty`.
- Use `requestAnimationFrame` only for spin/pulse; cancel on unmount.
- Pause animations when `document.hidden`.
- Cap pixel ratio at `1.5` when terrain is on.
- Avoid `backdrop-filter` on many large panels; it is expensive on low-end GPUs.
- Do not create a DOM marker per point; use GeoJSON layers.
- Use `map.once('idle')` for the splash, with a timeout fallback.
- Under `prefers-reduced-motion`, disable spin, pulses, and long flights.

## 14. Adapting to our Convex SPA

- **No Next.js.** Remove `next/link`, `next/dynamic`, and API route proxies.
- **CARTO tiles.** The style URL works directly from the browser. If we hit rate limits, proxy tiles through a Convex HTTP action or switch to a self-hosted style. Keep CARTO/OSM attribution.
- **Basemap color.** CARTO Dark Matter is navy. Do not CSS `hue-rotate` the whole map; it tints markers and HUD too. Either keep the neutral dark basemap and put terminal green only in the HUD, or generate a monochrome style and tint it deliberately.
- **Convex data.** `useQuery(api.cases.get, { slug })` drives the selected case. Pass the result to the map with an effect; do not fetch inside map callbacks.
- **Selected place.** Store `{ lat, lng, bbox }` in React state. Fly to it and draw a marker/highlight layer.
- **Analysis result.** Lives in the HUD panels, not on the globe. The globe shows *where*; the panels show *what* and *how significant*.
- **Agent trace.** HUD panel, not map. A pulsing ring at the investigated place is enough.
- **Data source chips.** Show NASA POWER, MODIS, Giovanni, Meteomatics as HUD tags, not map layers.
- **Terminal theme.** Green accent on the dark globe; gold/cyan only for status and source tags.

### Selected place and bbox

Keep one GeoJSON source for the selection and update it when React state changes:

```ts
const SELECTED = "selected-region";

function setSelectedRegion(map: maplibregl.Map, region: Region) {
  const features =
    region.kind === "point"
      ? [{
          type: "Feature" as const,
          properties: { kind: "point" },
          geometry: { type: "Point" as const, coordinates: [region.lon, region.lat] },
        }]
      : [{
          type: "Feature" as const,
          properties: { kind: "bbox" },
          geometry: {
            type: "Polygon" as const,
            coordinates: [[
              [region.west, region.south],
              [region.east, region.south],
              [region.east, region.north],
              [region.west, region.north],
              [region.west, region.south],
            ]],
          },
        }];

  const source = map.getSource(SELECTED) as maplibregl.GeoJSONSource | undefined;
  const data = { type: "FeatureCollection" as const, features };
  if (source) { source.setData(data); return; }

  map.addSource(SELECTED, { type: "geojson", data });
  map.addLayer({
    id: "selected-region-fill",
    type: "fill",
    source: SELECTED,
    paint: { "fill-color": "#00ff9c", "fill-opacity": 0.08 },
  });
  map.addLayer({
    id: "selected-region-line",
    type: "line",
    source: SELECTED,
    paint: { "line-color": "#00ff9c", "line-width": 1.5, "line-dasharray": [4, 3] },
  });
  map.addLayer({
    id: "selected-region-point",
    type: "circle",
    source: SELECTED,
    filter: ["==", ["get", "kind"], "point"],
    paint: {
      "circle-radius": 6,
      "circle-color": "#00ff9c",
      "circle-stroke-color": "#001410",
      "circle-stroke-width": 2,
    },
  });
}
```

Then fly to it from the React effect:

```ts
useEffect(() => {
  const map = mapRef.current;
  if (!map || !selectedRegion) return;
  setSelectedRegion(map, selectedRegion);
  if (selectedRegion.kind === "point") {
    map.flyTo({ center: [selectedRegion.lon, selectedRegion.lat], zoom: 6, pitch: 25, duration: 1400 });
  } else {
    map.fitBounds(
      [[selectedRegion.west, selectedRegion.south], [selectedRegion.east, selectedRegion.north]],
      { padding: 80, duration: 1400 },
    );
  }
}, [selectedRegion]);
```

## 15. Implementation order

1. MapLibre globe + CARTO dark style + sky/fog.
2. HUD frame: header, status, rails, corner frames, vignette.
3. Splash and HUD reveal.
4. Place search, fly-to, marker, bbox highlight.
5. Day/night terminator.
6. 2D/3D toggle and camera controls.
7. Case presets and variable rail.
8. 3D terrain and buildings (optional).
9. Scan pulse or arcs (optional).
10. Performance pass and mobile drawers.

## 16. Pitfalls

- **MapLibre 6 needs WebGL2.** Handle context creation failure with fallback attributes and a clear error.
- **Do not reinitialize the map on theme changes.** Toggle style/layers or use `setProjection`; recreating the map loses camera state and WebGL resources.
- **Do not set projection before `load`.** Apply after the style is parsed.
- **Terrain + globe compiles two shader programs.** Switch projection only after terrain has fully faded out.
- **3D building source-layer names vary.** Find the building layer from the loaded style; do not hardcode `carto/building` or `protomaps/buildings`.
- **Terrain tiles need CORS and attribution.** Test the DEM URL from the browser.
- **Pixel ratio on retina** multiplies terrain memory; cap it.
- **Too many DOM overlays** hurt. Use WebGL/GeoJSON for points.
- **Splash can block the app.** Always include a timeout fallback.
- **Osiris’s 7px type is too small.** Raise it.
- **License and attribution.** Keep the Osiris MIT notice; credit CARTO, OpenStreetMap, MapLibre, and terrain tiles.

## 17. Acceptance criteria

- The globe renders at 60fps on a mid-range laptop at overview zoom.
- The initial globe is visible in under 2 seconds; the splash lifts on `idle` or after a 7-second fallback.
- The 2D/3D toggle works without reloading the map.
- The day/night terminator updates and does not cover markers.
- Clicking a place flies to it and shows a marker or bbox highlight.
- The HUD is readable at 1280×720 and on a phone-width viewport.
- No console errors when WebGL2 is unavailable.
- `prefers-reduced-motion` disables spin, pulses, and long flights.
- CARTO/OSM/MapLibre attribution is present.
- The page works with `DEMO_MODE=cached` and does not call external data sources.

## 18. What not to copy

- The Next.js app shell and API routes.
- The OSINT layer catalog and data feeds.
- The custom tile proxy unless we actually need it.
- The 7px HUD type scale.
- The full satellite/wind/cloud/arc stack before the core flow works.
- Any code without the MIT notice and attribution.
