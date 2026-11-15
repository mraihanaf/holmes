# Analyst agent

The agentic feature is one narrow “Analyst” agent that performs a visible investigation. It is not a general autonomous assistant, and it is not allowed to invent numbers.

## 1. Product behavior

The user opens a case or asks:

> Is Jakarta’s air getting cleaner or dirtier?

The Analyst:

1. Restates the question as a testable plan.
2. Chooses 3–5 variables from the catalog.
3. Ensures the data exists (cache first, jobs if needed).
4. Runs the trend tests through the Python stats service.
5. Ranks the variables by signal strength and significance.
6. Writes a short brief with citations to computed results.
7. Verifies every number against the results.
8. Publishes the brief to the case.

The UI shows the plan, tool calls, progress, and final brief. The user can approve an expensive scan or cancel the run.

## 2. Scope

### MVP

- Curated cases only.
- 3–5 variables per investigation.
- One region and one period per run.
- One LLM provider and one model.
- A visible trace with tool calls and status.
- A verification step before publish.
- A deterministic fallback when the LLM or agent is unavailable.

### Stretch

- Arbitrary place from the command bar.
- Compare two regions.
- “Surprise me” scan ranked by signal-to-noise.
- Follow-up questions in the same thread.
- Human-edited brief.

### Non-goals

- Multi-agent debate or simulation.
- Autonomous browsing of arbitrary websites.
- Long-term memory across users.
- Code execution chosen by the LLM.
- Claims of causation.
- Unbounded tool loops.

## 3. Components

```text
Convex Agent
  thread + messages + streaming + tool calls

Convex Workflow
  durable investigation steps, sleeps, events, retries

Convex Workpool
  parallel data fetches with per-source concurrency

Rate Limiter
  LLM tokens and source quotas

Python stats service
  deterministic trend computation

Convex database
  series, analyses, cases, agent run state
```

## 4. Workflow

```text
start
  → planning
  → awaiting_approval (optional)
  → ensuring_data
  → analyzing
  → ranking
  → narrating
  → verifying
  → published
  → failed / cancelled
```

### Step details

| Step | What happens | Output |
|---|---|---|
| **plan** | LLM turns the question into a structured plan: variables, region, period, tests | `InvestigationPlan` |
| **approval** | If the plan exceeds a cost/time threshold, wait for a UI event | `approved` / `rejected` |
| **ensure data** | Cache-first; Workpool fetches missing series | `seriesIds` |
| **analyze** | Call the Python stats service for each series; batch for FDR | `AnalysisResult[]` |
| **rank** | Deterministic ranking by significance, effect size, and completeness | `RankedFinding[]` |
| **narrate** | LLM writes a brief using only the ranked findings | `BriefDraft` |
| **verify** | Deterministic check of every number, unit, source, and caveat | `VerifiedBrief` |
| **publish** | Mutation stores the brief and links it to the case | `CaseView` |

The workflow handler must be deterministic. All network calls, LLM calls, and writes happen in steps.

## 5. Tools

Tools are typed Convex functions. The agent cannot call arbitrary URLs or code.

| Tool | Input | Output | Side effects |
|---|---|---|---|
| `listVariables` | `{ place, period? }` | `Variable[]` with coverage | None |
| `fetchSeries` | `{ variableKey, region, period }` | `{ seriesId, status, jobId? }` | May enqueue a data job |
| `computeTrend` | `{ seriesId, options }` | `StatsResult` | Writes an analysis |
| `scanPlace` | `{ region, variableKeys, period }` | `RankedFinding[]` | Runs batch analysis with FDR |
| `getProvenance` | `{ seriesId }` | `Provenance` | None |
| `saveBrief` | `{ caseId, text, findingIds }` | `{ briefId }` | Writes a draft; publish is separate |

### Tool rules

- Every tool validates its input with Convex validators.
- Every tool returns a typed error, not a raw exception.
- `fetchSeries` is idempotent and cache-first.
- `computeTrend` uses the same method version as the UI.
- `scanPlace` caps the number of variables (MVP: 5).
- `saveBrief` does not publish; `publish` requires verification.

## 6. Convex code sketch

```ts
// convex/agent.ts
import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";

export const analyst = new Agent(components.agent, {
  name: "Analyst",
  languageModel: /* provider model */,
  instructions: `
    You are an Earth-science trend analyst.
    Use only the provided tools. Do not invent data or numbers.
    Ask for a scan only when the question requires it.
    Every claim must cite a computed finding.
    A trend is not a cause.
  `,
  tools: {
    listVariables,
    fetchSeries,
    computeTrend,
    scanPlace,
    getProvenance,
    saveBrief,
  },
});
```

