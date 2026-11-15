# Detecting and testing trends in Earth science time series

**A practical guide for the NASA Space Apps 2026 challenge "Be an Earth System Trend Detective!"**

> **What this is.** A working guide to choosing a trend test, running it in Python, removing seasonality, handling missing data, and communicating the result honestly. It is written for a 48-hour hackathon team with mixed statistics and coding experience.
>
> **What it is not.** A statistics textbook. It gives the formulas and assumptions you need to defend the app to judges, not a full derivation.
>
> **Tested.** All statistical functions and the xarray/plotting snippets were run on Python 3.11.17 with numpy 2.4.6, pandas 3.1.1, scipy 1.17.1, statsmodels 0.15.0, xarray 2026.9.0, pymannkendall 1.4.3, and matplotlib 3.11.2. Older versions mostly work; differences are flagged. Raw API checks are in `_raw/trend-notes.md`.

---

## 0. The short version

### Ten rules for the app

1. **Plot the data first.** A test cannot tell you whether a line is an appropriate summary.
2. **Remove the seasonal cycle before testing a long-term trend**, or use a method that compares the same months across years.
3. **Report five things together:** slope with units, 95% confidence interval, p-value and test name, number of observations, and the period covered.
4. **p < 0.05 is a convention, not proof.** Report the exact p-value and the effect size.
5. **"Not significant" does not mean "no trend."** With a short or noisy record, the test may simply lack power.
6. **Autocorrelation makes p-values too optimistic.** Use HAC standard errors, a corrected Mann–Kendall test, or a block bootstrap.
7. **Use Sen's slope + Mann–Kendall when the data are skewed or have outliers.** Use OLS when the data are clean and roughly linear.
8. **For maps, correct for multiple testing** (Benjamini–Hochberg FDR) and show the effect size, not only a p-value mask.
9. **Regional sign flips are the story, not a nuisance.** A global or regional mean can hide opposite changes.
10. **Pick one primary method in advance.** Show the alternatives as a sensitivity check; do not fish for a method that gives p < 0.05.

### Choose a method in one table

| Situation | Primary test | Trend magnitude | Notes |
|---|---|---|---|
| Monthly data, clear seasonal cycle, roughly linear | OLS on monthly anomalies, HAC standard errors | OLS slope + 95% CI | Default for the app |
| Monthly data, want a non-parametric test | Seasonal Mann–Kendall | Seasonal Sen slope | Needs ≥ 10 years |
| Annual data, clean, roughly linear | OLS + HAC (1–3 lags) | OLS slope + 95% CI | Easiest to explain |
| Annual data, outliers or skew | Sen slope + Mann–Kendall | Sen slope + Sen CI | Robust |
| Short series (< 10–20 points) | Report slope + CI; MK only as a rough check | Sen slope | Low power; do not overclaim |
| Many pixels / grid | Vectorized OLS + FDR | Slope map | Sen/MK only for sampled points |
| Suspected step change | Pettitt or BEAST | Piecewise means/trends | A single line is misleading |

---

## 1. Core concepts in plain language

### 1.1 Trend versus variability

A **trend** is a sustained change in the typical value of a variable over a chosen period. **Variability** is everything else: the seasonal cycle, year-to-year swings, weather, El Niño, volcanic eruptions, and measurement noise.

```
value
  │        seasonal cycle
  │      /\      /\      /\
  │     /  \    /  \    /  \        <- variability
  │    /    \  /    \  /    \
  │   /      \/      \/      \
  │  ..........................    <- long-term trend (slowly rising)
  └──────────────────────────────── time
```

Three consequences:

- A trend is a property of a **window**, not of the variable forever. Always say "over 2002–2025," not "is increasing."
- A difference between two points is **not** a trend. "2024 was hotter than 2000" is a two-point comparison; it could be variability.
- A trend can be **linear, curved, stepped, or reversing**. Start with a linear trend because it is easy to explain and test. If the line is obviously wrong, say so and use a change-point or smoothed trend.

**For the app:** show the raw series and the fitted line. Let the user see whether a line is a fair summary. A high p-value from a bad model is not evidence about the real world.

### 1.2 Linear trend, slope, and rate of change

The simple linear model is

\[
y_t = a + b\,t + e_t
\]

where \(y_t\) is the variable at time \(t\), \(a\) is the intercept, \(b\) is the slope, and \(e_t\) is the residual (what the line does not explain).

- **Slope \(b\)** is the rate of change. Its units are "units of \(y\) per unit of \(t\)."
- If \(t\) is in years, \(b\) is per year. If \(t\) is in months, \(b\) is per month.
- **Per decade** is usually easier to read: \(b_{\text{decade}} = 10\,b_{\text{year}}\).
- For monthly data with \(t\) in months: \(b_{\text{year}} = 12\,b_{\text{month}}\), and \(b_{\text{decade}} = 120\,b_{\text{month}}\).
- The intercept \(a\) is the value at \(t=0\). It is rarely meaningful; do not interpret it as "the baseline" unless \(t=0\) is a real baseline year.

A linear trend is a **local approximation**. Many Earth system changes are not linear: they accelerate, saturate, or reverse. A straight line can still be a useful summary over a 20–30 year window, but it is not a prediction.

### 1.3 Significance and the p-value

The null hypothesis for a trend test is usually:

- \(H_0\): the slope is zero (no trend).
- \(H_1\): the slope is not zero (two-sided test).

The **p-value** answers:

> If there were no trend, and the model assumptions were true, how often would random sampling produce a slope at least as far from zero as the one I observed?

So a p-value of 0.03 means: under the no-trend model, about 3% of repeated samples would produce a slope this extreme. It does **not** mean:

- "There is a 97% chance the trend is real."
- "There is a 3% chance the result is due to luck."
- "The trend is large or important."
- "The null hypothesis is true or false with some probability."

The 0.05 threshold is a **convention**, not a law of nature. Report the exact p-value (e.g., `p = 0.03`, `p = 0.12`, `p < 0.001`) and the effect size.

Two failure modes:

- **Large n:** a tiny, practically irrelevant slope can be "significant." With 1,000 monthly points, a change of 0.0001 per decade may have p < 0.001.
- **Small n:** a large, important slope can be "not significant." A 10-year record with noisy data has low power.

### 1.4 Confidence intervals

A **95% confidence interval** for the slope is a range of values that are compatible with the data. For OLS:

\[
b \pm t_{0.975,\,n-2}\,\mathrm{SE}(b)
\]

Interpretation, carefully:

- Correct: "The data are consistent with a change between 0.08 and 0.31 °C per decade."
- Also correct in repeated-sampling language: "If we repeated the whole study many times, about 95% of intervals constructed this way would contain the true slope."
- Avoid: "There is a 95% probability that the true slope is in this interval." A single interval either contains it or not; the 95% refers to the procedure.

The CI is more useful than the p-value because it shows **how much** change is plausible. A p-value of 0.06 with a CI from −0.1 to +0.5 tells a different story from p = 0.06 with a CI from −0.001 to +0.002. Report the CI.

If a two-sided 95% CI excludes zero, the two-sided test at α = 0.05 rejects zero. The two are equivalent for the OLS t-test.

### 1.5 Statistical power: why short series fail

**Power** is the probability of getting p < 0.05 if a trend of a given size is really there.

Power depends on:

- the size of the trend (larger is easier),
- the noise (smaller is easier),
- the number of observations (more is easier),
- autocorrelation (positive autocorrelation reduces effective information),
- the significance threshold (0.05 vs 0.01),
- the test (OLS vs Sen+MK have different power).

A simulation with Gaussian noise (SD = 1), annual data, and a two-sided OLS test at α = 0.05 gives:

| n | trend 0.05 SD/yr | trend 0.10 SD/yr | trend 0.20 SD/yr |
|---|---|---|---|
| 10 | 7% | 13% | 36% |
| 20 | 22% | 67% | 100% |
| 30 | 64% | 100% | 100% |
| 50 | 100% | 100% | 100% |
| 100 | 100% | 100% | 100% |

Read the table like this: with 20 annual points and noise SD = 1, a trend of 0.10 SD per year has about a 67% chance of being detected. A trend of 0.05 SD per year has only about a 22% chance. "Not significant" is often "not enough data."

A useful rule of thumb for evenly spaced annual data:

\[
\text{minimum detectable trend} \approx \frac{2.8\,s}{n^{3/2}/\sqrt{12}}
= \frac{2.8\,s\sqrt{12}}{n^{3/2}}
\]

where \(s\) is the residual standard deviation. This is approximate; use it to sanity-check expectations, not to replace a power calculation.

**For the app:** if the record is shorter than about 10 years of monthly data (or 10 annual points), show a warning: "Short record: the test may miss a real trend." Do not hide the slope just because p > 0.05.

### 1.6 Seasonality

A **seasonal cycle** is a repeating pattern within the year. It can be much larger than the long-term trend:

- AOD over Wisconsin: summer mean around 0.3, winter around 0.1, amplitude ~0.2. A decadal trend of 0.01 is 20× smaller than the seasonal swing.
- CO₂ at Mauna Loa: seasonal amplitude ~3 ppm; long-term rise ~2.5 ppm/year.
- NDVI: summer green-up can change NDVI by 0.3–0.5; a decadal trend may be 0.01–0.05.

Seasonality causes three problems:

1. **It masks the trend.** The regression residual variance is dominated by the seasonal cycle, so the standard error of the slope is large and power is low. In the team's Wisconsin AOD sample, the raw monthly OLS p-value is 0.33; after removing the seasonal cycle, the same slope has p = 0.056. The slope barely changes; the uncertainty shrinks.
2. **It can bias the slope** if the record covers a non-integer number of cycles, has missing months, or if the seasonal cycle itself changes over time (e.g., earlier spring).
3. **It invalidates the independence assumption** of OLS and Mann–Kendall. Monthly values are not exchangeable: January is not a random draw from the same distribution as July.

Do not confuse "summer is hot" with "the climate is warming." Remove the cycle or use a seasonal test.

### 1.7 Autocorrelation

**Autocorrelation** (serial correlation) means nearby values are more similar than random. Positive autocorrelation is common in Earth data: a wet year tends to be followed by another wet year; a warm month by another warm month; a satellite retrieval error persists for several months.

The effective sample size for a simple AR(1) process with lag-1 correlation \(\rho\) is approximately

\[
n_{\text{eff}} \approx n\,\frac{1-\rho}{1+\rho}
\]

