/**
 * Small numeric helpers for the cell cache. They mirror the Python prewarm
 * implementation so a live cell and a seeded cell describe the same trend.
 */

import { SEASON_MONTHS, SERIES_MONTHS, SERIES_START_YEAR, type Season } from "./variables";

export type SeriesValues = Array<number | null>;

export function monthTimestamps(): string[] {
  const timestamps: string[] = [];
  for (let index = 0; index < SERIES_MONTHS; index += 1) {
    const year = SERIES_START_YEAR + Math.floor(index / 12);
    const month = (index % 12) + 1;
    timestamps.push(`${year}-${String(month).padStart(2, "0")}-01T00:00:00Z`);
  }
  return timestamps;
}

export function seriesIndex(year: number, month: number): number {
  return (year - SERIES_START_YEAR) * 12 + (month - 1);
}

export function yearsWithData(series: SeriesValues, startYear: number): number[] {
  const years = new Set<number>();
  for (let index = 0; index < series.length; index += 1) {
    if (series[index] === null || series[index] === undefined) continue;
    const year = SERIES_START_YEAR + Math.floor(index / 12);
    if (year >= startYear) years.add(year);
  }
  return [...years].sort((a, b) => a - b);
}

/** Annual means used only to standardize the trend slope into a z score. */
export function annualValues(series: SeriesValues, startYear: number, season: Season): number[] {
  const months = SEASON_MONTHS[season];
  const grouped = new Map<number, number[]>();
  for (let index = 0; index < series.length; index += 1) {
    const value = series[index];
    if (value === null || value === undefined || !Number.isFinite(value)) continue;
    const year = SERIES_START_YEAR + Math.floor(index / 12);
    const month = (index % 12) + 1;
    if (year < startYear || !months.includes(month)) continue;
    const bucket = grouped.get(year) ?? [];
    bucket.push(value);
    grouped.set(year, bucket);
  }
  const minimum = season === "all" ? 10 : Math.max(2, months.length - 1);
  return [...grouped.entries()]
    .sort(([a], [b]) => a - b)
    .filter(([, values]) => values.length >= minimum)
    .map(([, values]) => values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function standardizedSlope(
  slopePerDecade: number | null | undefined,
  annual: number[],
): number | null {
  if (slopePerDecade === null || slopePerDecade === undefined || !Number.isFinite(slopePerDecade)) {
    return null;
  }
  const values = annual.filter((value) => Number.isFinite(value));
  if (values.length < 5) return null;

  const count = values.length;
  const meanX = (count - 1) / 2;
  const meanY = values.reduce((sum, value) => sum + value, 0) / count;
  let covariance = 0;
  let variance = 0;
  for (let index = 0; index < count; index += 1) {
    const dx = index - meanX;
    covariance += dx * (values[index] - meanY);
    variance += dx * dx;
  }
  if (variance === 0) return null;
  const slope = covariance / variance;
  const intercept = meanY - slope * meanX;
  const detrended = values.map((value, index) => value - (slope * index + intercept));
  const center = median(detrended);
  const mad = median(detrended.map((value) => Math.abs(value - center)));
  const scale = 1.4826 * mad;
  if (scale <= 0) return null;
  return round(slopePerDecade / (scale * 10), 6);
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function directionIndex(direction: string | null | undefined): number {
  if (direction === "increasing") return 1;
  if (direction === "decreasing") return -1;
  return 0;
}

export function directionName(index: number | null | undefined): "increasing" | "decreasing" | "none" {
  if (index === 1) return "increasing";
  if (index === -1) return "decreasing";
  return "none";
}

export function round(value: number | null | undefined, digits = 6): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