```ts
// convex/workflows.ts
import { WorkflowManager } from "@convex-dev/workflow";
import { components } from "./_generated/api";

export const workflow = new WorkflowManager(components.workflow);

export const investigation = workflow
  .define({
    args: { caseId: v.id("cases"), question: v.string() },
  })
  .handler(async (step, args) => {
    const plan = await step.runAction(internal.agent.plan, args, { retry: true });
    const series = await step.runAction(
      internal.data.ensureSeriesBatch,
      { plan },
      { retry: true },
    );
    const results = await step.runAction(
      internal.stats.analyzeBatch,
      { seriesIds: series.ids, options: plan.options },
      { retry: true },
    );
    const ranked = await step.runMutation(
      internal.analysis.rank,
      { caseId: args.caseId, results },
    );
    const draft = await step.runAction(
      internal.agent.narrate,
      { caseId: args.caseId, ranked },
      { retry: true },
    );
    const verified = await step.runAction(
      internal.agent.verify,
      { draft, ranked },
      { retry: true },
    );
    await step.runMutation(
      internal.cases.publishBrief,
      { caseId: args.caseId, brief: verified },
    );
  });
```

This is a sketch, not final code. The actual model call, tool signatures, and result validators must match the implementation.

## 7. Prompting contract

### System prompt

- Role: Earth-science trend analyst.
- Audience: high-school/college students and scientifically literate public.
- Tone: direct, calm, no hype.
- Rules:
  - Use only the tools.
  - Never invent a number, unit, date, or source.
  - Distinguish “no significant trend” from “no change.”
  - Say “associated with” or “consistent with,” not “caused by.”
  - If the data is insufficient, say so.
  - Cite the source and dataset version for every finding.
  - Keep the brief under 200 words unless the user asks for detail.

### Structured output

The plan and brief should use a JSON schema / typed object, not free-form parsing:

```ts
type InvestigationPlan = {
  question: string;
  region: Region;
  period: { start: string; end: string };
  variables: Array<{ key: string; reason: string }>;
  tests: "mann_kendall" | "ols";
  seasonal: "raw" | "deseasonalize" | "annual";
  maxCostUsd: number;
};
```

```ts
type BriefDraft = {
  headline: string;
  summary: string;
  findings: Array<{
    variableKey: string;
    findingId: string;
    sentence: string;
  }>;
  caveats: string[];
  sources: string[];
};
```

## 8. Verification

The verify step is deterministic and mandatory.

Checks:

1. Every number in the brief appears in a computed finding, within the displayed rounding.
2. Every finding ID exists and belongs to this run.
3. Every unit matches the variable.
4. Every source and dataset version matches the series provenance.
5. No causal verb is used (`caused`, `because of`, `due to`) unless the sentence is explicitly framed as a hypothesis.
6. A non-significant result is not described as “no change.”
7. The brief does not exceed the word limit.
8. The brief includes at least one caveat when the series is short, incomplete, or autocorrelated.

If verification fails, the workflow regenerates the brief once. If it fails again, publish the deterministic verdict without the LLM prose and show a notice.

## 9. UI

`AnalystPanel` shows:

- Thread messages.
- A plan card with variables, region, period, and estimated cost.
- Tool-call cards: name, status, duration, result summary.
- A progress bar for data jobs.
- An “Approve scan” button when the workflow awaits approval.
- Streaming brief text.
- A verification badge: `VERIFIED` or `NEEDS REVIEW`.
- Citations that open the evidence panel.

The panel must remain useful if the agent is disabled: show the deterministic verdict and a short explanation.

## 10. Cost and loop limits

| Limit | Value |
|---|---|
| Variables per scan | 5 |
| Tool calls per run | 20 |
| LLM retries per step | 2 |
| Investigation budget | 10 minutes end-to-end for the MVP; each action step stays under the Convex action limit |
| Cost per investigation | configurable cap, default $0.25 |
| Concurrent agent runs per IP | 1 |
| Brief word limit | 200 |

Use a cheap model for planning and ranking; use a stronger model only for the final brief if the budget allows. Cache the plan and results for repeated questions on the same case.

## 11. Evaluation

Before the demo, run three scripted cases:

1. **Jakarta temperature:** plan includes T2M; result significant; brief cites the computed slope.
2. **Wisconsin AOD:** plan includes AOD; result depends on the dataset; brief does not overclaim.
3. **Short series:** plan is valid; stats return `insufficient_data`; brief says the record is too short.

For each, check:

- Tool calls are in the expected order.
- No invented numbers.
- Citations match provenance.
- The deterministic fallback produces the same statistical result.
- The run finishes within the time and cost caps.

## 12. Failure handling

| Failure | Behavior |
|---|---|
| LLM rate limit | Retry with backoff; after 2 failures, use deterministic verdict |
| LLM returns invalid JSON | Repair once with a schema prompt; then fail the step |
| Data job fails | Show the source error; allow the user to retry or choose another variable |
| Stats service down | Publish the series and a “trend unavailable” notice; do not invent a verdict |
| Verification fails twice | Publish the deterministic verdict, not the LLM prose |
| User cancels | Workflow stops; completed steps remain; no publish |

## 13. Acceptance criteria

- The agent runs only on curated cases in the MVP.
- Every published number is traceable to a computed analysis.
- The deterministic flow works with the agent disabled.
- The UI shows the plan, tool calls, progress, and verification status.
- The agent cannot fetch arbitrary URLs or execute arbitrary code.
- A failed verification never publishes LLM prose as fact.
