/**
 * Pure transforms from a stats-service cell response to the stored cell
 * document fields. Kept separate from the action so it can be reasoned about
 * without network or database access.
 */

import { benjaminiHochberg, evidenceLevel } from "./fdr";
import {
  annualValues,
  directionIndex,
  round,
  standardizedSlope,
  yearsWithData,
  type SeriesValues,
} from "./trend";
import { SEASONS, VARIABLES, WINDOWS, windowStart } from "./variables";

export type TrendResult = {
  method_version?: string;
  status?: string;
  n?: number;
  completeness?: number;
  slope_per_decade?: number | null;
  slope_ci95?: number[] | null;
  p_value?: number | null;
  p_value_ols?: number | null;
  ols_slope_per_decade?: number | null;
  significant?: boolean;
  method_dependent?: boolean;
  direction?: string;
  [key: string]: unknown;
};

export type CellResultEntry = {
  variable_key: string;
  window: string;
  season: string;
  result: TrendResult;
};

export type CellAnalysisResponse = {
  method_version?: string;
  results?: CellResultEntry[];
};

export type CellSeries = Record<string, SeriesValues>;

export type CellRecords = Record<string, Record<string, Record<string, unknown>>>;

export type BuiltCellResults = {
  records: CellRecords;
  board: Record<string, Record<string, Array<number | null>>>;
  pValues: Record<string, Record<string, number | null>>;
};

function emptyRecord(start: number): Record<string, unknown> {
  return {
    status: "insufficient_data",
    slope: null,
    ci: null,
    p: null,
    pOls: null,
    olsSlope: null,
    significant: false,
    methodDependent: false,
    direction: "none",
    n: 0,
    nYears: 0,
    coverage: 0,
    z: null,
    q: null,
    qVar: null,
    significantFdr: false,
    significantVar: false,
    evidence: "insufficient",
    evidenceVar: "insufficient",
    effectiveStart: start,
  };
}

function recordFromResult(
  result: TrendResult,
  start: number,
  series: SeriesValues,
  season: (typeof SEASONS)[number],
): Record<string, unknown> {
  const years = yearsWithData(series, start);
  const annual = annualValues(series, start, season);
  const z = standardizedSlope(result.slope_per_decade ?? null, annual);
  return {
    status: result.status ?? "insufficient_data",
    slope: round(result.slope_per_decade ?? null),
    ci: Array.isArray(result.slope_ci95) ? result.slope_ci95.map((value) => round(value)) : null,
    p: round(result.p_value ?? null),
    pOls: round(result.p_value_ols ?? null),
    olsSlope: round(result.ols_slope_per_decade ?? null),
    significant: Boolean(result.significant),
    methodDependent: Boolean(result.method_dependent),
    direction: result.direction ?? "none",
    n: typeof result.n === "number" ? result.n : 0,
    nYears: years.length,
    coverage: round(result.completeness ?? null, 4),
    z,
    q: null,
    qVar: null,
    significantFdr: false,
    significantVar: false,
    evidence: "insufficient",
    evidenceVar: "insufficient",
    effectiveStart: years[0] ?? start,
  };
}

export function buildCellResults(
  analysis: CellAnalysisResponse,
  series: CellSeries,
): BuiltCellResults {
  const lookup = new Map<string, TrendResult>();
  for (const entry of analysis.results ?? []) {
    lookup.set(`${entry.variable_key}|${entry.window}|${entry.season}`, entry.result);
  }

  const records: CellRecords = {};
  const board: Record<string, Record<string, Array<number | null>>> = {};
  const pValues: Record<string, Record<string, number | null>> = {};

  for (const variable of VARIABLES) {
    records[variable.key] = {};
    board[variable.key] = {};
    pValues[variable.key] = {};
    for (const window of WINDOWS) {
      for (const season of SEASONS) {
        const key = `${window.id}|${season}`;
        const result = lookup.get(`${variable.key}|${window.id}|${season}`);
        const record = result
          ? recordFromResult(result, window.start, series[variable.key] ?? [], season)
          : emptyRecord(window.start);
        records[variable.key][key] = record;
        board[variable.key][key] = [
          record.slope as number | null,
          record.z as number | null,
          record.nYears as number | null,
          record.coverage as number | null,
          directionIndex(record.direction as string),
          record.methodDependent ? 1 : 0,
        ];
        pValues[variable.key][key] = record.p as number | null;
      }
    }
  }

  // BH across the 10 variables for each window/season within this cell.
  for (const window of WINDOWS) {
    for (const season of SEASONS) {
      const key = `${window.id}|${season}`;
      const entries = VARIABLES.map((variable) => records[variable.key][key]);
      const adjusted = benjaminiHochberg(entries.map((entry) => entry.p as number | null));
      entries.forEach((entry, index) => {
        const q = adjusted[index];
        entry.qVar = q;
        entry.significantVar = entry.status === "ok" && q < 0.05;
        entry.evidenceVar = evidenceLevel(
          q,
          entry.nYears as number,
          entry.methodDependent as boolean,
        );
      });
    }
  }

  return { records, board, pValues };
}

export function cellWindowStart(windowId: string): number {
  return windowStart(windowId);
}