For \(\rho = 0.6\), \(n_{\text{eff}} \approx 0.25n\): 100 monthly values carry about as much independent information as 25.

Consequences:

- OLS standard errors are too small.
- p-values are too small; confidence intervals are too narrow.
- Mann–Kendall is **not** immune: its variance formula also assumes independent observations.

A simulation with 40 annual values, AR(1) noise, and no trend, nominal α = 0.05:

| AR(1) \(\rho\) | OLS false-positive rate | Mann–Kendall false-positive rate |
|---|---|---|
| 0.0 | 4.6% | 4.1% |
| 0.3 | 14.4% | 14.0% |
| 0.6 | 31.5% | 29.7% |
| 0.8 | 47.5% | 44.8% |

This is the single most important statistical trap in the challenge. If the app ignores autocorrelation, it will label too many series as significant.

Fixes, from easiest to most rigorous:

1. **HAC (Newey–West) standard errors** in OLS. One line in statsmodels.
2. **Hamed–Rao modified Mann–Kendall**, which adjusts the MK variance for autocorrelation.
3. **Trend-free prewhitening** before MK (removes AR(1), then adds the trend back).
4. **Block bootstrap** confidence intervals: resample blocks of consecutive years, not individual points.
5. **Annual aggregation** reduces month-to-month autocorrelation, though year-to-year correlation remains.

### 1.8 Short series

Short records are common in satellite data: MODIS starts in 2000, Sentinel-5P in 2018, SWOT in 2022. A 10-year monthly series has 120 points, but only ~10 years of independent information. Problems:

- Wide confidence intervals.
- Slope sensitive to the endpoints and to one or two extreme years.
- Normal-approximation p-values (including pymannkendall's) are rough for n < 10.
- A linear trend over 10 years may be a short-term fluctuation, not a climate trend.

Practical minimums:

- **Annual data:** at least 10 points; 20–30 is better.
- **Monthly data:** at least 10 years (120 months); 20+ years is better.
- **Trend maps:** require a minimum number of valid years per pixel (e.g., 15 of 25) and show a data-coverage map.

The challenge video says a trend is interesting even if it is not significant. Agree with that in the UI: show the slope and CI, then explain that a longer record may be needed.

### 1.9 Regional sign flips and multiple testing

The challenge emphasizes that the same variable can trend up in one region and down in another. Three implications:

1. **A global or regional mean can hide opposite trends.** Always offer a map or a multi-region comparison. Report the fraction of area with increasing/decreasing trends, not only the mean.
2. **Do not cherry-pick the steepest pixel.** If the user can draw any region, some regions will show large trends by chance. Report the region definition and the number of regions tested.
3. **Pixel-wise p-values are not independent.** Neighboring pixels are spatially correlated, and testing 10,000 pixels at α = 0.05 produces about 500 false positives under the null. Use Benjamini–Hochberg FDR to control the false discovery rate, and consider a field-significance test for the map as a whole.

A simple, defensible approach for a hackathon:

- Compute the slope and p-value for every pixel.
- Apply BH FDR at q = 0.05.
- Stipple only pixels that pass FDR.
- Report the percentage of valid area with significant increase/decrease.
- Mask pixels with insufficient data in grey.
- Do not claim "the whole region is greening/desertifying" from a few significant pixels.

### 1.10 Effect size: statistical versus practical significance

A p-value tells you whether a change is detectable. **Effect size** tells you whether it matters. Report at least one:

- **Slope:** `+0.12 °C per decade`.
- **Total change over the record:** `+0.30 °C over 2002–2025`.
- **Percent change relative to a baseline mean:** `+8% over the period`.
- **Standardized trend:** `slope × duration / SD of the detrended series`. This is like Cohen's d for trends; it lets you compare a temperature trend with an NDVI trend.

Cautions:

- Percent change is misleading when the baseline mean is near zero or negative (temperature anomalies, net radiation).
- A "significant" slope of 0.001 NDVI/decade may be scientifically trivial.
- A "non-significant" slope of 0.5 °C/decade may be important but poorly measured.
- Always give units and the time denominator (per year or per decade).

### 1.11 Plain-language translations

| Statistic | Say this | Do not say this |
|---|---|---|
| p = 0.03 | "If there were no trend, a result this strong would happen about 3% of the time." | "There is a 97% chance the trend is real." |
| 95% CI [0.08, 0.31] | "The data are consistent with a change between 0.08 and 0.31 per decade." | "95% chance the true value is in this range." |
| p = 0.12 | "No trend was detected at this record length; the data cannot rule out a small change." | "There is no trend." / "The region is stable." |
| p < 0.001 | "The estimated change is unlikely under a no-trend model." | "The trend is proven." |
| Slope +0.2/decade | "About +0.2 units per decade, or +0.5 units over the 25-year record." | "The trend is 0.2." |

---

## 2. Methods, formulas, and when to use them

### 2.1 Method selection

| Method | What it tests | Trend shape | Outliers | Seasonality | Autocorrelation | Magnitude | Best for |
|---|---|---|---|---|---|---|---|
| OLS slope + t-test | slope = 0 | linear | sensitive | must remove | must correct | OLS slope, CI | clean, roughly linear series |
| Sen's slope | (no p by itself) | monotonic | robust | use seasonal Sen | CI needs bootstrap | median pairwise slope | skewed/outlier-prone data |
| Mann–Kendall | monotonic trend | monotonic | robust | use Seasonal MK | must correct | Sen slope | non-normal data, ordinal checks |
| Seasonal MK | monotonic trend within seasons | monotonic | robust | handles | must correct | seasonal Sen slope | monthly data with strong cycle |
| Pearson r | linear association | linear | sensitive | must remove | must correct | r, r² | communication/screening |
| Spearman ρ | monotonic association | monotonic | robust | must remove | must correct | ρ | quick robust check |
| Pettitt | step change | step | robust | remove first | less critical | change point + means | regime shifts |
| BEAST / PELT | change points | piecewise | varies | model | model | segment trends | complex breaks |

**Default for the app:** OLS on a deseasonalized monthly series with HAC standard errors, plus Sen + Seasonal MK as a sensitivity check. This gives a slope, a confidence interval, a p-value, and a robustness check.

### 2.2 Ordinary least squares (OLS) slope and t-test

**Model:** \(y_t = a + b t + e_t\).

**Slope:**

\[
\hat b = \frac{\sum_i (t_i-\bar t)(y_i-\bar y)}{\sum_i (t_i-\bar t)^2}
\]

**Intercept:** \(\hat a = \bar y - \hat b \bar t\).

**Residual standard error:**

\[
s^2 = \frac{1}{n-2}\sum_i (y_i-\hat a-\hat b t_i)^2
\]

**Standard error of the slope:**

\[
\mathrm{SE}(\hat b) = \frac{s}{\sqrt{\sum_i (t_i-\bar t)^2}}
\]

**Test statistic:** \(t = \hat b / \mathrm{SE}(\hat b)\), with \(n-2\) degrees of freedom under the null.

**95% CI:** \(\hat b \pm t_{0.975,\,n-2}\,\mathrm{SE}(\hat b)\).

**R²:** \(1 - \mathrm{SSE}/\mathrm{SST}\). It is the fraction of variance explained by the line. In noisy Earth data, R² = 0.05 can still come with a highly significant slope; R² is not a trend test.

**Assumptions:**

- The relationship is linear over the window.
- Errors are independent (no autocorrelation).
- Errors have constant variance (homoscedasticity).
- Errors are approximately normal for the t-test in small samples.
- No single point dominates the fit.
- Time is measured without error (dates are exact).

**Diagnostics worth doing in a hackathon:**

- Plot residuals versus time; look for curvature, fans, and outliers.
- Plot residuals versus fitted values; look for changing variance.
- Compute the lag-1 autocorrelation of residuals; if |ρ| > 0.2, use HAC.
- Check Cook's distance or simply refit without the largest residual; does the slope change sign?

**Interpretation:** "The OLS slope is +0.12 °C/decade (95% CI +0.05 to +0.19, p = 0.002, n = 300 months)." That is a complete sentence.

**Pitfall:** `scipy.stats.linregress` with NaNs returns all NaNs silently (with the default `nan_policy="propagate"`). Drop NaNs or use `nan_policy="omit"` (newer scipy).

### 2.3 Sen's slope (Theil–Sen estimator)

**Definition:**

\[
\hat b_{\text{Sen}} = \operatorname{median}\left\{ \frac{y_j-y_i}{t_j-t_i} : i<j \right\}
\]

It is the median of all pairwise slopes. With \(n\) points there are \(n(n-1)/2\) slopes; the median is robust to outliers.

**Properties:**

- Robust to outliers and non-normal errors; breakdown point about 29%.
- Does not assume normality.
- Still assumes a monotonic, roughly linear trend.
- The confidence interval assumes independent errors; for autocorrelated data use a block bootstrap.
- Sen's slope has no p-value by itself. Pair it with Mann–Kendall.

**Seasonal Sen:** compute the Sen slope separately within each calendar month (using the same month across years), then take the median of the 12 slopes. This is what `pymannkendall.seasonal_test` does internally; its slope is per **year** for monthly data, unlike `original_test` which is per **sample step**.

**Interpretation:** "The median pairwise slope is −0.010 AOD/decade (Sen 95% CI −0.017 to −0.003)." Do not add a p-value from OLS to a Sen slope; use MK.

**When to prefer Sen over OLS:** skewed variables (precipitation, streamflow, chlorophyll), outliers (volcanic eruptions, sensor glitches), small samples, or when the residuals are clearly non-normal.

### 2.4 Mann–Kendall (MK)

**Hypotheses:**

- \(H_0\): no monotonic trend; the data are exchangeable over time.
- \(H_1\): a monotonic increasing or decreasing trend (two-sided).

**Statistic:**

\[
S = \sum_{i<j} \operatorname{sgn}(y_j-y_i)
\]

where \(\operatorname{sgn}(z)=+1\) if \(z>0\), \(-1\) if \(z<0\), and \(0\) if \(z=0\).

**Variance with ties:**

\[
\operatorname{Var}(S) = \frac{n(n-1)(2n+5) - \sum_p t_p(t_p-1)(2t_p+5)}{18}
\]

where \(t_p\) is the number of observations tied at value \(p\).

**Normal score with continuity correction:**

\[
Z =
\begin{cases}
(S-1)/\sqrt{\operatorname{Var}(S)}, & S>0 \\
0, & S=0 \\
(S+1)/\sqrt{\operatorname{Var}(S)}, & S<0
\end{cases}
\]

**Two-sided p-value:** \(p = 2(1-\Phi(|Z|))\), where \(\Phi\) is the standard normal CDF.

**Kendall's tau:** \(\tau = S / [n(n-1)/2]\).

**Assumptions and pitfalls:**

- Non-parametric; robust to outliers and non-normal data.
- Detects **monotonic** trends, not necessarily linear ones. A curved but always-increasing series can be significant.
- Requires independent observations. Positive autocorrelation inflates false positives (see §1.7); use Hamed–Rao, Yue–Wang, or prewhitening.
- Requires no seasonality, or use Seasonal MK.
- For n < 10, the normal approximation is rough; exact tables are better. `pymannkendall` uses the normal approximation.
- The MK p-value says nothing about magnitude; always report Sen's slope.
- Missing values are dropped pairwise by `pymannkendall`; the effective n is smaller than the nominal length.

**Interpretation:** "Mann–Kendall detects a significant decreasing trend (p = 0.003, τ = −0.11); Sen's slope is −0.010 AOD/decade." A significant MK with a tiny Sen slope is possible with a long record.

### 2.5 Seasonal Mann–Kendall (Seasonal MK)

Seasonal MK (Hirsch & Slack, 1984) compares each season only with the same season in other years. It avoids the seasonal cycle without subtracting a climatology.

For each season \(g\) (month, quarter, etc.), compute \(S_g\) and \(\operatorname{Var}(S_g)\), then

\[
S = \sum_g S_g, \qquad \operatorname{Var}(S) = \sum_g \operatorname{Var}(S_g)
\]

and use the same \(Z\) and p-value formulas.

**Assumptions:**

- Seasons are independent. If they are correlated, use `correlated_seasonal_test` or a covariance-corrected version.
- At least ~10 years of data; fewer years make the seasonal statistics unstable.
- Missing values are handled within each season; report the effective n.

**Slope:** seasonal Sen slope, computed within each season and combined by median. For monthly data with `period=12`, the slope is per **year**. This is a common source of unit errors: `mk.original_test(monthly_values).slope` is per **month**, while `mk.seasonal_test(monthly_values, period=12).slope` is per **year**. Multiply/divide accordingly.

**When to use:** monthly data with a strong annual cycle, especially when you do not want to model the cycle. It is the safest default non-parametric method for the challenge.

### 2.6 Pearson and Spearman correlation with time

**Pearson r** measures linear association. For a trend test, correlate \(y\) with \(t\):

\[
t = \frac{r\sqrt{n-2}}{\sqrt{1-r^2}}
\]

This gives the same p-value as the OLS slope test (for a two-sided test). Pearson is sensitive to outliers and non-linearity.

**Spearman ρ** is the Pearson correlation of ranks. It measures monotonic association and is robust to outliers and non-normal data. The p-value is often computed with a t approximation or a permutation test; for small n, use a permutation.

**Use them for:**

- a quick screening check,
- communication ("the rank correlation is −0.11"),
- comparing with non-linear monotonic relationships.

**Do not use them for:**

- effect size (report the slope, not r),
- replacing a trend test when seasonality/autocorrelation are present,
- claiming causation.

A correlation of −0.1 can be highly significant with n = 300; that does not mean the relationship is strong.

### 2.7 Change-point methods (brief)

A **change point** is a time when the behavior of the series changes: a step, a kink, or a change in variance. A single linear trend across a step can be misleading (e.g., flat before 2010, steep after).

Common methods:

- **Pettitt test:** non-parametric test for a single step change in the mean. It computes a cumulative rank statistic and finds the most likely change point. Good for a quick check; O(n²).
- **CUSUM:** cumulative sum of deviations from the mean; visual and simple.
- **BEAST:** Bayesian change-point decomposition with trend and seasonality; robust but heavier.
- **PELT / ruptures:** multiple change points with a penalty; good for segmentation.

**Practical advice:**

- Plot the series first. If there is an obvious step, do not fit one line and call it a trend.
- Fit piecewise linear trends or report segment means.
- A change point is not necessarily a trend; it may be an instrument change, a policy, or a volcanic eruption.
- For the hackathon, a single Pettitt check plus a note is enough; do not build a full Bayesian change-point system.

A tested Pettitt implementation is in §3.10.

### 2.8 Autocorrelation corrections

**HAC / Newey–West standard errors (recommended for OLS):**

\[
\widehat{\operatorname{Var}}(\hat b) = \text{a weighted sum of residual autocovariances}
\]

You do not need to implement it; `statsmodels` does. Choose the maximum lag:

- monthly data: 12 lags (one year),
- quarterly: 4,
- annual: 1–3,
- rule of thumb: \(L = \lfloor 4(n/100)^{2/9}\rfloor\).

HAC does not change the slope; it changes the standard error, p-value, and CI. It is not a cure for strong low-frequency variability, but it is much better than ignoring autocorrelation.

**Hamed–Rao MK:** adjusts the MK variance using the effective sample size from the lag-1 autocorrelation. Use `mk.hamed_rao_modification_test(y)`.

**Yue–Wang MK:** another variance correction; `mk.yue_wang_modification_test(y)`.

**Trend-free prewhitening (TFPW):** estimate the Sen slope, remove it, prewhiten the residuals with AR(1), add the trend back, then run MK. Use `mk.trend_free_pre_whitening_modification_test(y)`. It can reduce power but controls false positives.

**Block bootstrap:** resample blocks of consecutive years (e.g., 3–5 year blocks) with replacement, recompute the Sen slope, and take the 2.5th/97.5th percentiles. This preserves short-range autocorrelation. Use at least 1,000 resamples.

**Annual aggregation:** reduces month-to-month autocorrelation and seasonal effects; still check year-to-year autocorrelation.

**Do not:** use a naive "effective sample size" correction without saying so, or report an OLS p-value from autocorrelated residuals.

### 2.9 Method comparison and pitfalls

| Pitfall | What you see | Fix |
|---|---|---|
| Raw monthly OLS with strong seasonality | p = 0.33 for a real trend; slope unstable | Monthly anomalies or month dummies |
| Raw monthly MK with strong seasonality | p wrong in either direction; slope per month | Seasonal MK |
| Autocorrelated residuals | p too small; CI too narrow | HAC, Hamed–Rao, block bootstrap |
| Outlier dominates OLS | slope changes sign when one point removed | Sen + MK; check Cook's distance |
| Many pixels tested | hundreds of "significant" pixels by chance | BH FDR; field significance |
| Short record | p > 0.05 despite a large slope | Report CI; warn about power |
| Linear fit across a step | line passes through a regime change | Pettitt / piecewise fit |
| Percent change from near-zero baseline | huge, meaningless percentage | Use absolute change |
| Comparing slopes from different periods | "the trend accelerated" without a test | Test the difference or use a interaction model |
| Sensor change / calibration drift | apparent trend at a known break | Check metadata; plot raw data; use homogenized products |

---


## 3. Python implementation

### 3.1 Install

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install numpy pandas scipy statsmodels pymannkendall xarray matplotlib

# for the app
pip install streamlit plotly rioxarray netCDF4 requests
```

Or with `uv`:

```bash
uv venv
uv pip install numpy pandas scipy statsmodels pymannkendall xarray matplotlib
```

Tested versions: Python 3.11.17, numpy 2.4.6, pandas 3.1.1, scipy 1.17.1, statsmodels 0.15.0, xarray 2026.9.0, pymannkendall 1.4.3, matplotlib 3.11.2. The code uses stable APIs; if you are on older pandas, replace `"YS"` with `"AS"` and `"MS"` with `"M"` if needed.

### 3.2 Load, inspect, and quality-check a series

```python
import numpy as np
import pandas as pd

# Example: a CSV with columns date, value
df = pd.read_csv("aod_wisconsin.csv", parse_dates=["date"])
df = df.sort_values("date").drop_duplicates("date").set_index("date")
s = df["value"].astype(float)

# Mask fill values. Check the actual fill value in your product!
s = s.where(s > -900)

# If the input is daily, aggregate to monthly and require coverage.
monthly = s.resample("MS").mean()
counts = s.resample("MS").count()
monthly = monthly.where(counts >= 20)      # >= 20 valid days per month

print("period:", monthly.index.min(), "to", monthly.index.max())
print("valid months:", monthly.notna().sum(), "of", len(monthly))
print(monthly.describe())
```

If the input is already monthly, do **not** resample with a 20-day count; use it directly and check for gaps:

```python
monthly = s.resample("MS").mean()   # inserts NaN for missing months, keeps the time axis honest
counts = s.resample("MS").count()
monthly = monthly.where(counts >= 1)
```

Always keep a **DatetimeIndex**. Do not use `np.arange(len(s))` as time: if there are gaps, the slope will be per row, not per month, and the p-value will be wrong.

### 3.3 The core helper functions

Put these in a module, for example `trend.py`. They are short enough to audit, and they avoid a dependency on a large framework for the basic statistics.

```python
import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.stats.multitest import multipletests


def decimal_years(index):
    """Years since the first timestamp. Works with gaps and any pandas frequency."""
    index = pd.DatetimeIndex(index)
    return (index - index[0]).days / 365.2425


def ols_trend(t, y, conf=0.95):
    """OLS slope with a t-based confidence interval.

    Returns a dict with slope, lo, hi, p, r2, se, n, intercept.
    Units: y units per unit of t.
    """
    t = np.asarray(t, dtype=float)
    y = np.asarray(y, dtype=float)
    ok = np.isfinite(t) & np.isfinite(y)
    t, y = t[ok], y[ok]
    n = len(t)
    if n < 3:
        raise ValueError("need at least 3 finite points")

    res = stats.linregress(t, y)
    tcrit = stats.t.ppf(0.5 + conf / 2, n - 2)
    return {
        "slope": res.slope,
        "lo": res.slope - tcrit * res.stderr,
        "hi": res.slope + tcrit * res.stderr,
        "p": res.pvalue,
        "r2": res.rvalue ** 2,
        "se": res.stderr,
        "n": n,
        "intercept": res.intercept,
    }


def fit_line_ci(t, y, conf=0.95):
    """Fitted line and confidence band for the mean response."""
    t = np.asarray(t, dtype=float)
    y = np.asarray(y, dtype=float)
    ok = np.isfinite(t) & np.isfinite(y)
    t, y = t[ok], y[ok]
    n = len(t)
    res = stats.linregress(t, y)
    yhat = res.intercept + res.slope * t
    s = np.sqrt(np.sum((y - yhat) ** 2) / (n - 2))
    den = np.sum((t - t.mean()) ** 2)
    se_mean = s * np.sqrt(1 / n + (t - t.mean()) ** 2 / den)
    tcrit = stats.t.ppf(0.5 + conf / 2, n - 2)
    return yhat, yhat - tcrit * se_mean, yhat + tcrit * se_mean


def sen_trend(t, y, conf=0.95):
    """Theil-Sen slope with Sen's confidence interval."""
    t = np.asarray(t, dtype=float)
    y = np.asarray(y, dtype=float)
    ok = np.isfinite(t) & np.isfinite(y)
    r = stats.theilslopes(y[ok], t[ok], alpha=conf)
    return {"slope": r.slope, "lo": r.low_slope, "hi": r.high_slope,
            "n": int(ok.sum())}


def mk_trend(y, period=None, alpha=0.05):
    """Mann-Kendall or Seasonal Mann-Kendall.

    Slope units:
      - period=None: per sample step (e.g. per month for monthly data)
      - period=12 on monthly data: per year
    """
    import pymannkendall as mk
    y = np.asarray(y, dtype=float)
    y = y[np.isfinite(y)]
    r = (mk.seasonal_test(y, period=period, alpha=alpha) if period
         else mk.original_test(y, alpha=alpha))
    return {"trend": r.trend, "p": float(r.p), "slope": float(r.slope),
            "z": float(r.z), "tau": float(r.Tau), "n": len(y)}


def monthly_anomalies(s):
    """Subtract the calendar-month climatology (full period).

    A constant offset per calendar month does not change a linear slope;
    it removes the seasonal variance and makes the trend easier to detect.
    """
    s = s.resample("MS").mean()
    clim = s.groupby(s.index.month).transform("mean")
    return s - clim


def annual_mean(s, min_months=10):
    """Annual mean, masked when fewer than min_months valid months."""
    g = s.resample("YS")
    return g.mean().where(g.count() >= min_months)


def bh_fdr(p, alpha=0.05):
    """Benjamini-Hochberg FDR. Returns (reject, qvalues), NaNs preserved."""
    p = np.asarray(p, dtype=float)
    ok = np.isfinite(p)
    reject = np.zeros(p.shape, dtype=bool)
    q = np.full(p.shape, np.nan)
    if ok.any():
        rej, qv, _, _ = multipletests(p[ok], alpha=alpha, method="fdr_bh")
        reject[ok] = rej
        q[ok] = qv
    return reject, q
```

Use it like this:

```python
t = decimal_years(monthly.index)
y = monthly.values

res = ols_trend(t, y)
print(f"OLS: {res['slope'] * 10:+.3f} per decade "
      f"(95% CI {res['lo'] * 10:+.3f} to {res['hi'] * 10:+.3f}), "
      f"p={res['p']:.3g}, n={res['n']}")

sen = sen_trend(t, y)
print(f"Sen: {sen['slope'] * 10:+.3f} per decade "
      f"(95% CI {sen['lo'] * 10:+.3f} to {sen['hi'] * 10:+.3f})")

mk = mk_trend(y, period=12)
print(f"Seasonal MK: {mk['trend']}, p={mk['p']:.3g}, "
      f"Sen slope={mk['slope'] * 10:+.3f} per decade")
```

**Unit check.** `decimal_years` returns years since the first observation. `ols_trend` returns units of `y` per year. Multiply by 10 for per decade. `mk_trend(y)` returns units per sample step; for monthly data that is per month, so multiply by 120 for per decade. `mk_trend(y, period=12)` returns per year, so multiply by 10. This is the most common bug in trend code; write a unit test.

### 3.4 OLS with seasonality and HAC standard errors (statsmodels)

This is the cleanest single-model approach for monthly data. Month dummies absorb the seasonal cycle; HAC standard errors account for autocorrelation.

```python
import pandas as pd
import statsmodels.formula.api as smf

# monthly is a pandas Series with a DatetimeIndex
df = pd.DataFrame({
    "y": monthly.values,
    "t": decimal_years(monthly.index),
    "month": monthly.index.month,
})

model = smf.ols("y ~ t + C(month)", data=df).fit(
    cov_type="HAC",
    cov_kwds={"maxlags": 12},   # 12 months for monthly data
)

slope_per_year = model.params["t"]
ci = model.conf_int().loc["t"]
print(f"slope = {slope_per_year * 10:+.3f} per decade "
      f"(95% CI {ci.iloc[0] * 10:+.3f} to {ci.iloc[1] * 10:+.3f}), "
      f"p = {model.pvalues['t']:.3g}")
print(model.summary())
```

Notes:

- `C(month)` treats month as categorical. With 25 years of data, 11 dummy coefficients are estimated; that is fine.
- The slope is the within-month trend, i.e. the trend after removing a constant seasonal cycle.
- HAC changes the standard error, not the slope. Compare the OLS and HAC p-values: if they differ a lot, autocorrelation matters.
- For annual data, use `cov_kwds={"maxlags": 1}` or 2.
- If the series has gaps, statsmodels drops rows with NaN by default; check `model.nobs`.
- If you prefer anomalies to dummies, `monthly_anomalies` gives the same slope for a linear trend (up to small estimation effects) and is easier to plot.

### 3.5 Sen's slope and Mann–Kendall with scipy/pymannkendall

```python
from scipy import stats
import pymannkendall as mk

t = decimal_years(monthly.index)

# Sen slope: robust to outliers; CI assumes independent errors
ok = np.isfinite(monthly.values)
sen = stats.theilslopes(monthly.values[ok], t[ok], alpha=0.95)
print("Sen per decade:", sen.slope * 10,
      "CI:", sen.low_slope * 10, sen.high_slope * 10)

# Mann-Kendall on the monthly series (no seasonal adjustment)
print(mk.original_test(monthly.values))

# Seasonal Mann-Kendall: the right non-parametric test for monthly data
print(mk.seasonal_test(monthly.values, period=12))

# Autocorrelation-robust version of MK
print(mk.hamed_rao_modification_test(monthly.values))
```

`pymannkendall` returns a named tuple:

```
Mann_Kendall_Test(trend='increasing', h=True, p=0.00016, z=3.77,
                  Tau=0.233, s=1664.0, var_s=..., slope=0.0174,
                  intercept=0.43)
```

- `trend`: `'increasing'`, `'decreasing'`, or `'no trend'`.
- `h`: boolean at the chosen alpha.
- `p`: two-sided p-value.
- `Tau`: Kendall rank correlation.
- `slope`: Sen's slope, in **sample-step units** for `original_test`.

Do not read `slope` without checking the units. Test it once with a synthetic series of known slope.

### 3.6 xarray: monthly means, anomalies, annual means

```python
import xarray as xr

ds = xr.open_dataset("aod.nc")
aod = ds["AOD"]

# Mask fill values if xarray has not already done so. Check the product docs.
aod = aod.where(aod < 1e5)

# Monthly means and coverage
monthly = aod.resample(time="MS").mean()
counts = aod.resample(time="MS").count()
monthly = monthly.where(counts >= 20)      # >= 20 valid days per month

# Seasonal cycle and monthly anomalies
clim = monthly.groupby("time.month").mean("time")
anom = monthly.groupby("time.month") - clim

# Annual means (require at least 10 valid months)
annual = monthly.resample(time="YS").mean()
annual = annual.where(monthly.resample(time="YS").count() >= 10)
```

`xarray` skips NaNs in `.mean()` and `.sum()` by default, but you must track coverage yourself. A month with one valid day otherwise gets the same weight as a month with 31.

<details>
<summary><strong>Vectorized per-pixel OLS for a gridded trend map (click to expand)</strong></summary>

```python
import numpy as np
import xarray as xr
from scipy import stats


def xr_ols_trend(da, time_dim="time", min_obs=20):
    """Per-cell OLS slope, SE, p and n for an xarray DataArray with a time dim.

    Handles per-pixel missing values. Returns a Dataset with slope, intercept,
    se, p and n, masked where n < min_obs.
    """
    da = da.where(np.isfinite(da))
    t = xr.DataArray(
        (da[time_dim] - da[time_dim][0]).dt.days / 365.2425,
        dims=time_dim, coords={time_dim: da[time_dim]}, name="year",
    )
    valid = da.notnull()
    n = valid.sum(time_dim)

    tbar = t.where(valid).mean(time_dim)
    ybar = da.mean(time_dim)
    num = ((t - tbar) * (da - ybar)).sum(time_dim)
    den = ((t - tbar) ** 2).where(valid).sum(time_dim)   # mask missing times!
    slope = num / den
    intercept = ybar - slope * tbar

    resid = da - (intercept + slope * t)
    s2 = (resid ** 2).sum(time_dim) / (n - 2)
    se = np.sqrt(s2 / den)
    with np.errstate(invalid="ignore", divide="ignore"):
        tstat = slope / se

    p = xr.DataArray(
        2 * stats.t.sf(np.abs(tstat.values), df=(n.values - 2)),
        coords=slope.coords, dims=slope.dims,
    )
    out = xr.Dataset({"slope": slope, "intercept": intercept,
                      "se": se, "p": p, "n": n})
    return out.where(n >= min_obs)
```

Usage:

```python
trend = xr_ols_trend(anom, time_dim="time", min_obs=120)  # 10 years of months
trend.slope.attrs["units"] = "AOD per year"
trend[["slope", "p", "n"]].to_netcdf("trend_map.nc")
```

The line `den = ((t - tbar) ** 2).where(valid).sum(time_dim)` is essential. Without `.where(valid)`, the denominator includes time steps where the pixel has no data, and the slope is wrong. This bug is easy to miss because it only appears for pixels with gaps.

</details>

**Trap: `xarray.polyfit` with datetime coordinates.** `da.polyfit(dim="time", deg=1)` silently treats `datetime64` as huge nanosecond numbers. On a test series with a real slope of +0.13/year, it returned a slope of `3e-18`. Convert time to numeric years first:

```python
years = (da.time - da.time[0]).dt.days / 365.2425
da = da.assign_coords(year=("time", years)).swap_dims(time="year")
coef = da.polyfit(dim="year", deg=1).polyfit_coefficients
```

### 3.7 Trend map with FDR stippling

```python
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from statsmodels.stats.multitest import multipletests

slope = trend.slope.values
p = trend.p.values

flat = p.ravel()
ok = np.isfinite(flat)
reject = np.zeros_like(flat, dtype=bool)
q = np.full_like(flat, np.nan)
reject[ok], q[ok], _, _ = multipletests(flat[ok], alpha=0.05, method="fdr_bh")
sig = reject.reshape(p.shape)

fig, ax = plt.subplots(figsize=(9, 5))
vmax = np.nanpercentile(np.abs(slope), 98)
norm = mcolors.TwoSlopeNorm(vcenter=0, vmin=-vmax, vmax=vmax)
im = ax.pcolormesh(trend.lon, trend.lat, slope,
                   cmap="RdBu_r", norm=norm, shading="auto")
ax.contourf(trend.lon, trend.lat, sig.astype(float),
            levels=[0.5, 1.5], colors="none", hatches=["...."], alpha=0)
fig.colorbar(im, ax=ax, label="slope (units per year)")
ax.set_title("Trend; stippling = FDR-significant (q < 0.05)")
```

If the grid is large, compute the FDR on a flattened finite mask and reshape. Do not call `multipletests` with NaNs; it will error or return nonsense.

### 3.8 Time-series plot with a confidence band

```python
import matplotlib.pyplot as plt


def plot_trend(s, title="", ylabel="", ax=None):
    """Monthly series + 12-month mean + OLS line with 95% CI band."""
    s = s.resample("MS").mean()
    t = decimal_years(s.index)
    ok = np.isfinite(s.values)
    yhat, lo, hi = fit_line_ci(t[ok], s.values[ok])
    r = ols_trend(t[ok], s.values[ok])

    if ax is None:
        fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(s.index, s.values, color="0.7", lw=0.8, label="Monthly")
    ax.plot(s.index, s.rolling(12, center=True, min_periods=12).mean(),
            color="C0", lw=1.8, label="12-month mean")
    ax.plot(s.index[ok], yhat, color="C3", lw=2, label="OLS trend")
    ax.fill_between(s.index[ok], lo, hi, color="C3", alpha=0.2,
                    label="95% CI")
    ax.set_title(title)
    ax.set_ylabel(ylabel)
    ax.annotate(
        f"{r['slope'] * 10:+.3f} per decade  "
        f"(95% CI {r['lo'] * 10:+.3f} to {r['hi'] * 10:+.3f}), "
        f"p={r['p']:.3g}, n={r['n']}",
        xy=(0.01, 0.02), xycoords="axes fraction",
        fontsize=8, color="0.25",
    )
    ax.legend(fontsize=8, loc="upper left")
    return ax
```

Call it with the **deseasonalized** series if you want the trend line to be readable:

```python
fig, ax = plt.subplots(figsize=(10, 4))
plot_trend(anom, title="Wisconsin AOD anomaly", ylabel="AOD anomaly", ax=ax)
fig.tight_layout()
fig.savefig("trend.png", dpi=150)
```

A two-panel figure works better for the app: top panel raw monthly + seasonal cycle, bottom panel anomaly + trend. The seasonal panel explains why the raw series looks noisy.

### 3.9 Change point: Pettitt test

A short, dependency-free implementation:

```python
import numpy as np


def pettitt_test(x):
    """Pettitt (1979) single change-point test.

    Returns (change_index, K, p_value), where change_index is the first index
    of the second segment (the number of points in the first segment).
    O(n^2); fine for a few thousand points.
    """
    x = np.asarray(x, dtype=float)
    x = x[np.isfinite(x)]
    n = len(x)
    signs = np.sign(x[:, None] - x[None, :])
    U = np.array([signs[:t, t:].sum() for t in range(1, n)])
    K = np.max(np.abs(U))
    idx = int(np.argmax(np.abs(U))) + 1
    p = min(1.0, 2 * np.exp(-6 * K ** 2 / (n ** 3 + n ** 2)))
    return idx, float(K), float(p)
```

Example:

```python
idx, K, p = pettitt_test(monthly.values)
print(f"first point after change: {monthly.index[idx]}, p={p:.3g}")
```

For multiple change points or a full Bayesian decomposition, use `ruptures` (PELT) or `Rbeast`; both are heavier and not needed for the MVP.

### 3.10 Code traps checklist

| Trap | Symptom | Fix |
|---|---|---|
| Using row numbers as time | slope per row, not per month/year; p wrong with gaps | `decimal_years(index)` or `xarray` datetime |
| `linregress` with NaNs | all outputs NaN, silently | drop NaNs or `nan_policy="omit"` |
| `xarray.polyfit` on datetime | slope ~1e-18, flat line | numeric year coordinate |
| `pymannkendall.original_test` on monthly data | slope per month, not per year | multiply by 12 (or use seasonal_test) |
| `seasonal_test` with length not divisible by period | pads with NaN; unexpected n | trim or pad explicitly; check `n` |
| `groupby(...).mean()` for anomalies | collapses to 12 values | use `.transform("mean")` |
| `multipletests` with NaNs | error or wrong q-values | mask finite values |
| Constant series | OLS p and CI are NaN | report "constant; test undefined" |
| `resample("M")` / `"A"` | deprecation warnings in pandas 2/3 | use `"MS"` / `"YS"` |
| Monthly climatology on < 10 years | poorly estimated; unstable anomalies | use month dummies or annual means |
| HAC with `maxlags` too small | autocorrelation not removed | 12 for monthly, 1–3 for annual |
| Percent change from a near-zero baseline | huge, meaningless % | use absolute change |

---


## 4. Removing seasonal cycles and handling missing data

### 4.1 Four ways to deal with seasonality

| Method | What it does | Slope interpretation | Assumptions | Best for |
|---|---|---|---|---|
| Monthly anomalies | Subtract the mean of each calendar month | Trend in the anomaly series; same as the original linear trend if the cycle is additive and constant | Additive, stable seasonal cycle | Plotting, simple analysis |
| Month dummies in regression | Fit a separate intercept for each month | Within-month trend | Additive, stable cycle; enough years | Inference with CI/HAC |
| Seasonal Mann–Kendall | Compare each month only with the same month in other years | Seasonal Sen slope, per year | Monotonic trend; seasons independent | Skewed data, outliers |
| Annual means | Average all months within a year | Trend in the annual mean | Annual mean is meaningful | Communication, short records |
| STL decomposition | Separate smooth trend, seasonal, residual | Smooth trend, not a linear slope | Additive; tuning choices | EDA and visualization |

### 4.2 Monthly anomalies

```python
monthly = s.resample("MS").mean()
clim = monthly.groupby(monthly.index.month).transform("mean")
anom = monthly - clim
```

- `groupby(...).transform("mean")` keeps the time index. `groupby(...).mean()` would collapse the series to 12 values and break the subtraction.
- Subtracting a **constant** offset for each month does not change a linear slope. It removes the seasonal variance, which shrinks the standard error and increases power. In the Wisconsin AOD sample, the raw slope and the anomaly slope are almost identical, but the p-value drops from 0.33 to 0.056.
- The climatology is estimated from the same data you are testing. With 20+ years, the effect on the slope is negligible. With a short record, use month dummies or leave-one-year-out climatology; otherwise the anomaly series can look artificially flat.
- If the seasonal cycle is **changing** (e.g., spring arrives earlier), a fixed monthly climatology does not remove that change. Analyze same-month series, or include an interaction between month and time, or use a time-varying seasonal model.

**Fixed baseline vs full-period climatology.** For trend estimation, a full-period climatology is fine. For communication, a fixed baseline (e.g., 1991–2020) is easier to interpret: "anomaly relative to the 1991–2020 average." Do not mix baselines between plots.

```python
base = monthly["1991":"2020"]
clim = base.groupby(base.index.month).mean()
anom = monthly - monthly.index.month.map(clim)
```

Test this: `monthly.index.month.map(clim)` returns a Series aligned to the index, and subtraction works. If your pandas version complains, use `pd.Series(monthly.index.month, index=monthly.index).map(clim)`.

### 4.3 Month dummies in a regression

```python
import pandas as pd
import statsmodels.formula.api as smf

df = pd.DataFrame({
    "y": monthly.values,
    "t": decimal_years(monthly.index),
    "month": monthly.index.month,
})
model = smf.ols("y ~ t + C(month)", data=df).fit(
    cov_type="HAC", cov_kwds={"maxlags": 12}
)
```

This is equivalent to subtracting a monthly climatology for the slope, but it estimates the seasonal offsets and the trend jointly. It gives correct standard errors for the trend (under the model) and avoids the two-step anomaly procedure. It is the best default for inference on monthly data.

If you want a **seasonal interaction** (different trends in different months), use `y ~ t * C(month)`. That fits 12 slopes; it is more complex and needs more data. Do not use it for the MVP.

### 4.4 Seasonal Mann–Kendall

```python
import pymannkendall as mk
result = mk.seasonal_test(monthly.values, period=12)
```

Seasonal MK compares January with January, February with February, and so on. It does not require you to subtract a climatology. It is robust to outliers and non-normal data. It needs at least ~10 years; with 5 years, each season has only 5 points and the test is unstable.

Use it when:

- the data are skewed (precipitation, streamflow, chlorophyll),
- there are outliers,
- you want a non-parametric test,
- the seasonal cycle is strong but you do not want to model it.

Do not use `original_test` on monthly data and call it a trend test. It ignores the seasonal structure; its p-value can be wrong in either direction, and its slope is per month. If you must use it, say so and convert units.

### 4.5 Annual means

```python
annual = annual_mean(monthly, min_months=10)
```

Annual means remove seasonality by aggregation. They are easy to explain and often have less month-to-month autocorrelation. The cost: 12× fewer points, so power can drop. Compare the annual and monthly results; if they disagree, report both.

For AOD Wisconsin, the annual mean series has 25 points; the annual MK p-value is 0.050, while the monthly Seasonal MK p-value is 0.0015. The monthly test has more power because it uses more data, but the annual test is a useful conservative check.

### 4.6 STL for exploration, not inference

```python
from statsmodels.tsa.seasonal import STL

stl = STL(monthly, period=12, robust=True).fit()
trend = stl.trend
seasonal = stl.seasonal
resid = stl.resid
```

STL is excellent for a "decomposition" view: raw = trend + seasonal + residual. But the STL trend is a **smooth local estimate**, not a linear slope. If you regress `stl.trend` on time, the standard error is wrong because the trend was smoothed. Use STL for visualization and EDA; use OLS/month dummies/Seasonal MK for inference.

### 4.7 Missing data rules

1. **Keep the real time axis.** `resample("MS")` inserts NaN for missing months; that is honest. Do not drop missing months and then use row numbers as time.
2. **Set a coverage threshold.** For daily data, require at least 20 valid days per monthly mean. For monthly data, require at least 10 valid months per annual mean. For a grid, require at least 15 valid years per pixel (adjust to your record).
3. **Do not fill long gaps.** Interpolation invents information and shrinks the variance, making trends look more significant. If you fill for a plot, label it and do not use the filled values for the test.
4. **Check whether gaps are random.** Clouds, winter access, sensor outages, and station moves can create gaps that correlate with the variable. A trend computed only from clear-sky summer months is not a annual trend.
5. **Report the effective n.** `pymannkendall` drops NaNs; OLS drops rows; the nominal length overstates the information. Show `n` in the result card.
6. **Show a coverage map.** For gridded data, a grey "insufficient data" mask is more honest than interpolating across a desert or an ocean.

```python
# Daily -> monthly with coverage
monthly = s.resample("MS").mean()
counts = s.resample("MS").count()
monthly = monthly.where(counts >= 20)

# Monthly -> annual with coverage
annual = monthly.resample("YS").mean()
annual = annual.where(monthly.resample("YS").count() >= 10)
```

For xarray:

```python
monthly = aod.resample(time="MS").mean()
counts = aod.resample(time="MS").count()
monthly = monthly.where(counts >= 20)

annual = monthly.resample(time="YS").mean()
annual = annual.where(monthly.resample(time="YS").count() >= 10)
```

### 4.8 Interpolation: when it is acceptable

- **Plot only:** `series.interpolate(method="time", limit_area="inside")` or xarray `interpolate_na(dim="time", method="linear", max_gap="3MS")`. Label the gap in the caption.
- **Short gap, sensitivity check:** fill 1–2 missing months, run the trend with and without filling, and report that the result is unchanged. If it changes, do not fill.
- **Long gap or non-random missingness:** do not fill. Restrict the analysis to a period with adequate coverage, or use a method that handles missing values (MK) and report the effective n.
- **Never:** `fillna(0)`, `fillna(mean)`, forward-fill a year of data, or interpolate across a sensor change.

### 4.9 A note on multiplicative seasonality

AOD, precipitation, chlorophyll, and NDVI often have seasonal cycles whose amplitude scales with the mean. An additive monthly anomaly may leave heteroscedastic residuals. Options:

- Analyze `log1p(y)` for positive variables, then interpret the slope as a fractional rate per year. Back-transform carefully: a slope of 0.02/year on log scale is about +2%/year for small changes.
- Use a multiplicative seasonal decomposition (STL with a log transform).
- Use Seasonal MK, which is rank-based and insensitive to monotone transformations.

Do not log-transform data with zeros or negative values without a plan.

---

## 5. Communicating results

### 5.1 The five numbers to show

Every result card should show:

1. **Slope with units and time denominator:** `+0.12 °C per decade`.
2. **95% confidence interval:** `[+0.05, +0.19]`.
3. **p-value and test name:** `p = 0.002, OLS on monthly anomalies with HAC SE`.
4. **n and period:** `n = 288 months, 2002-01 to 2025-12`.
5. **Data source/product:** `MODIS-Aqua AOD, Giovanni monthly, v...`.

If any of these is missing, the result is not reproducible.

### 5.2 Time-series chart anatomy

A good chart has:

- **Raw monthly values** in light grey, thin line. This shows variability and gaps.
- **12-month running mean** in a strong color, thicker line. This shows the slow signal.
- **Fitted trend line** in a contrasting color, with a **95% confidence band**.
- **Zero line** if plotting anomalies.
- **Annotation** with slope, CI, p, n, and method.
- **Units on the y-axis**, years on the x-axis.
- **A caption** with the data product, period, and preprocessing.

Example annotation:

```
+0.12 °C per decade  (95% CI +0.05 to +0.19)
p = 0.002, OLS with HAC SE, n = 288 months
```

Do not:

- hide the raw data and show only the trend line,
- use a truncated y-axis that exaggerates the trend without saying so,
- plot a trend line without a CI,
- label a non-significant line as "stable."

A two-panel layout works well:

- Top: raw monthly + 12-month mean + trend + CI.
- Bottom: mean seasonal cycle (12 bars, with ±1 SD error bars). This explains why the raw series is noisy and why seasonal adjustment matters.

The team's `assets/power_trend_wisconsin.png` is a good starting point; add the CI band and a methods line.

### 5.3 Trend map anatomy

- **Color:** slope, diverging palette centered at zero (`RdBu_r`, `BrBG`, or a colorblind-safe alternative). Never use rainbow/jet.
- **Colorbar:** units per decade, e.g. `°C decade⁻¹`, `AOD decade⁻¹`, `% decade⁻¹`.
- **Stippling/hatching:** pixels that pass the significance criterion (preferably FDR q < 0.05, not raw p < 0.05).
- **Grey:** insufficient data (below the coverage threshold).
- **Title:** variable, period, method.
- **Inset or side panel:** histogram of slopes; percentage of valid area with significant increase/decrease.
- **Caption:** data product, spatial resolution, number of pixels, multiple-testing correction.

A separate significance map is often clearer than stippling on a busy basemap. If you stipple, keep the dots small and use a neutral color.

### 5.4 Badges and plain language

| Badge | When | Plain-language text | Tooltip |
|---|---|---|---|
| ▲ Significant increase | p < 0.05 and slope > 0 | "A statistically significant increase was detected." | Method, slope, CI, p, n |
| ▼ Significant decrease | p < 0.05 and slope < 0 | "A statistically significant decrease was detected." | Method, slope, CI, p, n |
| ● No detectable trend | p ≥ 0.05 | "No trend was detected at this record length. This does not mean the variable is stable." | Method, slope, CI, p, n |
| ◐ Method-dependent | methods disagree on significance or sign | "The result depends on the method; see details." | Both methods |
| ▨ Insufficient data | coverage below threshold | "Not enough valid observations for a trend test." | Coverage, n |

Avoid:

- "Stable" for p ≥ 0.05. Use "no detectable trend."
- "Proven" or "confirmed." Use "detected" or "consistent with."
- A green up arrow for "good" and a red down arrow for "bad" without explaining the variable. For AOD, an increase may be bad; for NDVI, an increase may be good. Use neutral colors or label the meaning.
- A badge without the CI. A significant slope of 0.001 ± 0.0005 is not the same as 0.5 ± 0.25.

### 5.5 Effect size and units

Report at least two of:

- **Slope per decade:** `+0.12 °C/decade`.
- **Total change over the period:** `+0.30 °C over 2002–2025`.
- **Percent change:** `+8% relative to the 2002–2025 mean`.
- **Standardized trend:** `0.6 SD over the period`.

Formulas:

```
total change = slope_per_year * (last_year - first_year)
percent change = 100 * total change / baseline_mean
standardized trend = total change / SD(detrended series)
```

Cautions:

- Percent change is meaningless when the baseline is near zero (temperature anomalies) or negative (net radiation).
- A "small" slope can be important if the variable is sensitive (e.g., 0.1 °C/decade in a biodiversity context).
- A "large" slope can be unimportant if the uncertainty is larger (e.g., ±1 °C/decade).
- Always state the denominator: per year or per decade. A factor-of-10 error is common.

### 5.6 The methods box

Put this behind a "How this was calculated" link or in a footer:

```
Method: OLS slope on monthly anomalies, HAC standard errors (12 lags).
Seasonality: calendar-month climatology removed.
Period: 2002-01 to 2025-12. n = 288 months (12 missing).
Multiple testing: Benjamini-Hochberg FDR, q < 0.05 (for maps).
Data: NASA MODIS-Aqua AOD (Giovanni monthly), accessed 2026-11-14.
Software: Python 3.11, scipy 1.17, statsmodels 0.15, pymannkendall 1.4.3.
```

This is what makes the app credible to judges and scientists. It also forces the team to be consistent.

### 5.7 What not to say

| Don't say | Say instead |
|---|---|
| "p < 0.05 proves the trend is real." | "The trend is unlikely under a no-trend model." |
| "p > 0.05 means there is no trend." | "No trend was detected at this record length; the data cannot rule out a small trend." |
| "The trend is 0.2." | "The trend is +0.2 °C per decade (95% CI ...)." |
| "The region is greening." (from one pixel) | "X% of the valid area shows a significant increase." |
| "Climate change caused this local trend." | "The observed trend is consistent with ...; attribution requires more analysis." |
| "The trend will continue." | "The fitted linear trend over 2002–2025 is ...; extrapolation is not guaranteed." |
| "Significant" = "large" or "important." | "Statistically significant; effect size is ..." |

### 5.8 Example interpretation sentences

**Significant increase (Jakarta AOD):**

> AOD over Jakarta increased by +0.037 per decade (95% CI +0.028 to +0.046, p < 0.001, n = 300 months, 2001–2025). The result is robust to OLS, Sen's slope, and Seasonal Mann–Kendall.

**Weak / method-dependent decrease (Wisconsin AOD):**

> AOD over Wisconsin shows a weak decrease of about −0.008 per decade. OLS with HAC standard errors does not exclude zero (95% CI −0.018 to +0.002, p = 0.13), while Sen's slope and Seasonal Mann–Kendall suggest a small significant decrease (Sen −0.010, 95% CI −0.017 to −0.003; Seasonal MK p = 0.0015). The sign is consistent but the effect is small relative to the seasonal cycle, so we report it as method-dependent rather than a strong trend.

**No detectable trend:**

> No trend was detected in this 8-year record (slope +0.02 per decade, 95% CI −0.15 to +0.19, p = 0.82). This does not mean the variable is stable; the record is short and the confidence interval includes changes that could matter.

**Insufficient data:**

> Only 6 of 20 years pass the coverage threshold (≥ 10 valid months per year), so no trend is reported. The grey area on the map marks insufficient coverage.

---

## 6. Existing tools worth emulating

### 6.1 KNMI Climate Explorer

**What it is:** a web-based scientific analysis tool from the Royal Netherlands Meteorological Institute (KNMI), part of the WMO Regional Climate Centre. It holds more than 10 TB of climate data: station records, precipitation, pressure, wind, reanalysis (including ERA5), and CMIP model output.

**UX:**

- Choose a dataset category, then a variable.
- Choose a region on a map or by coordinates.
- Choose a period and analysis (time series, trend, correlation map, composite).
- Get a figure and a downloadable data file.
- The interface is dense and expert-oriented; it assumes you know what you want. There is no login for many datasets, and it asks for a citation.

**What to borrow:**

- The **dataset → variable → region → period → analysis** flow. It matches the challenge's five steps.
- Transparent method text and a citation request.
- Direct download of the plotted data, not only the image.
- A "select area on a map" option.

**What not to copy:** the dense menu tree and the assumption of expert knowledge. The challenge audience is high-school/college students; use plain-language variable definitions and a guided example.

### 6.2 NASA Giovanni

**What it is:** a web map-based data exploration and visualization system for NASA Earth science data. The challenge video uses Giovanni to make the Wisconsin AOD time series.

**UX (from the Giovanni user guide):**

- Select a variable from a catalog, then a region on a map (box, shape, country, watershed, etc.).
- Choose a plot type: Time Series, Area-Averaged Time Series, Time Series of Area-Averaged Differences, Hovmöller, correlation map, scatter plot.
- Area-Averaged Time Series has an option to add a **best-fit trend line**; axis limits and color palettes can be changed.
- Download the plot as PNG, the time-series data as CSV, and most plot data as netCDF.
- Correlation maps use simple linear regression per grid cell and return R plus a sample-count map; cells with fewer than 3 matched pairs are fill.

**What to borrow:**

- **Map-first region selection.** Users think geographically; a bounding box or named region is more intuitive than typing coordinates.
- **One-click CSV download** of the plotted series.
- A simple **best-fit trend line** option on the time-series chart.
- A sample-count or coverage layer so users can see where the data are thin.
- A history/download panel so users can retrieve previous results.

**What not to copy:** the enormous variable catalog and the many plot types. For a 48-hour app, 1–3 variables and 2–3 plot types are enough.

### 6.3 Trends.Earth

**What it is:** a free/open-source land-change tool produced by Conservation International, Lund University, NASA, and partners, with support from the Global Environment Facility. It is used for SDG 15.3.1 and UNCCD reporting.

**UX and methods (from the Trends.Earth docs):**

- Land productivity "trajectory" computes a **linear regression at the pixel level**, then applies a **Mann–Kendall** significance test; only p ≤ 0.05 is treated as a significant change.
- Positive significant NDVI trends indicate potential improvement; negative significant trends potential degradation.
- Three metrics (trajectory, state, performance) are combined into 3-class or 5-class degradation maps.
- Results include area statistics by region, designed for reporting.

**What to borrow:**

- **Classified output**: "significant increase / stable / significant decrease" is easier to understand than a continuous p-value map.
- **Area summary**: "12% of the region shows a significant decrease" is a decision-relevant number.
- **Wizard-style workflow** with sensible defaults and a clear output.
- The combination of a **linear slope for magnitude** and a **Mann–Kendall test for significance**. This is a defensible pattern; just be explicit about the combination.

**What not to copy:** the full land-degradation indicator framework; it is beyond the challenge scope.

### 6.4 Google Earth Engine

**What it is:** a planetary-scale geospatial analysis platform with a JavaScript code editor and a Python API.

**Trend-relevant reducers (official docs):**

- `ee.Reducer.linearFit()`: returns a reducer that computes the slope and offset for a linear regression of two inputs; outputs are named `scale` and `offset`.
- `ee.Reducer.sensSlope()`: computes Sen's slope estimator; returns the estimated slope and offset.
- `ee.Reducer.kendallsCorrelation()`: Kendall's correlation.
- I did not find an official `ee.Reducer.mannKendall()` in the current docs (the docs URL returned 404 on 2026-11-14). Do not claim one without checking; use `sensSlope` or a custom implementation if you need MK in GEE.

**UX:**

- Code-first; not a consumer app. It is powerful for computing a global trend map once, then exporting a COG/GeoTIFF for the app.
- `ui.Chart.image.series` and the Python `geemap` library can make time-series charts.

**What to borrow:**

- Use GEE as an **offline precomputation** backend if the team has experience; do not make the live demo depend on GEE authentication.
- Export a trend map and a few example time series, then serve them from the app.

**What not to copy:** the code-editor UX. The challenge audience will not write JavaScript to see a trend.

### 6.5 Copernicus Climate Data Store (CDS)

**What it is:** the EU Copernicus Climate Change Service data portal. It provides a catalogue of climate datasets, a download form (variable, period, area, format), a processing queue, and a Python API (`cdsapi`). Climate Pulse provides near-real-time interactive maps and charts of global air and sea surface temperature.

**UX:**

- Search the catalogue, open a dataset page, fill a download form, submit a request, wait in a queue, download.
- The API is scriptable; good for reproducible data acquisition.
- Climate Pulse is the consumer-facing, near-real-time layer: maps and charts with minimal configuration.

**What to borrow:**

- **Dataset metadata and provenance**: product name, version, citation, period, spatial resolution.
- A **queue/status** pattern if the app fetches large data; show "fetching data..." rather than a frozen screen.
- A **near-real-time** example layer if the team wants a "current conditions" hook.
- The API-first approach for reproducibility.

**What not to copy:** the download-form UX for a live demo. Pre-bundle the data.

### 6.6 UX patterns to copy for a 48-hour app

| Pattern | Seen in | Why it works | Minimal implementation |
|---|---|---|---|
| Map-first region picker | Giovanni, Climate Explorer | Users think in places | Leaflet/Folium draw box; or a country/region dropdown |
| Dataset → variable → period form | Climate Explorer | Clear, expert-friendly | Three cascading selects |
| One-click worked example | Giovanni/video | Teaches by showing | "Try Wisconsin AOD" button |
| Best-fit trend line on the chart | Giovanni | Immediate visual answer | OLS line + CI band |
| Classified trend map | Trends.Earth | Answers "where" | 5-class map with grey no-data |
| Area summary | Trends.Earth | Quantifies impact | % area increasing/decreasing |
| Seasonal cycle panel | Giovanni/team sample | Explains variability | 12 monthly bars ± SD |
| Download CSV/PNG | All | Trust and reuse | Two buttons |
| Methods/citation panel | CDS, Climate Explorer | Credibility | "How this was computed" expander |
| Coverage / sample count | Giovanni | Shows data limits | Grey mask or count layer |

### 6.7 What to skip in 48 hours

- User accounts and saved projects.
- A catalog of hundreds of variables.
- A processing queue for large downloads.
- Global high-resolution trend maps computed live.
- Complex Bayesian change-point models.
- A custom map projection engine.
- AI-generated variable descriptions without review (and disclose AI use if you use it).

---



## 7. Recommended MVP analysis pipeline

### 7.1 Scope for 48 hours

Build a **guided, example-first trend explorer**, not a global data platform.

Minimum viable product:

- 1–3 variables with plain-language definitions (AOD is the hero, because the challenge video uses it).
- 2–4 pre-bundled regions, including **Wisconsin** and a contrasting region (Jakarta or another city/region) so the app can show a regional sign flip.
- A time-series chart: raw monthly, 12-month mean, fitted trend, 95% CI.
- A seasonal-cycle panel.
- A significance panel: slope per decade, CI, p-value, test name, n, period, plain-language verdict.
- A methods/citation panel.
- CSV and PNG export.

Stretch, only if time remains:

- A per-pixel trend map with FDR stippling.
- A second variable (temperature or precipitation).
- Compare two regions side by side.
- A permalink that encodes variable/region/period.

### 7.2 Architecture

```
app.py                 Streamlit pages and layout
├── data.py            load bundled CSV/NetCDF; optional NASA POWER fetch
├── trend.py           ols_trend, sen_trend, mk_trend, monthly_anomalies,
│                      annual_mean, bh_fdr, xr_ols_trend
├── plots.py           time series, seasonal cycle, trend map
└── content.py          variable definitions, methods text, citations
```

For a 48-hour team, a single `app.py` plus `trend.py` is acceptable. Do not build a microservice architecture.

### 7.3 Pipeline steps with exact libraries

| Step | What to do | Library / function |
|---|---|---|
| 1. Load | Read CSV or NetCDF; parse dates; sort; drop duplicates | `pandas.read_csv(parse_dates=...)`, `xarray.open_dataset` |
| 2. QC | Mask fill values; check units, duplicates, gaps | `pandas`, `xarray.where` |
| 3. Monthly | Resample to monthly; track coverage | `Series.resample("MS").mean()`, `.count()` |
| 4. Seasonality | Monthly anomalies or month dummies | `groupby(...).transform("mean")`, `statsmodels` `C(month)` |
| 5. Trend | OLS slope + CI; HAC p-value | `scipy.stats.linregress`, `statsmodels` `OLS.fit(cov_type="HAC")` |
| 6. Robustness | Sen slope; MK; Seasonal MK | `scipy.stats.theilslopes`, `pymannkendall` |
| 7. Uncertainty | 95% CI; optionally block bootstrap | `scipy.stats`, `numpy` |
| 8. Map (stretch) | Vectorized per-pixel OLS | `xarray` + `xr_ols_trend` |
| 9. Multiple testing | BH FDR on pixel p-values | `statsmodels.stats.multitest.multipletests` |
| 10. Visualize | Time series, seasonal cycle, trend map | `matplotlib`, `plotly` |
| 11. Export | CSV, PNG, NetCDF/GeoTIFF | `pandas.to_csv`, `fig.savefig`, `rioxarray` |
| 12. Explain | Methods box, plain-language verdict | `content.py` |

### 7.4 Data choices for a reliable demo

**Verified path: NASA POWER monthly point API (no login).**

The team already has working CSVs:

- `docs/problems/assets/power_monthly_wisconsin.csv`
- `docs/problems/assets/power_monthly_jakarta.csv`
- `docs/problems/assets/power_trend_analysis.py`

The POWER API endpoint used is:

```
https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=AOD_55&community=RE&longitude=-89.4&latitude=43.07&start=2000&end=2025&format=CSV
```

POWER returns a header block and a `PARAMETER,YEAR,JAN..DEC,ANN` table. Mask `-999.0` and skip the first empty year (AOD starts in 2001 in the sample). This path is login-free and reliable for a live demo. It is a **point** API: for a region, average several points or precompute a regional mean.

**Alternative: NASA Giovanni.**

- Use the challenge video's example: MODIS-Aqua AOD, monthly, Wisconsin, 2002–present.
- Export the time series as CSV from Giovanni.
- Giovanni is not a stable public API; do not scrape it in the live app. Export once and bundle the CSV.
- Cite the product and access date.

**Alternative: AppEEARS.**

- Good for MODIS land products (NDVI, EVI, land surface temperature).
- Requires an Earthdata login and a task queue. Pre-download for the demo.
- Outputs CSV/NetCDF with quality bands; mask according to the product's QC flags.

**For the hero example:** use AOD. It has a clear seasonal cycle (summer high, winter low), which makes the "remove seasonality" lesson visible, and it has a regional sign flip between Wisconsin and Jakarta in the team's sample.

### 7.5 Performance and scale

- **Point/region time series:** trivial. A few hundred to a few thousand points; all methods run in milliseconds.
- **Regional grid (e.g., 0.25° × 0.25°, 25 years monthly):** vectorized OLS is fast (seconds) if the array fits in memory. Use `float32` and chunk with `dask` if needed.
- **Global 0.25° monthly 30 years:** ~720 × 1440 × 360 = 373M values; float32 ~1.5 GB. Do not load the full cube in a 1 GB Streamlit instance. Precompute the trend map offline, or subset to the region.
- **Sen/MK per pixel:** O(n²) per pixel; too slow for millions of pixels. Use OLS for maps; run Sen/MK on sampled points or regional aggregates.
- **MODIS 250 m:** do not load global high-resolution data in the app. Use pre-aggregated COGs/GeoTIFFs, a regional subset, or GEE.
- **Caching:** `@st.cache_data` on loaders and trend functions; the user will change the region/period repeatedly.

### 7.6 Validation

Before the demo:

1. **Synthetic test:** generate `y = 0.1*t + noise` with known slope; check that `ols_trend` recovers 0.1 per year and that the CI covers it.
2. **Unit test:** `mk_trend(monthly, period=12).slope * 10` should be close to `ols_trend(...).slope * 10` for a clean linear trend. If it is off by 12, you have the monthly/year unit bug.
3. **Constant series:** `y = 5` should return slope 0 and p = NaN; the UI must show "constant series" rather than "nan."
4. **Missing data:** remove 20% of months; compare the slope with the full series. It should be close; the CI should widen.
5. **Known benchmark:** global mean temperature trend since 1980 is roughly 0.15–0.2 °C/decade. If your pipeline gives 2 °C/decade, there is a unit or time-axis bug.
6. **Method comparison:** OLS, Sen, and MK should agree on the sign for a clean series. If they disagree, inspect outliers and seasonality.
7. **UI test:** one significant example (Jakarta), one weak/method-dependent example (Wisconsin), one non-significant synthetic series. Make sure the badges and text match the numbers.

### 7.7 A 48-hour plan

| Hours | Work |
|---|---|
| 0–4 | Data: bundle 2 CSVs; parse and QC; write `trend.py`; run synthetic tests |
| 4–10 | Streamlit layout: sidebar variable/region/period; time-series chart; seasonal panel |
| 10–16 | Significance panel: OLS + CI + HAC p; Sen + MK; plain-language verdict |
| 16–22 | Second region and sign-flip comparison; methods/citation panel; CSV export |
| 22–28 | Trend map (stretch) or extra polish; validate numbers against the team script |
| 28–34 | Demo story, screenshots, 7-slide deck or 30-second video |
| 34–40 | References, AI disclosure, submission fields |
| 40–48 | Buffer, test in a logged-out browser, submit early |

### 7.8 `requirements.txt`

```text
numpy>=1.26
pandas>=2.2
scipy>=1.11
statsmodels>=0.14
pymannkendall==1.4.3
xarray>=2024.1
matplotlib>=3.8
plotly>=5.20
streamlit>=1.35
rioxarray>=0.15
netCDF4>=1.6
requests>=2.31
```

Optional: `dask`, `h5netcdf`, `cartopy`, `geopandas`, `folium`, `streamlit-folium`.

Pin exact versions in the repo after testing. A `requirements.txt` that installs a future breaking version the night before the demo is a risk.

---

## 8. Case study: the same variable, opposite signs

The team's NASA POWER sample (`assets/power_monthly_*.csv`, `AOD_55`, 2001–2025) gives a concrete illustration. These numbers were recomputed with the functions in this guide; they are a sanity check, not the final app output. `AOD_55` is CERES SYN1deg, not MODIS-Aqua; the hero example may differ.

| Site | Period | n months | Mean AOD | OLS slope/decade (p) | OLS 95% CI | Sen slope/decade (95% CI) | MK p | Seasonal MK p | HAC OLS p |
|---|---|---|---|---|---|---|---|---|---|
| Wisconsin | 2001–2025 | 300 | 0.211 | −0.0078 (0.056) | −0.0158 to +0.0002 | −0.0100 (−0.0167 to −0.0032) | 0.0033 | 0.0015 | 0.128 |
| Jakarta | 2001–2025 | 300 | 0.398 | +0.0373 (<0.001) | +0.0282 to +0.0464 | +0.0378 (+0.0298 to +0.0455) | <0.001 | <0.001 | <0.001 |

What this table teaches:

1. **Regional sign flip.** The same variable decreases over Wisconsin and increases over Jakarta. A global mean would hide both. This is exactly the challenge's point.
2. **Method sensitivity.** Wisconsin is "not significant" by OLS with HAC (p = 0.13), "significant" by Seasonal MK (p = 0.0015), and "borderline" by annual MK (p = 0.050). The sign is consistent, but the evidence depends on the method. Report it as **method-dependent**, not as a strong trend.
3. **Autocorrelation matters.** The deseasonalized OLS p-value for Wisconsin is 0.056; HAC widens the CI and gives p = 0.128. The naive CI would overstate confidence.
4. **Seasonality matters.** The raw monthly OLS p-value is 0.33; the deseasonalized slope is almost the same but the p-value drops to 0.056 because the residual variance is smaller. Seasonal MK is stronger still.
5. **Effect size matters.** Wisconsin's −0.008 AOD/decade is small relative to the seasonal amplitude (~0.2) and the interannual spread. A significant p-value does not make it large.
6. **Jakarta is robust.** All methods agree; the CI excludes zero by a wide margin. This is the kind of result that makes a clean demo.

**For the app:** show both examples. Let the user see that "trend" is not a single global story. When methods disagree, show a "method-dependent" badge and the method comparison, not a forced yes/no.

---

## 9. Checklists

### Analysis checklist

- [ ] Dates parsed; sorted; duplicates removed.
- [ ] Fill values masked; units checked.
- [ ] Monthly aggregation with a coverage threshold.
- [ ] Seasonal cycle removed or Seasonal MK used.
- [ ] Autocorrelation checked (residual ACF or lag-1 ρ); HAC or MK correction used.
- [ ] Slope, 95% CI, p, n, period, method recorded.
- [ ] At least one robustness check (Sen + MK or annual means).
- [ ] Constant/NaN/too-short series handled gracefully.
- [ ] Units converted correctly (per month → per year → per decade).
- [ ] Multiple testing corrected for maps.
- [ ] Known benchmark or synthetic test passed.

### UI checklist

- [ ] Raw series visible, not only the trend line.
- [ ] 12-month mean visible.
- [ ] Trend line with 95% CI band.
- [ ] Slope with units and per-decade denominator.
- [ ] p-value with test name.
- [ ] n and period visible.
- [ ] "No detectable trend" instead of "stable."
- [ ] "Insufficient data" state.
- [ ] Seasonal cycle panel.
- [ ] Methods/citation expander.
- [ ] CSV/PNG export.
- [ ] Worked example button.
- [ ] Mobile-readable labels and font sizes.

### Claims checklist

- [ ] I am not saying "proven."
- [ ] I am not saying "no trend" from p > 0.05.
- [ ] I am not extrapolating beyond the data.
- [ ] I am not attributing cause from correlation alone.
- [ ] I am not cherry-picking the steepest region or period.
- [ ] I report the effect size, not only the p-value.
- [ ] I state the data product and access date.
- [ ] I disclose AI assistance if used.

---

## 10. References and further reading

**Methods**

- Mann, H. B. (1945). Nonparametric tests against trend. *Econometrica*.
- Kendall, M. G. (1975). *Rank Correlation Methods*.
- Sen, P. K. (1968). Estimates of the regression coefficient based on Kendall's tau. *JASA*.
- Theil, H. (1950). A rank-invariant method of linear and polynomial regression analysis.
- Hirsch, R. M., & Slack, J. R. (1984). A nonparametric trend test for seasonal data with serial dependence. *Water Resources Research*.
- Hamed, K. H., & Rao, A. R. (1998). A modified Mann–Kendall trend test for autocorrelated data. *Journal of Hydrology*.
- Yue, S., & Wang, C. Y. (2004). The Mann–Kendall test modified by effective sample size to detect trend in serially correlated hydrological series. *Water Resources Management*.
- Pettitt, A. N. (1979). A non-parametric approach to the change-point problem. *Applied Statistics*.
- Santer, B. D., et al. (2000). Statistical significance of trends and trend differences in layer-average atmospheric temperature time series. *JGR*.
- Zhang, X., et al. (2000). Temperature and precipitation trends in Canada during the 20th century. *Atmosphere-Ocean*.

**Tools**

- KNMI Climate Explorer: https://climexp.knmi.nl/start.cgi
- NASA Giovanni: https://giovanni.gsfc.nasa.gov/giovanni/
- Giovanni User Guide: https://giovanni.gsfc.nasa.gov/giovanni/doc/UsersManualworkingdocument.docx.html
- Trends.Earth: https://trends.earth/ ; docs: http://docs.trends.earth/en/latest/
- Google Earth Engine: https://earthengine.google.com/
- GEE `linearFit`: https://developers.google.com/earth-engine/apidocs/ee-reducer-linearfit
- GEE `sensSlope`: https://developers.google.com/earth-engine/apidocs/ee-reducer-sensslope
- Copernicus Climate Data Store: https://cds.climate.copernicus.eu/
- Climate Pulse: https://pulse.climate.copernicus.eu/
- NASA POWER: https://power.larc.nasa.gov/
- AppEEARS: https://appeears.earthdatacloud.nasa.gov/

**Python**

- `scipy.stats.linregress`: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.linregress.html
- `scipy.stats.theilslopes`: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html
- `statsmodels` OLS: https://www.statsmodels.org/stable/regression.html
- `statsmodels` HAC: https://www.statsmodels.org/stable/generated/statsmodels.regression.linear_model.OLS.fit.html
- `pymannkendall`: https://pypi.org/project/pymannkendall/
- `xarray` resampling: https://docs.xarray.dev/en/stable/user-guide/time-series.html
- `xarray.polyfit`: https://docs.xarray.dev/en/stable/generated/xarray.DataArray.polyfit.html

---

*Prepared for the Jakarta NASA Space Apps 2026 team. Raw API checks, simulation logs, and tool notes: `_raw/trend-notes.md`.*
