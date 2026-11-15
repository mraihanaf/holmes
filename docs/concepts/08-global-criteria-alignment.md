# 08 — Global criteria alignment

**Status:** reviewed 2026-11-14 against the Jakarta technical meeting and the official Space Apps global judging requirements.
**Verdict:** the concept matches the challenge and is strong on Creativity, Relevance, and Presentation. Validity is strong but has one gap: method sensitivity. It is **not yet submission-ready** because of global eligibility, method sensitivity, impact distribution, and packaging gaps. The idea is competitive; the fixes are concrete.

## 1. Official challenge fit

The concept is built for the official challenge **“Be an Earth System Trend Detective!”**, not “Create Your Own Challenge.” That matters: “Create Your Own Challenge” projects are not eligible for Global Judging.

The challenge asks the user to:

| Challenge step | Holmes response | Status |
|---|---|---|
| Identify a variable | Variable filter with plain-language names, units, and coverage | **Pass** |
| Acquire data for a region | Globe city board, city file, selected region, NASA POWER point/cell data | **Pass** |
| Visualize a time series | City file chart with raw/monthly, deseasonalized, annual, trend line, CI | **Pass** |
| Test significance | Seasonal Mann–Kendall + Sen slope + FDR; evidence badges | **Pass** |
| Remove regular cycles | Seasonal Mann–Kendall / seasonal aggregation | **Pass** |
| Explain what changed, where, how much | Holmes Brief, key notes, city file, Evidence Lens | **Pass** |

The extra features — globe, agent, key notes, Evidence Lens, Then & Now, FIRMS — are enhancements. They do not replace the four required steps, but they can obscure them if the demo is not disciplined. The city file should show a visible **challenge trace**:

```text
VARIABLE → REGION → TIME SERIES → SIGNIFICANCE
T2M      → Jakarta → 2001–2025    → p < 0.001
```

## 2. Global eligibility checklist

The technical meeting lists eight requirements for advancing to global judging. These are pass/fail gates, not judging criteria.

| # | Requirement | Concept status | Action |
|---|---|---|---|
| 01 | Respond to one official Space Apps 2026 challenge; not “Create Your Own Challenge” | **Pass** — “Be an Earth System Trend Detective!” | State the challenge name on the project page and slide 2 |
| 02 | All team members registered and identified on the Project Page; no new members after submission | **Process** | Register every member before submission |
| 03 | Complete all required fields on the project submission page | **Action** | Use the checklist in section 6 |
| 04 | Use English on the project page and linked materials; no profanity | **Pass** — docs and UI are English | Add English captions to the video |
| 05 | Submit before the deadline | **Process** | Deadline 15 Nov 2026, 23:59 WIB; submit early |
| 06 | Adhere to the Space Apps Participant Terms and Conditions | **Process** | Read and check |
| 07 | Check “I have read and understand the program's submission requirements…” | **Process** | Check the box |
| 08 | Check “I confirm that the submitted project represents my team’s original work and that all external resources… are listed in the References field…” | **Process** | Build the references list before submission |

### 2.1 The NASA resource requirement

The rule is explicit: **“At least one NASA resource from the Challenge is required for global awards!”**

This is the concept’s biggest eligibility risk.

- The live city board uses **NASA POWER**. POWER is a NASA service, but it is not on the challenge’s Resources tab.
- **NASA GIBS** and **NASA FIRMS** are also not the listed Resources-tab resources.
- The concept includes a **MODIS AOD** starter case (Wisconsin), but the existing CSV in `docs/problems/assets/modis_aod/` was fetched from **LAADS**, which is not the listed Resources-tab resource. The case is the right idea, but the export path must change for eligibility.
- **Giovanni** and **AppEEARS** are listed Resources-tab tools. Use **Giovanni** for the MODIS AOD case, or **AppEEARS** for an NDVI/LST case. Cite that export. Keep the LAADS CSV as a cross-check, not the eligibility path.

**Fix:** make a listed-resource starter case first-class and visible in the submission:

- Add a `RESOURCE: MODIS / GIOVANNI` badge to the Wisconsin case, or a `RESOURCE: APPEEARS` badge to an NDVI/LST case.
- Show the case in the 7-slide deck and on the project page.
- Cite the exact product, version, and export date: MODIS AOD (e.g., MOD08_M3/MYD08_M3) exported via **Giovanni** (listed), accessed 2026-11-14. The LAADS CSV is a cross-check, not the eligibility path. For a land case, use **AppEEARS** for NDVI/LST.
- Keep NASA POWER as the live board source, but do not rely on it alone for eligibility.

