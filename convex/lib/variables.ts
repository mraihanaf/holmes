/**
 * Canonical variable metadata shared by the Convex actions and the POWER
 * client. Keys and units must match the `variables` table and the Python
 * stats engine.
 */

export type VariableMeta = {
  key: string;
  units: string;
  aggregation: "mean" | "sum";
};

export const METHOD_VERSION = "1.0.0";

export const VARIABLES: readonly VariableMeta[] = [
  { key: "T2M", units: "\u00b0C", aggregation: "mean" },
  { key: "T2M_MIN", units: "\u00b0C", aggregation: "mean" },
  { key: "T2M_MAX", units: "\u00b0C", aggregation: "mean" },
  { key: "PRECTOTCORR", units: "mm/day", aggregation: "mean" },
  { key: "GWETROOT", units: "fraction", aggregation: "mean" },
  { key: "GWETTOP", units: "fraction", aggregation: "mean" },
  { key: "RH2M", units: "%", aggregation: "mean" },
  { key: "WS2M", units: "m/s", aggregation: "mean" },
  { key: "ALLSKY_SFC_SW_DWN", units: "MJ/m\u00b2/day", aggregation: "mean" },
  { key: "AOD_55", units: "dimensionless", aggregation: "mean" },
] as const;

export const VARIABLE_KEYS: readonly string[] = VARIABLES.map((variable) => variable.key);

/** Comma-separated parameter list for the POWER monthly point endpoint. */
export const POWER_PARAMETERS = VARIABLE_KEYS.join(",");

export const WINDOWS = [
  { id: "full", start: 1981, end: 2025 },
  { id: "35y", start: 1991, end: 2025 },
  { id: "25y", start: 2001, end: 2025 },
  { id: "15y", start: 2011, end: 2025 },
] as const;

export const SEASONS = ["all", "DJF", "MAM", "JJA", "SON"] as const;

export type Season = (typeof SEASONS)[number];

export const SEASON_MONTHS: Record<Season, number[]> = {
  all: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  DJF: [12, 1, 2],
  MAM: [3, 4, 5],
  JJA: [6, 7, 8],
  SON: [9, 10, 11],
};

export const SERIES_START_YEAR = 1981;
export const SERIES_END_YEAR = 2025;
export const SERIES_MONTHS = (SERIES_END_YEAR - SERIES_START_YEAR + 1) * 12;

export function variableMeta(key: string): VariableMeta | undefined {
  return VARIABLES.find((variable) => variable.key === key);
}

export function unitsForVariable(key: string): string {
  return variableMeta(key)?.units ?? "";
}

export function windowStart(windowId: string): number {
  return WINDOWS.find((window) => window.id === windowId)?.start ?? SERIES_START_YEAR;
}
