# HOLMES — concept dossier

**Status:** concept exploration, 2026-11-14. “Holmes” is a working title.
**Question:** Can we build an Osiris-style Earth dashboard where a user asks a question, sees city trends on a globe, filters by variables and time, inspects a city, and gets wildfire notices from NASA FIRMS?
**Short answer:** Yes. The hard part is scope and scientific honesty, not the UI.

## The idea

Holmes is an Earth-system detective. The globe is the case board. Every city is a witness. The user asks a question in plain language; Holmes turns it into a reproducible NASA data investigation, colors the world by the answer, and opens an evidence file for any city.

**Tagline:** *Ask the planet a question.*

**Visual reference:** the Osiris dashboard screenshot supplied by the user; the implementation notes are in [`../technical/osiris-globe-and-hud.md`](../technical/osiris-globe-and-hud.md).

### What the user sees

- A full-bleed 3D Earth with an Osiris-style HUD and a dark atmosphere.
- City markers with colored halos and rings: trend direction, magnitude, and significance.
- A variable filter for one or more NASA variables.
- A timeline for the analysis window, season, and aggregation.
- A central chat input: “Is Jakarta getting warmer?”
- A right-panel **Holmes Brief** with the agent’s answer, key numbers, and evidence.
- A city file with **auto-generated key notes** and charts for every selected variable.
- A fire-watch layer with NASA FIRMS active-fire detections and map notices.
- A **Then & Now** satellite comparison with true-color and false-color imagery.

### The five surfaces

| Surface | Role |
|---|---|
| **The Board** | The globe. Shows where the signal is. |
| **The Lens** | Variable filter + timeline. Changes what the board is measuring. |
| **The Question** | Center chat. Turns a question into a case; the full answer opens in the right panel. |
| **The File** | Right panel. Shows the Holmes Brief, auto-generated key notes, charts, statistics, satellite Then & Now, and provenance. |
| **The Watch** | FIRMS fire layer and notices. Adds timely, local context. |

## Feasibility verdict

| Feature | Verdict | What it takes |
|---|---|---|
| Osiris-style globe and HUD | **Yes** | MapLibre globe + CARTO dark style + React/Tailwind HUD. Existing technical guide covers it. |
| Colored mark zone per city | **Yes, with caveats** | Use a marker halo at global zoom and the real MERRA-2 grid cell at city zoom. A continuous trend surface is not MVP. |
| Single- or multi-variable trend filter | **Yes** | Standardize slopes before combining. Show mixed signals. Never average raw units. |
| Timeline and date range | **Yes** | Window presets (full, 35Y, 25Y, 15Y, custom), season/month filter, and monthly/annual chart resolution. NASA POWER monthly data from 1981; AOD from 2001. Precompute common windows; compute custom windows from cached series. |
| Center chat agent | **Yes, if narrow** | Tool-grounded agent; answer opens in the right-panel brief; all numbers from the stats engine; deterministic fallback. |
| City inspection charts | **Yes** | Auto-generated key notes; cached monthly series; sparklines plus one expanded chart. |
| NASA FIRMS wildfire notices | **Yes, with wording caveats** | FIRMS NRT hot pixels, clustered and ranked. Cached snapshot for the demo. |
| **Evidence Lens** (uncertainty on the map) | **Yes** | Reuse FDR q-values, sample size, coverage, and agreement. Two modes (Effect + Evidence) are enough for the demo. |
| **Satellite Then & Now** | **Yes, with caveats** | NASA GIBS true/false color, same-month dates, cached snapshots. Clouds and seasonality are the main risks. Supporting feature, not the main differentiator. |
| All of it in 48 hours | **Ambitious** | Build the question-to-globe MVP first; add the composite and live fire layers only if time remains. |

**Bottom line:** the concept is buildable. The risk is trying to ship every idea at once. The recommended MVP is one polished variable, a global city board, a city evidence panel, a narrow agent, and a cached Indonesia fire layer.

**Terminology:** “per decade” is the slope unit, not a time filter. The timeline controls the **window** (years used for the trend), the **season/month** (which months are analyzed), and the **chart resolution** (monthly or annual). A “decade compare” chart is an optional extra, not the main trend test.

**Rough effort for a small team:** globe/HUD **M**, city trend layer **M**, multi-variable composite **M**, timeline **S**, city file **S–M**, agent **L**, FIRMS **M**, polish **L**. The agent and the visual polish are the schedule risks, not the data.

## The gap feature: Evidence Lens

The prior-art research found one map-native gap that is still mostly open: **honest uncertainty on maps**. Most trend maps show direction, but not how strong the evidence is. Holmes closes it with an **Evidence Lens** that switches the globe between four questions:

```text
EFFECT  →  what is changing?
EVIDENCE →  how strong is the statistical evidence?
AGREEMENT →  do the selected variables agree?
COVERAGE →  do we have enough data?
```

The default is EFFECT. When the user asks “how sure?”, the same city board recolors by evidence strength, the right-panel notes re-sort, and the agent explains what changed. It uses data Holmes already computes: FDR q-values, sample size, coverage, and agreement.

**Supporting feature, not the gap feature:** a **Then & Now** satellite comparison from NASA GIBS. True color shows urban growth and land cover; false color highlights burn scars and vegetation. It is visually strong, but imagery is already common in the field. Add it after the core flow, not instead of the Evidence Lens.

## Recommended MVP

1. Globe with 60–100 curated city anchors.
2. One variable polished end to end (`T2M`), with 7 more variables available in the filter.
3. Four timeline presets plus a season filter.
4. Right-panel Holmes Brief: the agent’s answer, key numbers, and evidence.
5. City file with auto-generated key notes, sparklines for all selected variables, and one expanded chart.
6. Evidence Lens with Effect + Evidence modes.
7. Chat with 7 core question types + 3 evidence follow-ups and a deterministic fallback.
8. FIRMS Indonesia snapshot with top clusters and map notices.
9. Share URL, provenance, and visible caveats.

Then, if time remains:

- Multi-variable composite signal.
- Evidence Lens: Agreement + Coverage modes.
- Cross-Examination sensitivity card (see 06).
- Satellite Then & Now: true/false color, split view, full-screen compare (see 07).
- “Rank cities” answers such as “Where is rainfall falling?”
- Live FIRMS for the current viewport.
- Decade animation and city comparison.
- Mobile layout.

## What Holmes is not

- Not a continuous global gridded trend surface.
- Not a causal-attribution engine.
- Not a general-purpose Earth-science platform.
- Not an autonomous agent that browses the web or runs arbitrary code.
- Not a real-time wildfire alert service.
- Not a probability-of-truth score. The Evidence Lens shows statistical evidence strength, not the chance that a trend is “true.”
- Not a spy satellite. NASA GIBS imagery is 250 m–1 km per pixel, daily, and often cloudy.
- Not a replacement for official fire or climate authorities.

## Reading guide

1. [`01-product-concept.md`](01-product-concept.md) — vision, audience, journeys, positioning.
2. [`02-dashboard-ux.md`](02-dashboard-ux.md) — layout, right panel, chat, Lens, visual system.
3. [`03-trend-engine.md`](03-trend-engine.md) — city zones, multi-variable math, timeline, data.
4. [`04-agent-and-wildfire.md`](04-agent-and-wildfire.md) — agent, right-panel brief, key notes, FIRMS.
5. [`05-build-plan.md`](05-build-plan.md) — MVP, 48-hour plan, demo, risks.
6. [`06-gap-analysis-and-evidence-lens.md`](06-gap-analysis-and-evidence-lens.md) — prior-art gaps and the recommended signature feature.
7. [`07-satellite-then-now.md`](07-satellite-then-now.md) — NASA GIBS imagery, true/false color, and the comparison feature.
8. [`08-global-criteria-alignment.md`](08-global-criteria-alignment.md) — global eligibility, judging criteria, and submission gaps.

## Key assumptions

- The team keeps the existing stack: Vite + React + TypeScript, MapLibre GL, Convex, and the Python stats service.
- The city board is precomputed for a curated list. Arbitrary cities are a stretch.
- NASA POWER is the primary live source. MODIS and Giovanni data are precomputed.
- The demo is desktop-first. Mobile is a stretch.
- The globe is built with MapLibre, not Three.js.
- “Holmes” is a working title.

## Global criteria

See [`08-global-criteria-alignment.md`](08-global-criteria-alignment.md) for the full compliance matrix. The concept is strong on Creativity, Relevance, and Presentation; Validity is strong but has a method-sensitivity gap. The main gaps are global eligibility (a listed NASA resource), method sensitivity, impact distribution, and the official 30-second video / 7-slide deck.

## Eligibility note

NASA POWER is not listed on the challenge Resources tab. The city board can run on POWER, but the submission should ship at least one starter case exported via a listed resource: MODIS AOD via **Giovanni**, AppEEARS NDVI/LST, or GES DISC hydrology. The existing LAADS CSV is a cross-check, not the eligibility path. FIRMS and GIBS imagery are bonus layers, not substitutes. This keeps the global-award story safe without slowing the live board.

## Decision change

The earlier concept work recommended **Case Files** and explicitly said “do not build a global 3D globe.” The new direction puts the Osiris-style globe at the center. This dossier treats the globe as in scope, built with MapLibre, and keeps the evidence engine from Case Files. Case Files becomes a set of starter cases inside Holmes rather than a separate product.