If the team wants a single safer path: make the **Wisconsin AOD case the first demo case**, then show Jakarta. The official video example is Wisconsin AOD; that also aligns the story with the challenge.

### 2.2 Demo format

The rule: choose **one** —

- a **7-slide presentation** (title slide counts), or
- a **30-second video**.

Public link, no login, test in a private browser window. The current concept has a 45–60 second demo script. That is useful for the live pitch, but the official submission needs a 30-second cut and/or a 7-slide deck.

**Fix:** produce both. The 7-slide deck is the safest submission; the 30-second video is the stronger demo if it is well produced. See sections 7 and 8.

### 2.3 AI disclosure

The rules permit LLMs, chatbots, image/video generation, and coding assistants, but require disclosure of where and how they were used. Generated images/videos need a visible watermark; generated code/data need acknowledgment in text and metadata. NASA branding is not allowed in generated content.

**Concept exposure:** the Holmes agent is an LLM-assisted tool. That is allowed, but it must be disclosed.

**Fix:** add an AI disclosure block to the project page:

> Holmes uses a large language model for intent parsing, tool selection, and phrasing the Holmes Brief. All numbers, slopes, p-values, and evidence levels are computed deterministically by the stats engine. The LLM cannot invent numbers; a verification step rejects unsupported values. No NASA branding is used in generated content. Any AI-generated demo asset is watermarked.

Also disclose coding assistants if used.

### 2.4 Citations and originality

The rule: cite every source, including open-source code, text, and images. NASA can remove awards for violations.

**Concept exposure:** the concept uses NASA POWER, MODIS/Giovanni, GIBS, FIRMS, MapLibre, CARTO, OpenStreetMap, Osiris (MIT), fonts, icons, and an LLM provider.

**Fix:** build a references table with:

- Dataset/product name, version, access date, URL.
- Code/library name, license, URL.
- Image/imagery source, date, attribution.
- AI tools used and where.
- Permission/usage notes.

Do not copy Osiris code or assets without its MIT notice. Do not use NASA logos or mission identifiers as branding.

## 3. Judging criteria matrix

| Criterion | What judges ask | Concept evidence | Assessment | Gap / fix |
|---|---|---|---|---|
| **Impact** | Does it solve a big problem? Will it inspire or help many? | Local Jakarta story, global city board, students/journalists, shareable case card, agent | **Medium-high** | No explicit distribution or classroom plan; add a case-card export and teacher notes; show a user story |
| **Creativity** | Is it novel, or an incremental improvement? | Question-to-globe loop, right-panel Holmes Brief, auto key notes, Evidence Lens, Then & Now + FIRMS | **High** | “Another dashboard” perception; lead with the Evidence Lens, not the globe |
| **Validity** | Is it scientifically valid? Will it work in the real world? | Seasonal MK + Sen + FDR, significance rings, grid-cell caveat, provenance, non-significant case | **High, with one gap** | Method sensitivity: add OLS HAC cross-check and a “method-dependent” badge; validate against SciPy/pymannkendall |
| **Relevance** | Does it answer the challenge? Is it complete and usable? | Variable → region → series → significance; 48h MVP; city file; share URL | **High** | Show the challenge trace visibly; make the MODIS/Giovanni case first-class; avoid feature sprawl |
| **Presentation** | Did the team tell the story well? | Osiris HUD, tagline, demo script, strong visuals | **High** | Official format is 30s video or 7 slides; current script is 60s; add English captions and a tight deck |

### 3.1 Impact

The concept has a clear local story (Jakarta) and a global board. It can inspire students and help journalists or local planners. But the docs do not yet show a distribution plan or a user validation story.

**Low-cost fixes:**

- A shareable **case card** (PNG/URL) that a teacher or journalist can send.
- A short **teacher notes** page for the Jakarta and Wisconsin cases.
- A one-slide impact story: “A student in Jakarta asks a question; a teacher shares the case; a journalist checks the evidence.”
- Do not build a full classroom mode. The prior-art research says classroom distribution is already well covered by other entries; a case card and teacher notes are enough.

### 3.2 Creativity

The strongest creative assets are:

1. **Question-to-globe loop** — ask, watch the board answer.
2. **Right-panel Holmes Brief** — the answer is evidence, not chat text.
3. **Auto key notes** — a city summary without an LLM call.
4. **Evidence Lens** — the map shows how sure, not just which direction.
5. **Then & Now + FIRMS** — the visual and the live fire context.

