# 05 — Build plan and scope

## 1. The scope decision

The concept is buildable. The danger is building all of it.

The recommended product is **one polished question-to-globe loop**, not a general Earth-science platform. The loop is:

```text
ask → resolve → filter → recolor → fly → inspect → answer → share
```

Everything in the MVP must make that loop work. If a feature does not, it waits.

### The one-sentence MVP

> A user can ask “Is Jakarta getting warmer?”, watch the globe fly to Jakarta, read a sourced verdict in the right-panel Holmes Brief, see the auto-generated key notes, switch to the Evidence Lens to check how strong the evidence is, and share the view — with a cached NASA FIRMS Indonesia layer and a shareable URL.

That is the demo. The composite mode, city ranking, live fire, and decade animation are stretch goals.

## 2. Must ship, stretch, non-goals

### Must ship

| Area | Requirement |
|---|---|
| **Globe** | MapLibre globe, dark style, sky/fog, city markers, selection, fly-to |
| **HUD** | Osiris-style header, left rail, right panel, status ticker, chat bar |
| **City board** | 60–100 curated cities with precomputed trends |
| **Variables** | `T2M` polished; 7 more in the filter |
| **Timeline** | Full, 35Y, 25Y, 15Y, season filter |
| **City file** | Auto-generated key notes, verdict, evidence stack, one expanded chart, provenance, caveats |
| **Right panel** | Holmes Brief for agent answers; city file and fire watch tabs |
| **Evidence Lens** | Effect + Evidence modes; Agreement/Coverage are stretch |
| **Chat** | 7 core intents + 3 evidence follow-ups + deterministic fallback; full answer opens in the right panel |
| **Fire watch** | Cached Indonesia FIRMS layer, top clusters, notices, caveats |
| **Share** | URL state (including lens) + case card |
| **Reliability** | Cached mode, fallback answers, no blank screens |
| **Challenge resource** | At least one starter case exported via a listed NASA resource: MODIS AOD via Giovanni, AppEEARS NDVI/LST, or GES DISC hydrology. LAADS is a cross-check, not the eligibility path |

### Stretch

- Multi-variable composite mode.
- **Satellite Then & Now:** cached split comparison, true/false color, full-screen compare.
- Live GIBS date search and a satellite basemap at city zoom.
- Evidence Lens: Agreement + Coverage modes.
- Cross-Examination sensitivity card.
- “Rank cities” for any selected variable.
- Live FIRMS for the current viewport.
- Custom date range from cached series.
- Decade comparison chart and animation.
- Compare two cities.
- Case card + teacher notes for distribution.
- Mobile layout.
- Saved cases in localStorage.
- Export CSV/PNG.

### Non-goals

- Continuous global trend surface.
- Arbitrary Earth-science variables outside POWER.
- MODIS NDVI/LST live city layer.
- Causal attribution.
- Forecasting.
- User accounts.
- A probability-of-truth score.
- Real-time wildfire alerts.
- Autonomous web browsing or code execution.
- Full 3D terrain, buildings, satellites, clouds, wind.

### Starter cases

| Case | Source | Why it is in the demo |
|---|---|---|
| **Jakarta warming** | NASA POWER `T2M` | Local headline; +0.21 °C/decade, significant |
| **Wisconsin AOD** | MODIS AOD exported via Giovanni (listed); LAADS CSV as cross-check | Official video example; Resources-tab eligibility |
| **Jakarta multi-variable** | NASA POWER (4–8 variables) | Shows the city scan and mixed/weak signals |
| **A non-significant case** | NASA POWER (e.g., Wisconsin `T2M`) | Teaches “no clear trend” without overclaiming |

These are curated cases, not extra product surfaces. They live in a small “Cases” drawer and share the same city/evidence components.

## 3. 48-hour plan

This plan assumes a small team and a working repo. Adjust to the actual start time, but keep the order.

