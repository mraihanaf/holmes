# 06 — Gap analysis and the recommended signature feature

The prior-art research found **44 repositories** already working the exact challenge phrase. Most cover the same table stakes: place picker, variable picker, date range, chart, Mann–Kendall, Theil–Sen, and a verdict. The best entries add one strong idea: guided case files, a variable scan, a seasonal flip, a district map, or a classroom package.

This document asks two questions:

1. Which gaps are still open after that prior art?
2. Which one should Holmes turn into a signature feature?

The recommendation is **honest uncertainty on the map**, implemented as the **Evidence Lens**.

## 1. What is already table stakes

These are now credibility requirements, not differentiators:

- Place picker and variable picker.
- Date range and monthly/annual chart.
- Seasonal-cycle handling (deseasonalized chart, seasonal MK, or annual means).
- Mann–Kendall and/or OLS with autocorrelation correction.
- Theil–Sen slope and a confidence interval.
- Plain-language verdict.
- Data-source disclosure and a methods drawer.
- A non-significant case.
- Some form of validation against SciPy/pymannkendall.
- A share link or export.

Building another app with only these is not enough. The research already says the field is crowded and the judges will see many similar entries.

## 2. What the strongest entries already cover

| Entry | Strong idea | What it closes |
|---|---|---|
| **Slope and Signal** | 18 variables, raw vs deseasonalized, autocorrelation-corrected tests, five guided cases, excellent deck | Presentation, method honesty, non-significant case |
| **AtmoSpy** | Four answer cards (what/where/how much/significant), then-vs-now, cited “why” panel | Answer-card UX, mechanism without causation |
| **TrendLens** | Trend Radar ranks variables by signal-to-noise; per-cell map with FDR; second-opinion tests; practice lab | Variable selection, multiple-testing control, statistical practice |
| **NEIA** | One surprising finding (Bangladesh annual mean hides September warming); 442 tests with FDR; Cesium globe and evidence card | A memorable finding, spatial evidence |
| **Terra Bangla / My Climate Story** | District-level local relevance, bilingual UI, classroom mode, teacher lesson plan, low-data mode | Classroom distribution, local impact, accessibility |
| **EarthTrend Detective** | 20 variables, 8 case files, learn/methods tabs, CSV export | Feature breadth and case library |

The lesson: the best entries combine a sharp product idea with visible scientific honesty. A generic dashboard with more features is not the answer.

**Where the field clusters:** most entries are “pick a dataset → plot → run Mann–Kendall.” The strongest add one signature view: a case file, a variable radar, a district map, or a classroom package. None of the reviewed entries combines (a) a question-first agent, (b) a global city board, (c) auto-generated city key notes, and (d) uncertainty as a first-class map mode. That combination is Holmes’s opening.

## 3. The six gaps from the research

The prior-art research names six open gaps. Here is how they stand now and how well each fits Holmes.

| Gap | Who covers it now | Fit for Holmes | Verdict |
|---|---|---|---|
| **1. A true inquiry flow** | Case Files-style entries; partly covered | Strong: the agent already turns a question into a case, a city file, and a verdict | Keep as the product shell, not the signature feature |
| **2. Statistical intuition** | TrendLens practice lab; Slope and Signal sensitivity; partly covered | Strong: the agent can answer “how sure?” in context | Combine with the map feature |
| **3. Classroom distribution** | Terra Bangla, My Climate Story; well covered | Weak: a globe + agent is not a classroom-first product | Do not chase |
| **4. Honest uncertainty on maps** | Mostly open: most maps show red/blue trends with no significance; some show p-values in a side card | Very strong: the globe is the signature surface, and the data already has q-values, CIs, n, coverage, and agreement | **Choose this** |
| **5. Mechanism without causation** | AtmoSpy’s cited “why” panel; partly covered | Medium: content curation is expensive and easy to overclaim | Add later as a small “possible explanations” drawer |
| **6. Mobile-first, no-login, low-bandwidth** | My Climate Story low-data mode; some entries | Weak: a 3D globe and LLM agent are not the low-bandwidth play | Do not chase |

The best fit is **gap 4**, with gap 2 as a supporting benefit. It is map-native, uses data Holmes already computes, and turns the globe from a trend picture into an evidence picture.

## 4. Why “honest uncertainty on maps” is still open

Most trend maps answer one question: **which direction?**

They color a cell red or blue, or a city amber or blue, and stop there. The p-value lives in a side panel, a tooltip, or a methods drawer. A user can easily read “warming” from a color that is not statistically significant.

The strongest entries improve this, but usually in a card or a table:

- A per-cell map with FDR control is better than a raw map, but it still needs a legend and a significance encoding.
- A verdict card with a p-value is honest, but it is not spatial. The user cannot see where the evidence is weak.
- A “second-opinion test” is rigorous, but it is hidden behind a click.

The gap is a map that makes **evidence strength** a first-class visual variable, not a footnote. That is exactly what a globe dashboard can do better than a chart-first app.

## 5. The recommended feature: the Evidence Lens