The risk is that judges see “globe + AI chat + dashboard” and file it as another dashboard. The deck and demo must lead with the **inquiry loop** and the **Evidence Lens**, not the feature list.

### 3.3 Validity

The concept is scientifically careful: seasonal handling, Sen slope, FDR, significance rings, grid-cell caveat, data provenance, non-significant cases. That is above the table stakes.

The remaining Validity gap is **method sensitivity**. The research found:

- Wisconsin AOD is method-dependent: OLS p=0.056, HAC p=0.128, Seasonal MK p=0.0015, Sen p<0.05.
- Autocorrelation inflates false positives in both OLS and MK if not corrected.
- The strongest entries show a second-opinion test or a robustness table.

**Fix:** add a **method cross-check** to the city file:

```text
METHOD CHECK
OLS HAC p = 0.128   Seasonal MK p = 0.0015   Sen p < 0.05
Verdict: METHOD-DEPENDENT — show both, do not overclaim.
```

This also strengthens the Evidence Lens: “evidence strength” should account for method disagreement, not just one p-value.

**Implementation:** compute OLS with HAC (Newey–West, 12 lags) on the deseasonalized monthly series, plus Seasonal MK/Sen. If the two disagree at the 5% level, set `methodDependent = true` and show a badge. The headline uses the more conservative verdict unless the user opens the methods drawer.

### 3.4 Relevance

The concept directly answers the challenge. But the globe, agent, and satellite could make it look like a general platform rather than a complete challenge solution. The fix is presentation discipline:

- A visible **challenge trace**: `VARIABLE → REGION → SERIES → SIGNIFICANCE`.
- The city file chart is always one click away.
- The 7-slide deck explicitly maps each challenge step to a screen.
- The 48-hour MVP is clearly scoped; the stretch features are labeled as such.

### 3.5 Presentation

The visual identity is strong. The official format is the gap:

- 7 slides, title counts.
- Or a 30-second video with the official beat structure.
- English captions.
- One public demo link, no login.
- Test in a private browser window.

The current 60-second script is a live-pitch script, not the official demo. Cut it to 30 seconds or use the 7-slide deck.

## 4. What already matches

- Official challenge, not “Create Your Own Challenge.”
- Variable → region → time series → significance.
- NASA data with provenance.
- Statistical significance, uncertainty, and caveats.
- A non-significant case.
- A local Jakarta story and a global comparison.
- A clear visual identity and narrative.
- A 48-hour MVP plan with a solution blueprint.

## 5. Gaps and fixes, prioritized

### P0 — must fix before submission

1. **Resources-tab NASA resource.** Make the MODIS/Giovanni Wisconsin case first-class; cite product, version, export date; show it in the deck and project page.
2. **Official demo format.** Produce a 7-slide deck and a 30-second video cut; test the public link in incognito.
3. **AI disclosure and citations.** Add the AI disclosure block and a complete references table.
4. **Eligibility boxes and team registration.** Process checklist; no new members after submission.

### P1 — strengthens Validity and Impact

5. **Method cross-check.** Add OLS HAC + Seasonal MK; show `METHOD-DEPENDENT` when they disagree.
6. **Challenge trace.** Show `VARIABLE → REGION → SERIES → SIGNIFICANCE` in the city file and deck.
7. **Case card + teacher notes.** A low-cost distribution artifact for Impact.
8. **Non-significant and method-dependent cases.** Keep Wisconsin T2M/AOD in the deck.

### P2 — presentation polish

9. **No NASA branding.** Use “Data: NASA POWER / MODIS / GIBS / FIRMS” text attribution; no NASA logo, flag, or mission identifier as product branding.
10. **English captions** on the video.
11. **One public demo link**, no login.
12. **Submission deadline buffer.** Submit at least 4 hours early.

## 6. Project submission page checklist

Required fields:

- [ ] Project name: **Holmes — Earth System Trend Detective** (working title).
- [ ] High-level summary, 50–200 words.
- [ ] One demo link: 7-slide deck or 30-second video; public, no login.
- [ ] Project details: what it does, how it works, benefits, goals, tools/languages.
- [ ] NASA data used and how.
- [ ] Space Agency Partner data (optional; Meteomatics if used).
- [ ] References: every dataset, library, image, font, icon, and AI tool.
- [ ] AI disclosure.
- [ ] Team members registered and listed.
- [ ] Terms and Conditions, submission requirements, originality/references boxes checked.
- [ ] English on the page and linked materials.
- [ ] No profanity or inappropriate language.
- [ ] No NASA branding in generated content.