| Window | Goal | Output |
|---|---|---|
| **0–4h** | Lock the story, city list, variable catalog, design tokens | One-page spec, `cities.csv`, variable list, Figma/tokens |
| **4–10h** | Data pipeline | POWER fetch for 100 cities × 8 variables; parsed series; coverage report |
| **10–16h** | Stats | Seasonal Sen slope, CI, Seasonal Mann–Kendall, OLS HAC, FDR, standardized slope; tests; Jakarta/Wisconsin validation |
| **16–24h** | Globe + HUD | MapLibre globe, dark style, city markers, header, left rail, status ticker |
| **24–30h** | City file + right panel | Panel tabs, auto key notes, verdict, evidence stack, chart, provenance, caveats |
| **30–36h** | Chat + Evidence Lens | Tool definitions, deterministic router, LLM loop, `openCityFile`, `setLens`, key notes, 8 prewarmed questions |
| **36–40h** | Fire watch | Cached Indonesia layer, clusters, notices, fire panel, caveats |
| **40–44h** | Polish | Timeline recolor, legend, share URL, cached mode, performance, error states |
| **44–48h** | Demo | Record video, 7-slide deck, submission, buffer |

### Feature freeze

At **hour 40**, freeze new features. After that, only fix bugs, improve legibility, and rehearse the demo. A polished five-feature app beats a broken ten-feature app.

**Satellite Then & Now is an optional 2–4 hour block** after the core flow. If the clock is tight, ship cached split images for Jakarta and Wisconsin only. Do not build live GIBS date search or a satellite basemap before the core flow is done.

### Parallel tracks

If there are three or more people:

- **Data/stats track:** fetch, parse, compute, validate.
- **Globe/HUD track:** MapLibre, panels, city layer, timeline.
- **Agent/fire track:** tools, fallback, FIRMS, notices.
- **Integrator:** owns the URL state, cached mode, and demo path.

Do not let the tracks invent separate data shapes. Lock the result schema early.

## 4. Data precompute checklist

### City list

- [ ] 30–40 global anchors + 40–60 Indonesia/Southeast Asia cities.
- [ ] One city per MERRA-2 cell; merge duplicates.
- [ ] Fields: id, name, country, lat, lon, population, timezone, anchor rank, aliases.
- [ ] Validate coordinates against a map.

### POWER series

- [ ] One request per city, all 8 parameters, monthly, 1981–2025.
- [ ] Parse `-999` as missing; drop `ANN`.
- [ ] Record coverage and retrieval date.
- [ ] Store a compact per-city JSON or Convex rows.
- [ ] Check file size; gzip if needed.

### Stats

- [ ] Monthly series with coverage checks; Seasonal Mann–Kendall; annual means for display.
- [ ] Seasonal Sen slope + 95% CI (label the CI method).
- [ ] Mann–Kendall p-value + Hamed–Rao where available.
- [ ] OLS with HAC standard errors (12 lags) on the deseasonalized monthly series.
- [ ] `methodDependent` flag when OLS HAC and Seasonal MK disagree at 5%.
- [ ] BH FDR across cities and across variables.
- [ ] Standardized slope `z`.
- [ ] Evidence level (`strong` / `moderate` / `weak` / `insufficient`) from `q` and `nYears`.
- [ ] Four windows × five seasons.
- [ ] `insufficient_data` path.
- [ ] `CityNotes` templates and golden-file tests.

### Validation

- [ ] Jakarta `T2M` ≈ +0.21 °C/decade, p < 0.001.
- [ ] Jakarta `PRECTOTCORR` ≈ +0.80 mm/day/decade (check unit).
- [ ] Jakarta `AOD_55` ≈ +0.038/decade, p < 0.001.
- [ ] A non-significant case (e.g., Wisconsin `T2M`, p ≈ 0.10).
- [ ] AOD window starts 2001, not 1981.
- [ ] A city with missing months still renders.
- [ ] A city with <10 years shows `insufficient_data`.

### FIRMS

- [ ] Load the 5-day Indonesia snapshot.
- [ ] Filter high/nominal confidence.
- [ ] Cluster by 0.1° or 0.25°.
- [ ] Rank by summed FRP.
- [ ] Store top 20 clusters + heatmap points.
- [ ] Attach nearest city/province and date range.
- [ ] Test the notice threshold.
- [ ] Add a `CACHED SNAPSHOT` tag.

### Satellite (optional)

- [ ] GIBS snapshots for Jakarta (2001 vs 2025) and Wisconsin (2002 vs 2025).
- [ ] True color and false color for both dates.
- [ ] Same calendar month; label the sensor and resolution.
- [ ] Stitched 512–768px images; cache in the repo or Convex storage.
- [ ] Alt text; attribution NASA GIBS / Worldview.

### Provenance

