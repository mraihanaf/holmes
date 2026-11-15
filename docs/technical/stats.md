# Statistics engine

The statistics engine is a small, stateless Python service. It is the only place that computes trend statistics. The UI, the agent, and the prewarm script all call the same service through Convex.

## 1. Goals

- Scientific validity over feature count.
- One implementation, one method version, one source of truth.
- Reproducible results from the same series and options.
- Plain-language output that a non-specialist can read.
- Explicit caveats; no causal claims.

## 2. Service boundary

```text
Convex action
  → POST /analyze or /analyze/batch
  → typed JSON result
  → Convex stores the result in `analyses`
```

The service:

- has no database,
- does not fetch data,
- does not know about users,
- receives a complete series and options,
- returns a complete result.

This keeps it testable and replaceable.

## 3. Request contract

```json
{
  "series_id": "series_123",
  "variable_key": "T2M",
  "units": "°C",
  "frequency": "monthly",
  "aggregation": "mean",
  "points": [
    {"ts": "2000-01-01T00:00:00Z", "value": 26.1},
    {"ts": "2000-02-01T00:00:00Z", "value": 26.4}
  ],
  "options": {
    "seasonal": "deseasonalize",
    "test": "mann_kendall",
    "autocorrelation": "hamed_rao",
    "confidence": 0.95,
    "min_years": 10
  }
}
```

`seasonal` values: `raw`, `deseasonalize`, `annual`.
`test` values: `mann_kendall`, `ols`.
`autocorrelation` values: `none`, `hamed_rao`.

## 4. Response contract

```json
{
  "method_version": "1.0.0",
  "status": "ok",
  "n": 312,
  "expected_n": 312,
  "completeness": 1.0,
  "start": "2000-01-01T00:00:00Z",
  "end": "2025-12-01T00:00:00Z",
  "slope_per_decade": 0.214,
  "slope_ci95": [0.151, 0.277],
  "sen_slope_per_decade": 0.201,
  "p_value": 0.00004,
  "test": "hamed_rao_mann_kendall",
  "significant": true,
  "direction": "increasing",
  "verdict": "Air temperature at 2 m increased by about 0.21 °C per decade. The trend is statistically significant (p < 0.001).",
  "caveats": [
    "Monthly values are autocorrelated; the Hamed-Rao correction is applied.",
    "The result is a statistical association, not a causal attribution."
  ],
  "diagnostics": {
    "missing": 0,
    "provisional": 0,
    "seasonal_adjusted": true,
    "min_n_met": true
  }
}
```

When the series is too short or too incomplete:

```json
{
  "method_version": "1.0.0",
  "status": "insufficient_data",
  "n": 48,
  "expected_n": 120,
  "completeness": 0.4,
  "verdict": "There are only 4 years of usable data. A trend test needs at least 10 years.",
  "caveats": ["Increase the period or choose a variable with longer coverage."]
}
```

The UI must render `status != "ok"` as a clear, non-error explanation.

## 5. Methods

### 5.1 Completeness and minimum length

- Monthly: require at least **10 years** (120 expected months) and at least **90%** completeness.
- Annual: require at least **15 annual values**.
- If the period is shorter, return `insufficient_data`.
- If completeness is between 70% and 90%, return `ok` with a `low_completeness` caveat.
- If completeness is below 70%, return `insufficient_data`.
- Exclude provisional months by default.

These thresholds are defaults; they live in one config object and are returned in the result.

### 5.2 Seasonal handling

Monthly Earth-science series usually contain a strong seasonal cycle. A raw Mann-Kendall test on monthly values can report a trend that is really the seasonal pattern.

Default: `deseasonalize`.

Method:

1. Compute the mean for each calendar month over the analysis period.
2. Subtract that month’s mean from each observation.
3. Run the trend test on the anomalies.

Offer a `raw` toggle for education, but label it clearly. Also offer an `annual` view: aggregate to annual means or totals, then test. The annual view is the easiest for a non-specialist to understand.

If the period is shorter than 10 years, the monthly climatology is unstable; return a caveat and prefer the annual view.

### 5.3 OLS slope and confidence interval

- Use `scipy.stats.linregress` on the time index (years) and values.
- Slope per decade = slope per year × 10.
- Confidence interval from the standard error and the t-distribution at the requested confidence level (default 95%).
- Report `n`, `slope_per_decade`, `slope_ci95`.
- OLS assumes independent errors; it is a descriptive fit, not the significance verdict by itself.

### 5.4 Sen’s slope

- Use `scipy.stats.theilslopes` or `pymannkendall`’s Sen slope.
- Robust to outliers.
- Report `sen_slope_per_decade`.
- If OLS and Sen disagree strongly, add a caveat.

### 5.5 Mann-Kendall

- Use `pymannkendall.original_test` for the basic test.
- For monthly series, use `pymannkendall.hamed_rao_modification_test` to correct for autocorrelation.
- Report the test name, p-value, and trend direction.
- Do not report a p-value without the sample size and the test name.

### 5.6 Multiple testing

For a scan of multiple variables or grid cells, apply Benjamini-Hochberg FDR:

```python
from statsmodels.stats.multitest import multipletests
reject, p_adj, _, _ = multipletests(p_values, alpha=0.05, method="fdr_bh")
```

Report both raw and adjusted p-values. The UI should say “significant after FDR correction” when applicable.

### 5.7 Verdict text

The verdict is generated from the computed numbers, not by an LLM:

