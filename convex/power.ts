/**
 * NASA POWER monthly point client.
 *
 * Every city in a MERRA-2 cell shares one reanalysis series, so the lazy
 * cache fetches one full-history series per cell. Values are returned in a
 * fixed order: January 1981 through December 2025 (540 months).
 */

import {
  POWER_PARAMETERS,
  SERIES_END_YEAR,
  SERIES_START_YEAR,
  VARIABLE_KEYS,
} from "./lib/variables";

export const POWER_MONTHLY_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point";
export const POWER_TIMEOUT_MS = 60_000;

export type PowerSeries = Record<string, Array<number | null>>;

export class PowerFetchError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "PowerFetchError";
    this.status = status;
  }
}

export type PowerCell = {
  lat: number;
  lon: number;
};

export function powerMonthKeys(): string[] {
  const keys: string[] = [];
  for (let year = SERIES_START_YEAR; year <= SERIES_END_YEAR; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      keys.push(`${year}${String(month).padStart(2, "0")}`);
    }
  }
  return keys;
}

type PowerPayload = {
  properties?: {
    parameter?: Record<string, Record<string, number | string | null>>;
  };
};

function toValue(raw: number | string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value) || value === -999) return null;
  return value;
}

export async function fetchPowerCell(cell: PowerCell): Promise<PowerSeries> {
  const url = new URL(POWER_MONTHLY_URL);
  url.searchParams.set("parameters", POWER_PARAMETERS);
  url.searchParams.set("community", "AG");
  url.searchParams.set("latitude", String(cell.lat));
  url.searchParams.set("longitude", String(cell.lon));
  url.searchParams.set("start", String(SERIES_START_YEAR));
  url.searchParams.set("end", String(SERIES_END_YEAR));
  url.searchParams.set("format", "JSON");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), POWER_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      throw new PowerFetchError(`POWER request failed with status ${response.status}`, response.status);
    }

    let payload: PowerPayload;
    try {
      payload = (await response.json()) as PowerPayload;
    } catch {
      throw new PowerFetchError("POWER response was not valid JSON");
    }

    const parameters = payload?.properties?.parameter;
    if (!parameters) {
      throw new PowerFetchError("POWER response is missing parameter data");
    }

    const keys = powerMonthKeys();
    const series: PowerSeries = {};
    for (const variable of VARIABLE_KEYS) {
      const values = parameters[variable] ?? {};
      series[variable] = keys.map((key) => toValue(values[key]));
    }
    return series;
  } catch (error) {
    if (error instanceof PowerFetchError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new PowerFetchError("POWER request timed out after 60 seconds");
    }
    const message = error instanceof Error ? error.message : "unknown error";
    throw new PowerFetchError(`POWER request failed: ${message.slice(0, 160)}`);
  } finally {
    clearTimeout(timeout);
  }
}