- [ ] Source, dataset, parameter definition, unit, retrieval date, citation.
- [ ] Method version.
- [ ] License/attribution for MapLibre, CARTO, OSM, Osiris reference.
- [ ] Caveats in the city file and fire panel.
- [ ] One starter case exported from a listed resource: Giovanni (MODIS AOD) or AppEEARS (NDVI/LST); cite product, version, and export date.
- [ ] Evidence thresholds and “not a probability of truth” note in the methods drawer.
- [ ] Server-side only: Earthdata, LAADS, FIRMS, NOAA, Meteomatics, and LLM keys. Never expose them to the browser.

## 5. Demo script and backup

### 45–60 second script

| Time | Action | Line |
|---|---|---|
| 0:00 | Globe spins; city halos pulse | “Every city is a witness. Holmes asks NASA what it saw.” |
| 0:05 | Type “Is Jakarta getting warmer?” | “One question. No forms.” |
| 0:10 | Globe flies; right-panel Holmes Brief opens | “+0.21 °C per decade. Significant. Twenty-five years of NASA data.” |
| 0:18 | Click “How sure?”; globe switches to Evidence Lens | “Most maps show the trend. Holmes shows how much to trust it.” |
| 0:26 | Click “Show all cities”; switch to mixed variables | “And when the variables disagree, Holmes says so.” |
| 0:34 | Fire notice; click | “When the planet is burning right now, FIRMS shows it.” |
| 0:42 | Fire caveat | “Detections, not claims.” |
| 0:48 | Timeline to full record | “The window changes the answer.” |
| 0:55 | Wordmark | “Holmes. Ask the planet a question.” |

Optional 5-second beat for the deck or a longer cut: open **Then & Now**, show true color, toggle false color, and say “The chart says what changed; the image shows what it looks like.” Keep it out of the 60-second cut unless the core flow is already fast.

### Backup plan

- Record the video in `DEMO_MODE=cached`.
- Prewarm the eight demo questions.
- If the LLM fails, the deterministic answer is identical.
- If FIRMS is down, the cached snapshot is used.
- If GIBS is down, the cached Then & Now images are used.
- If the map fails, use a still frame and the right-panel brief; do not debug on stage.
- Keep a local copy of the video and the slide deck.

## 6. Acceptance criteria

### Functional

- [ ] Ask eight supported questions and get correct answers.
- [ ] An agent answer opens the right-panel Holmes Brief and flies to the resolved city; the chat shows only a receipt.
- [ ] Click any city and open the city file with auto-generated key notes.
- [ ] Switch the Evidence Lens and recolor the board + legend in <250ms.
- [ ] Open a Then & Now card with start/end dates, sensor, attribution, and the “visual context, not a trend test” caveat.
- [ ] Toggle true color / false color and drag the split handle.
- [ ] Change a variable and recolor the board in <250ms.
- [ ] Change a timeline window and recolor in <500ms from cache.
- [ ] Toggle the fire layer and see clusters + notices.
- [ ] Share URL restores the question, variables, window, season, city, and layer.
- [ ] The app works with `DEMO_MODE=cached` and no external calls.

### Scientific

- [ ] Jakarta `T2M` matches the validated result.
- [ ] A non-significant result is labeled “no clear trend,” not “no change.”
- [ ] AOD coverage starts 2001 and the UI says so.
- [ ] Multiple testing is disclosed.
- [ ] The city file says “MERRA-2 grid cell, not a station.”
- [ ] The city file shows both OLS HAC and Seasonal MK; a disagreement sets `METHOD-DEPENDENT`.
- [ ] A method-dependent result is not shown as `STRONG`.
- [ ] The fire panel says “active-fire detections, not a confirmed wildfire.”
- [ ] The Evidence Lens says “statistical evidence strength,” not “probability of truth.”
- [ ] Then & Now uses the same calendar month for both dates by default and labels the sensor.
- [ ] False color includes a visible legend and is not called a different date.
- [ ] Key notes match the computed results and the chart.
- [ ] The right-panel city matches the city the agent resolved.
- [ ] No causal language in the agent answers.

### Visual

- [ ] No text smaller than 10px.
- [ ] Contrast ≥4.5:1 for body text.
- [ ] The layout works at 1280×720 and 1920×1080.
- [ ] The globe is the visual hero; panels do not cover the center.
- [ ] The legend is always visible when a variable is selected and changes with the Lens.
- [ ] The right panel tabs are legible: HOLMES BRIEF / CITY FILE / FIRE WATCH.
- [ ] Key notes are readable without opening the chart.
- [ ] The Then & Now card shows the dates, sensor, resolution, and attribution without opening a modal.
- [ ] The selected city is obvious without relying on color alone.