### 5.1 One-sentence pitch

> **The Evidence Lens lets the user switch the globe from “what is changing?” to “how strong is the evidence?” — without leaving the map.**

It is a segmented control in the left rail:

```text
LENS  [ EFFECT ]  [ EVIDENCE ]  [ AGREEMENT ]  [ COVERAGE ]
```

The city board stays the same. Only the encoding changes.

### 5.2 The four modes

| Mode | Question it answers | Color encodes | Ring / mark encodes |
|---|---|---|---|
| **EFFECT** | What is changing, and how fast? | Trend direction and magnitude (diverging) | Significance |
| **EVIDENCE** | How strong is the statistical evidence? | Evidence level after FDR (sequential) | Direction (amber rising / blue falling) |
| **AGREEMENT** | Do the selected variables agree? | Agreement score (sequential) | Mixed = hatched / split ring |
| **COVERAGE** | Do we have enough data? | Record length and completeness (sequential) | Insufficient = hollow |

The default is **EFFECT**, so the first impression is still “what is changing?” The differentiator appears when the user asks “how sure?” or switches the lens.

### 5.3 Evidence levels

For a single variable:

| Level | Rule | UI |
|---|---|---|
| **STRONG** | FDR-adjusted `q < 0.01` and at least 20 years | Bright cyan/white |
| **MODERATE** | `q < 0.05` | Mid cyan |
| **WEAK** | `q >= 0.05` but at least 10 years | Slate |
| **INSUFFICIENT** | fewer than 10 years or too many gaps | Hollow gray |

For multiple variables:

```text
evidence = significant variables that agree with the composite / selected variables
```

| Level | Rule |
|---|---|
| **STRONG** | at least two-thirds of selected variables are significant after FDR and agree with the composite |
| **MODERATE** | at least one-third are significant and agree |
| **WEAK** | some evidence, but less than one-third |
| **MIXED** | variables disagree; use the agreement mode |
| **INSUFFICIENT** | no variable has enough data |

`MIXED` is a flag shown with the split ring, not a replacement for the evidence level. A city can have strong evidence for a composite that mixes rising temperature and falling rainfall; the split ring explains the disagreement.

The exact thresholds are tuning parameters. The important part is that the rule is explicit and shown in the legend.

### 5.4 What the color means — and does not mean

**It means:** “This city’s data cell has stronger or weaker statistical evidence for a trend in this window, after multiple-testing correction.”

**It does not mean:** “There is a 90% chance the trend is true.” A p-value is not the probability of truth. The UI must say this in the legend tooltip and the methods drawer.

Use the phrase **“evidence strength”**, not “confidence” or “probability.” If the team prefers “Confidence Lens” as a label, define it immediately as statistical evidence, not truth probability. “Evidence Lens” is safer.

### 5.5 The globe encoding

**EFFECT mode** is the current design:

- Halo color: diverging blue → slate → amber by slope.
- Ring: solid if significant after FDR; dashed/dim if not.
- Mixed variables: split ring.

**EVIDENCE mode:**

- Halo color: sequential gray → cyan → white by evidence level.
- Ring color: amber for rising, blue for falling, slate for mixed.
- A tiny direction arrow or glyph inside the ring makes the direction readable without color.
- Cities with insufficient data are hollow, not gray, so they do not look like “weak evidence” when the real issue is “no evidence.”

**AGREEMENT mode:**

- Halo color: sequential slate → green/cyan by agreement.
- Mixed cities get a diagonal hatch or a split ring.
- The legend says “share of selected variables moving in the same direction.”

**COVERAGE mode:**

- Halo color: sequential by valid years / expected years.
- Cities below the minimum are hollow.
- The legend says “record length, not trend strength.”

Do not interpolate a continuous confidence surface between cities. The city marker is the data support. A smooth surface would invent certainty.

### 5.6 The right-panel key notes

When the user clicks a city, the right panel opens a **Key Notes** summary generated from computed results, not from the LLM:

```text
HOLMES NOTES · AUTO-GENERATED
JAKARTA · 2001–2025 · MERRA-2 cell

• Air temperature: rising +0.21 °C/decade, significant (q = 0.004).
• Rainfall: rising +0.70 mm/day/decade, significant (q = 0.014).
• Aerosol: rising +0.038/decade, significant (q < 0.001).
• Maximum temperature: +0.12 °C/decade, not significant after FDR (q = 0.38).

EVIDENCE: STRONG overall · 3 of 4 significant · 2 strong, 1 moderate, 1 weak.
CAVEAT: MERRA-2 grid cell, not a weather station.

[ ASK HOLMES ] [ HOW SURE? ] [ COMPARE ]
```

The notes are deterministic templates over the computed results. They are instant, safe, and consistent with the chart. The LLM can rephrase them in the Holmes Brief, but the notes themselves are not invented.

When the Evidence Lens is active, the notes sort by evidence strength and add the evidence level next to each variable.

### 5.7 The agent integration

The agent can switch the lens and explain it:

| User question | Agent action |
|---|---|
| “Is Jakarta getting warmer?” | `openCityFile(jakarta, tab="brief")`, `setLens("effect")` |
| “How sure is that?” | `setLens("evidence")`, read the city notes, answer in the right panel |
| “Do the variables agree?” | `setLens("agreement")`, show the split ring |
| “Is the record long enough?” | `setLens("coverage")`, show the valid years |
| “Where is the evidence weak?” | `rankCities(..., lens="evidence")`, open the weakest city |

This is a natural follow-up chain: **what → how sure → do they agree → is the record enough**. It turns a one-shot answer into an inquiry.

### 5.8 The demo moment

1. Ask: “Is Jakarta getting warmer?”
2. The globe flies to Jakarta. The right panel opens the Holmes Brief. The answer is in the right, not in the chat.
3. The brief says: “Yes — +0.21 °C/decade, significant. Evidence is strong overall: 3 of 4 variables significant.”
4. Click **HOW SURE?** The globe switches from amber/blue to gray/cyan evidence colors. Jakarta is bright. Some cities are gray. The right panel notes re-sort by evidence.
5. Ask: “Where is the evidence weak?” The map highlights the weak cities. The agent opens the weakest one.
6. Close: “Most maps show you the trend. Holmes shows you how much to trust it.”

This is a 15-second differentiator that does not require a new dataset, a new model, or a new page.

## 6. Why this feature fits Holmes

- **It is map-native.** The globe is already the product’s signature. The feature changes what the map means, not what the app is.
- **It uses existing data.** `q`, `n`, `coverage`, `agreement`, and the slope are already in the result schema.
- **It fits the agent.** “How sure?” is a natural follow-up to any trend question. The agent can switch the lens and explain it.
- **It addresses two gaps at once.** Honest uncertainty on maps (gap 4) and statistical intuition (gap 2).
- **It is hard to copy in a hurry.** A competitor can add a p-value card; making uncertainty a coherent map mode with a legend, notes, and agent actions takes design work.
- **It avoids feature sprawl.** It is one control with four modes, not four new pages.

## 7. Feasibility

| Part | Effort | Notes |
|---|---|---|
| Result fields | **S** | Add `evidenceLevel`, `agreement`, `coverage` to the precomputed city result |
| Globe encoding | **M** | MapLibre data-driven paint; one circle layer, one ring layer, one legend |
| Key notes | **S** | Deterministic templates over existing results |
| Right-panel brief | **M** | Tabs, layout, actions; reuse the city file |
| Agent integration | **S–M** | One `setLens` tool, one `openCityFile` tool, prompt rule |
| Testing | **S** | Verify the evidence categories against known cases |

**MVP:** EFFECT + EVIDENCE modes. **Stretch:** AGREEMENT + COVERAGE. The first two are enough for the demo.

## 8. Risks and guardrails

| Risk | Mitigation |
|---|---|
| Users read “evidence” as “probability of truth” | Say “statistical evidence after FDR”; add a methods tooltip; never use “90% sure” |
| The color scale looks like a heatmap of truth | Use a sequential scale with explicit labels; keep the direction ring separate |
| The map becomes too busy | One lens at a time; the legend changes; hide the other encodings |
| The evidence rule is arbitrary | Publish the thresholds in the methods drawer; tune with the demo cases |
| The LLM overclaims | Key notes are deterministic; verification rejects unsupported numbers |
| The feature distracts from the main flow | Default to EFFECT; make EVIDENCE a one-click follow-up |

## 9. Runner-up feature: Cross-Examination

If the team wants a second differentiator, add a **Cross-Examination** card to the city file:

- Recompute the verdict across three start years, two seasons, and two methods.
- Show a small matrix: “significant in 7 of 9 variants; slope range +0.12 to +0.28.”
- Show the exact start year where the verdict flips.
- Let the user drag the start year and watch the verdict update.

This addresses the statistical-intuition gap. But it is a city-file feature, not a globe feature, and competitors such as Slope and Signal and TrendLens already have start-year sensitivity or a practice lab. The Evidence Lens is more distinctive on the map and cheaper to explain in a demo.

**Recommendation:** ship the Evidence Lens as the signature gap feature. Add Cross-Examination only if the core flow is finished and the team has spare time.

### 9.1 Where satellite Then & Now fits

A **Then & Now** satellite comparison is a strong supporting feature, not the gap feature. It makes the trend tangible and gives the demo a “show me” moment. But imagery is already common in the field (AtmoSpy, Terra Bangla, My Climate Story), so it does not close a unique gap. Add it after the core flow as the first supporting stretch. See [`07-satellite-then-now.md`](07-satellite-then-now.md).

## 10. Bottom line

The prior art has caught up on charts, variables, and statistical tests. The remaining map-native gap is **honest uncertainty**. Holmes can close it with one control:

> **EFFECT → EVIDENCE → AGREEMENT → COVERAGE**

That is the feature to build if the team wants a differentiator that is visible in a screenshot, explainable in one sentence, and grounded in the data Holmes already has.