### Draft summary (50–200 words)

> Holmes is an Earth-system trend detective. Ask a question about a city — “Is Jakarta getting warmer?” — and Holmes turns it into a reproducible NASA data investigation. The globe colors cities by the selected trend; the right-panel Holmes Brief gives the answer, the key notes, and the evidence; the city file shows the time series, slope, confidence interval, and significance. An Evidence Lens switches the same map from “what is changing?” to “how strong is the evidence?”, making uncertainty visible instead of hiding it in a p-value. A satellite Then & Now view compares the start and end of the timeline in true and false color. NASA FIRMS adds active-fire detections and map notices. Holmes is built for students, teachers, journalists, and curious citizens who want a straight answer with inspectable evidence — not another dashboard.

### NASA data used

- **NASA POWER / MERRA-2 / CERES** — city temperature, precipitation, soil wetness, aerosol, wind, radiation.
- **MODIS AOD exported via Giovanni** — official-style Wisconsin AOD case; listed Resources-tab resource. AppEEARS NDVI/LST is an optional second listed case. The existing LAADS CSV is a cross-check.
- **NASA GIBS** — MODIS/VIIRS true-color and false-color imagery for Then & Now.
- **NASA FIRMS** — near-real-time active-fire detections.
- **MODIS/ORNL DAAC** — optional precomputed NDVI/LST case.

## 7. 7-slide deck outline

| Slide | Content | Criterion |
|---|---|---|
| **1. Title** | Holmes — Earth System Trend Detective. “Ask the planet a question.” One strong screenshot of the globe + right-panel brief. | Presentation |
| **2. Challenge** | The official challenge: variable → region → time series → significance. Why it is hard: too many variables, hidden uncertainty, generic dashboards. | Relevance |
| **3. Solution** | The question-to-globe loop: ask → right-panel brief → city file → Evidence Lens. Show Jakarta. | Creativity |
| **4. How it works** | NASA POWER + MODIS/Giovanni + GIBS + FIRMS; Seasonal MK/Sen + OLS HAC; FDR; provenance. Show the challenge trace. | Validity |
| **5. Wow** | Evidence Lens (“how sure?”), Then & Now true/false color, FIRMS fire notice. | Creativity / Impact |
| **6. Validity** | FDR, method cross-check, non-significant case, grid-cell caveat, “not a probability of truth.” | Validity |
| **7. Impact & links** | Students, teachers, journalists, local planners; case card/teacher notes; repo, demo, references. | Impact / Presentation |

The title slide counts. Keep text large enough to read on a projector. Use screenshots, not live demos, in the deck.

## 8. 30-second video script

The official structure is: introduce yourself/challenge (0:00–0:02), solution and problem (0:02–0:10), idea and NASA data (0:10–0:20), future (0:20–0:30).

| Time | Visual | Voice / text |
|---|---|---|
| 0:00–0:02 | Team name + globe | “We’re [team]. We built Holmes for the Earth System Trend Detective challenge.” |
| 0:02–0:06 | Title + tagline | “Ask the planet a question. Holmes turns it into evidence.” |
| 0:06–0:10 | Type “Is Jakarta getting warmer?” | “No forms. Just a question.” |
| 0:10–0:16 | Globe flies; right-panel brief | “+0.21 °C per decade, significant, 25 years of NASA data.” |
| 0:16–0:21 | Evidence Lens | “Most maps show the trend. Holmes shows how much to trust it.” |
| 0:21–0:26 | Then & Now + fire notice | “See what changed, and where it is burning now.” |
| 0:26–0:30 | Wordmark + links | “Holmes. Evidence, not guesses.” |

Add English captions. If the video is in another language, provide English subtitles. Do not use NASA branding in generated visuals.

## 9. Bottom line

The concept matches the **spirit and most criteria** of the global challenge. It is strongest on Creativity and Validity, and it has a clear Relevance story. The main risks are **global eligibility** (listed NASA resource), **method sensitivity**, **impact distribution**, and **official demo packaging**.

Fix the P0 items first:

1. Make the MODIS/Giovanni case first-class.
2. Produce the 7-slide deck and 30-second video.
3. Add AI disclosure and citations.
4. Complete the eligibility and team checklist.

Then fix the P1 items:

5. Add the OLS HAC cross-check.
6. Add the challenge trace.
7. Add a case card and teacher notes.

With those fixes, Holmes is not just aligned with the global criteria — it has a credible story for each one.