### Performance

- [ ] Globe visible in <2s on a warm deploy.
- [ ] 60fps at overview zoom on a mid-range laptop.
- [ ] City file opens in <1s with key notes.
- [ ] Lens switch recolors the board in <250ms.
- [ ] Cached right-panel brief in <5s.
- [ ] No console errors when WebGL2 is unavailable.

### Demo

- [ ] The 60-second path works three times in a row.
- [ ] Then & Now works from cached images with the network off.
- [ ] The fallback works with the network off.
- [ ] The slide deck has 7 slides.
- [ ] The video is under 60 seconds and has captions.

## 7. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Scope creep | High | High | Feature freeze at hour 40; one variable polished |
| LLM latency/failure | Medium | High | Deterministic fallback; prewarm; cache |
| Data gaps / AOD start | High | Medium | Coverage badges; per-variable windows; caveat |
| Composite confusion | Medium | Medium | Real units in city file; “σ per decade” legend; mixed state |
| Globe performance | Medium | High | 100 markers; no heavy WebGL; precomputed data |
| “Another dashboard” | High | High | Lead with the question-to-globe loop and the Evidence Lens, not features |
| Right panel overload | Medium | Medium | Tabs; brief is short; city file is one click away |
| Evidence misread as truth probability | Medium | High | “Statistical evidence” label; methods tooltip; no “90% sure” |
| Clouds or seasonality hide the image change | High | Medium | Same-month dates; ±7-day fallback; clear-date helper; caveat |
| Imagery overclaims the trend | Medium | High | “Visual context, not a trend test”; chart is the evidence |
| Imagery resolution expectations | Medium | Medium | “250 m–1 km per pixel”; label the sensor |
| GIBS tile gaps / 404 | Medium | Medium | Try ±7 days; fallback sensor; cached snapshots |
| Scientific overclaim | Medium | High | Verification; FDR; caveats; no causal verbs |
| Method sensitivity ignored | Medium | High | Show OLS HAC + Seasonal MK; conservative verdict; `METHOD-DEPENDENT` badge |
| Fire false positives | High | Medium | Confidence filter; “active-fire detection”; caveat |
| CARTO tile limits | Low | Medium | Fallback style or proxy; cache |
| WebGL2 unavailable | Low | High | Clear fallback; recorded video |
| Team unfamiliar with MapLibre globe | Medium | Medium | Spike in the first 4 hours; reuse the Osiris guide |
| Convex vendor lock-in | Accepted | Low | Hackathon trade-off; document it |
| Resources-tab eligibility | Medium | High | Ship one curated case built from a listed NASA resource; POWER alone may not qualify |

## 8. Open decisions

These need a team decision before or during the first four hours:

1. **Is Holmes the new product shell, or a separate concept?**
   Recommendation: make Holmes the shell and keep Case Files as starter cases. Two products will split the team.

2. **City list: global or local?**
   Recommendation: 30–40 global anchors + 40–60 Indonesia/Southeast Asia cities. The local story is the demo; the global board is the screenshot.

3. **Which variables for the MVP?**
   Recommendation: `T2M`, `T2M_MIN`, `T2M_MAX`, `PRECTOTCORR`, `GWETROOT`, `AOD_55`, `WS2M`, `ALLSKY_SFC_SW_DWN`. Add `RH2M` only if the data pipeline is ahead of schedule.

4. **Which agent stack?**
   Recommendation: Convex action + tool loop + deterministic router. If Convex is already in the stack, use it. If not, a single serverless function is enough.

5. **Fire scope: Indonesia or global?**
   Recommendation: Indonesia cached snapshot for the demo; global viewport as a stretch. The local cluster is stronger and the data is already in the repo.

6. **Timeline: presets or custom?**
   Recommendation: presets first; custom from cached series if time. A custom date picker is not worth a day.

7. **Visual accent: green or amber?**
   Recommendation: keep Osiris green for the HUD; use amber/blue for data and ember for fire. This preserves the reference while giving Holmes its own data language.

8. **Mobile?**
   Recommendation: stretch. The demo is desktop. A broken mobile layout is worse than no mobile layout.