- Direction: increasing, decreasing, or no significant trend.
- Effect: slope per decade with units.
- Confidence: p-value and test name.
- Caveat: one sentence about autocorrelation, seasonality, or data length.

Example:

> Air temperature at 2 m increased by about 0.21 °C per decade. The trend is statistically significant (Hamed-Rao Mann-Kendall, p < 0.001, n = 312). This is a statistical association, not a causal attribution.

The agent may rewrite the prose, but the verification step must check every number against the result.

## 6. Python service layout

The service is the Nx project `stats-engine` at `apps/stats-engine`. Nx exposes its `serve`, `test`, and `lint` targets; `uv` remains the Python environment and dependency manager.

```text
apps/stats-engine/
  app/
    __init__.py
    main.py          # FastAPI app, auth, routes
    models.py        # Pydantic request/response models
    methods.py       # pure statistical functions
    verdict.py       # deterministic verdict text
    config.py        # thresholds and method version
  tests/
    test_methods.py
    test_contract.py
    fixtures/
      jakarta_t2m.json
      wisconsin_aod.json
  pyproject.toml
  uv.lock
```

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/healthz` | Liveness and method version |
| `POST` | `/analyze` | One series |
| `POST` | `/analyze/batch` | Up to 500 series; FDR across the batch |
| `POST` | `/analyze/cell` | One series per variable; all window x season combinations for a lazy cell |

### Auth and limits

- Require `X-Stats-Secret: <shared secret>` on every request except `/healthz`.
- Request body limit: 10 MB.
- Batch limit: 500 series.
- Timeout: 30 s per request.
- No external network calls from the service.
- Return `422` for invalid input, `401` for a bad secret, `500` for an internal error.

### Dependencies

Pin versions in `pyproject.toml`:

- `fastapi`
- `uvicorn`
- `pydantic`
- `numpy`
- `scipy`
- `pymannkendall`
- `statsmodels`
- `pytest`

## 7. Validation

### Golden fixtures

Keep two fixtures from the research:

1. **Jakarta T2M, 2000–2025, monthly:** expected OLS slope about `+0.214 °C/decade`, Mann-Kendall `p < 0.001`.
2. **Wisconsin AOD, 2002–2025, monthly:** expected slope about `-0.010/decade`, `p = 0.003` for the CERES series used in the research. Source choice matters; record the exact fixture source.

Tests compare within a tolerance appropriate to the data source. Do not hardcode a p-value if the fixture source changes.

### Method tests

- Known increasing series → positive slope, significant.
- Known decreasing series → negative slope, significant.
- White noise → not significant at the expected rate.
- Seasonal cycle with no trend → deseasonalized p-value not significant; raw p-value may be misleading.
- Short series → `insufficient_data`.
- Missing months → completeness reported correctly.
- Batch FDR → adjusted p-values monotonic and bounded.

### Cross-checks

- Compare OLS with `scipy.stats.linregress`.
- Compare Sen with `scipy.stats.theilslopes`.
- Compare Mann-Kendall with `pymannkendall`.
- If a result is surprising, check the series plot before changing the method.

## 8. Method versioning

`method_version` is a semantic version in `config.py`.

Bump it when:

- a test or correction changes,
- a default threshold changes,
- the seasonal adjustment changes,
- the verdict logic changes in a way that affects interpretation.

The Convex analysis cache key includes `method_version`. Old results remain readable; new requests compute a new entry.

## 9. Caveats and limitations

The UI must show these when relevant:

- A trend is a statistical association, not proof of cause.
- Monthly data is autocorrelated; Hamed-Rao reduces, but does not eliminate, this.
- A short record may hide a trend or make a real trend non-significant.
- A significant trend may be driven by a few extreme years; check Sen’s slope and the chart.
- Multiple testing inflates false positives; use FDR for scans.
- Dataset choice can change the result. Show the source and version.
- Satellite products have retrieval uncertainties and gaps.

## 10. Acceptance criteria

- The same input and method version produce the same output.
- Every result includes `n`, `slope_per_decade`, `slope_ci95`, `sen_slope_per_decade`, `p_value`, `test`, `significant`, `direction`, `verdict`, `caveats`, `method_version`.
- `insufficient_data` is a normal response, not a 500.
- The service has no database and no external network calls.
- Golden tests pass for the two research fixtures within tolerance.
- The agent cannot publish a brief whose numbers fail the verification check.


### `/analyze/cell` (lazy global board)

One request carries the 10 POWER series for a MERRA-2 cell. The service
returns every variable x window x season combination, which is 200 trend
results. This is the endpoint the `stats:ensureCity` Convex action calls when
a user inspects an uncached city.

Request:

```json
{
  "cell_id": "c167_458",
  "series": [
    {
      "variable_key": "T2M",
      "units": "°C",
      "points": [{"ts": "1981-01-01T00:00:00Z", "value": 26.1}]
    }
  ],
  "windows": [{"id": "25y", "start": 2001, "end": 2025}],
  "seasons": ["all", "DJF", "MAM", "JJA", "SON"]
}
```

Response:

```json
{
  "method_version": "1.0.0",
  "cell_id": "c167_458",
  "results": [
    {
      "variable_key": "T2M",
      "window": "25y",
      "season": "all",
      "result": {"status": "ok", "slope_per_decade": 0.23, "...": "..."}
    }
  ]
}
```

Convex computes `qVar` across the 10 variables for each window/season and
stores the compact board projection. Board q-values across cached cells are
computed by `trends:cachedBoard` on read.