9. **MODIS AOD or POWER AOD?**
   Recommendation: use `AOD_55` (CERES) for the live city layer and label it correctly. Use precomputed MODIS AOD only for a curated case if the story needs the official product.

10. **Does the chat need to be an LLM at all?**
    Recommendation: build the deterministic router first. Add the LLM for phrasing and flexibility. If the LLM is unstable, the product still works.

11. **How much of the Evidence Lens ships?**
    Recommendation: Effect + Evidence in the MVP. Agreement + Coverage only if the core flow is done. Do not build a continuous confidence surface.

12. **How much of Then & Now ships?**
    Recommendation: cached split comparison for 2–3 cities, true + false color, same-month dates. Live date search and a satellite basemap are stretch.

## 9. Relationship to the existing technical docs

### Reuse

- `docs/technical/osiris-globe-and-hud.md` — globe, atmosphere, HUD, camera, splash, performance.
- `docs/technical/stats.md` — Sen, Mann–Kendall, FDR, method versioning.
- `docs/technical/data-and-cache.md` — POWER, cache keys, jobs, provenance.
- `docs/technical/agent.md` — tool pattern, verification, guardrails.
- `docs/technical/frontend.md` — Vite/React/Tailwind, uPlot, component boundaries.
- `scripts/fetch_modis_aod.py`, `scripts/fetch_meteomatics.py`, and the cached assets in `docs/problems/assets/` — use them for the starter cases instead of rebuilding the data pipeline.

### Change

- Product shell: Case Files → Holmes question-to-globe.
- Add a **city trend layer** and a **city trend table**.
- Add a **composite mode** and a **timeline control**.
- Add a **FIRMS fire layer** and **fire clusters**.
- Add a **center chat** as the primary entry point.
- Update the homepage, README, API surface, and agent scope after the concept is locked.

### Do not rewrite

The research docs in `docs/problems/` are the evidence base. Do not rewrite them for the new concept. Add a short note in the concept README that Holmes supersedes the earlier product shell, and keep the research intact.

## 10. Submission checklist

Use [`08-global-criteria-alignment.md`](08-global-criteria-alignment.md) as the full compliance matrix.

### Eligibility

- [ ] Official challenge selected: **Be an Earth System Trend Detective!** (not “Create Your Own Challenge”).
- [ ] At least one **NASA resource from the challenge Resources tab** used and cited. The MODIS/Giovanni Wisconsin AOD case is the safe path.
- [ ] All team members registered and identified on the Project Page.
- [ ] English on the project page and linked materials.
- [ ] No profanity or inappropriate language.
- [ ] Terms and Conditions, submission requirements, and originality/references boxes checked.
- [ ] Submit before **15 Nov 2026, 23:59 WIB**; aim for 4 hours early.

### Demo and project page

- [ ] Public demo link, no login; test in a private browser window.
- [ ] Choose **one** official demo: **7-slide deck** (title counts) or **30-second video**.
- [ ] 30-second video follows the official beat structure and has English captions.
- [ ] 7-slide deck follows the outline in `08` and maps each challenge step to a screen.
- [ ] High-level summary, 50–200 words.
- [ ] Project details: what it does, how it works, benefits, goals, tools/languages.
- [ ] NASA data used and how.
- [ ] Partner data (optional; Meteomatics if used).
- [ ] References: every dataset, library, image, font, icon, and AI tool.
- [ ] AI disclosure: model, purpose, guardrails, generated assets watermark.
- [ ] No NASA logo, flag, or mission identifier used as product branding.

### Technical and narrative

- [ ] GitHub repo with README, license, and data attribution.
- [ ] Data sources and methods page.
- [ ] Limitations page: grid cell, reanalysis, multiple testing, method sensitivity, fire detections, imagery clouds/resolution.
- [ ] Non-significant and method-dependent cases in the deck.
- [ ] Backup video and cached demo.
- [ ] A single sentence the judges remember: “It turned my question into a map of evidence.”

## 11. What success looks like

At the end of the build, a judge should be able to say:

- “I asked a question in plain English.”
- “It showed me the answer on a globe and a chart.”
- “I could see the p-value and the data source.”
- “It used a NASA resource from the challenge Resources tab.”
- “It told me what it could not tell me.”
- “It also showed me where the fires are right now.”

That is the product. Everything else is extra.
