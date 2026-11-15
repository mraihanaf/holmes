import type {
  City,
  CityNote,
  CityTrends,
  CompositeResult,
  Direction,
  EvidenceLevel,
  Season,
  SeriesData,
  SeriesPoint,
  TrendRecord,
  Variable,
  ViewMode,
  WindowDef,
  WindowId,
} from "./types";

export const SEASON_LABEL: Record<Season, string> = {
  all: "ALL MONTHS",
  DJF: "DJF · DEC–FEB",
  MAM: "MAM · MAR–MAY",
  JJA: "JJA · JUN–AUG",
  SON: "SON · SEP–NOV",
};

export function windowById(trends: CityTrends, id: WindowId): WindowDef {
  return trends.windows.find((w) => w.id === id) ?? trends.windows[0];
}

export function recordKey(windowId: WindowId, season: Season) {
  return `${windowId}|${season}`;
}

/** The lens shows one variable alone, or a composite when several are selected. */
export function modeFor(variableKeys: string[]): ViewMode {
  return variableKeys.length > 1 ? "combined" : "single";
}

export function hasCityRecords(trends: CityTrends, cityId: string | null | undefined): boolean {
  if (!cityId) return false;
  const entry = trends.cities[cityId];
  return Boolean(entry && Object.keys(entry).length);
}

export function getRecord(
  trends: CityTrends,
  cityId: string | null | undefined,
  variableKey: string,
  windowId: WindowId,
  season: Season,
): TrendRecord | null {
  if (!cityId) return null;
  return trends.cities[cityId]?.[variableKey]?.[recordKey(windowId, season)] ?? null;
}

export interface CompactRecordInput {
  slope: number | null;
  z: number | null;
  q?: number | null;
  p?: number | null;
  nYears?: number;
  coverage?: number;
  direction?: Direction;
  evidence?: EvidenceLevel;
  methodDependent?: boolean;
  status?: "ok" | "insufficient_data";
  significantFdr?: boolean;
  effectiveStart?: number;
}

/**
 * Build a full TrendRecord from the compact board fields that Convex caches.
 * Detail fields that a board row cannot know (CI, OLS cross-check, raw p) stay
 * null so the UI can tell a cached summary from a fully analysed cell.
 */
export function compactRecord(input: CompactRecordInput): TrendRecord {
  const status = input.status ?? (input.slope === null ? "insufficient_data" : "ok");
  const nYears = input.nYears ?? 0;
  const coverage = input.coverage ?? 0;
  const q = input.q ?? 1;
  const direction =
    input.direction ??
    (input.slope === null || input.slope === 0
      ? "none"
      : input.slope > 0
        ? "increasing"
        : "decreasing");
  const methodDependent = input.methodDependent ?? false;
  const rawEvidence: EvidenceLevel =
    input.evidence ??
    (status !== "ok" || input.slope === null
      ? "insufficient"
      : q <= 0.05
        ? "strong"
        : q <= 0.1
          ? "moderate"
          : "weak");
  const evidence: EvidenceLevel =
    methodDependent && rawEvidence === "strong" ? "moderate" : rawEvidence;
  const significantFdr = input.significantFdr ?? (status === "ok" && q <= 0.05);
  return {
    status,
    slope: input.slope,
    ci: null,
    p: input.p ?? null,
    pOls: null,
    olsSlope: null,
    significant: significantFdr,
    methodDependent,
    direction,
    n: nYears * 12,
    nYears,
    coverage,
    z: input.z,
    effectiveStart: input.effectiveStart ?? 0,
    q,
    qVar: q,
    significantFdr,
    significantVar: false,
    evidence,
    evidenceVar: evidence,
  };
}

export function uncachedRecord(): TrendRecord {
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
    effectiveStart: 0,
    q: 1,
    qVar: 1,
    significantFdr: false,
    significantVar: false,
    evidence: "insufficient",
    evidenceVar: "insufficient",
  };
}

function trendDetailScore(record: TrendRecord): number {
  let score = 0;
  if (record.ci) score += 4;
  if (record.pOls !== null) score += 2;
  if (record.p !== null) score += 1;
  if (record.effectiveStart > 0) score += 1;
  if (record.n > 0) score += 1;
  return score;
}

/**
 * Field-level merge for a full cell record and its compact board row. The full
 * record carries the detail fields; the compact board carries the cross-cell
 * FDR q and evidence. A detail record with q = null must not erase the board
 * result, or the selected cell would turn gray.
 */
export function mergeTrendRecord(existing: TrendRecord, incoming: TrendRecord): TrendRecord {
  const incomingIsDetail = trendDetailScore(incoming) >= trendDetailScore(existing);
  const detail = incomingIsDetail ? incoming : existing;
  const board = incomingIsDetail ? existing : incoming;
  const merged = { ...detail };
  if (merged.q == null && board.q != null) merged.q = board.q;
  if (merged.evidence === "insufficient" && board.evidence !== "insufficient") {
    merged.evidence = board.evidence;
  }
  if (detail.q == null && board.q != null) merged.significantFdr = board.significantFdr;
  return merged;
}

export function seriesPoints(
  series: SeriesData,
  cityId: string | null | undefined,
  variableKey: string,
): SeriesPoint[] {
  if (!cityId) return [];
  const values = series.cities[cityId]?.[variableKey];
  if (!values) return [];
  return values.map((value, index) => {
    const year = series.startYear + Math.floor(index / 12);
    const month = (index % 12) + 1;
    return { year, month, t: year + (month - 1) / 12, value };
  });
}

export function filterWindow(points: SeriesPoint[], window: WindowDef): SeriesPoint[] {
  return points.filter((p) => p.year >= window.start && p.year <= window.end);
}

const SEASON_MONTHS: Record<Season, number[]> = {
  all: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  DJF: [12, 1, 2],
  MAM: [3, 4, 5],
  JJA: [6, 7, 8],
  SON: [9, 10, 11],
};

export function filterSeason(points: SeriesPoint[], season: Season): SeriesPoint[] {
  if (season === "all") return points;
  const months = new Set(SEASON_MONTHS[season]);
  return points.filter((p) => months.has(p.month));
}

export function rollingMean(points: SeriesPoint[], size = 12): (number | null)[] {
  const values = points.map((p) => p.value);
  const result: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < values.length; i += 1) {
    const current = values[i];
    if (current !== null) {
      sum += current;
      count += 1;
    }
    if (i >= size) {
      const old = values[i - size];
      if (old !== null) {
        sum -= old;
        count -= 1;
      }
    }
    if (i >= size - 1 && count >= Math.ceil(size * 0.8)) result[i] = sum / count;
  }
  return result;
}

export function annualize(points: SeriesPoint[]): SeriesPoint[] {
  const grouped = new Map<number, number[]>();
  for (const point of points) {
    if (point.value === null) continue;
    const bucket = grouped.get(point.year) ?? [];
    bucket.push(point.value);
    grouped.set(point.year, bucket);
  }
  return [...grouped.entries()]
    .filter(([, values]) => values.length >= 10)
    .sort(([a], [b]) => a - b)
    .map(([year, values]) => ({
      year,
      month: 1,
      t: year,
      value: values.reduce((a, b) => a + b, 0) / values.length,
    }));
}

export function deseasonalize(points: SeriesPoint[]): SeriesPoint[] {
  const monthMeans = new Map<number, number>();
  for (let month = 1; month <= 12; month += 1) {
    const values = points.filter((p) => p.month === month && p.value !== null).map((p) => p.value as number);
    if (values.length) monthMeans.set(month, values.reduce((a, b) => a + b, 0) / values.length);
  }
  return points.map((point) => ({
    ...point,
    value:
      point.value === null
        ? null
        : point.value - (monthMeans.get(point.month) ?? 0),
  }));
}

export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[index];
}

export function sameSign(a: number, b: number) {
  return (a >= 0 && b >= 0) || (a < 0 && b < 0);
}

export function compositeForCity(
  trends: CityTrends,
  cityId: string,
  variableKeys: string[],
  windowId: WindowId,
  season: Season,
): CompositeResult {
  const records = variableKeys
    .map((key) => getRecord(trends, cityId, key, windowId, season))
    .filter((record): record is TrendRecord => !!record && record.status === "ok" && record.z !== null);
  const selectedCount = variableKeys.length;
  if (!records.length) {
    return {
      z: null,
      agreement: 0,
      significantCount: 0,
      selectedCount,
      mixed: false,
      methodDependent: false,
      evidence: "insufficient",
      direction: "none",
    };
  }
  const zs = records.map((record) => record.z as number);
  const z = zs.reduce((a, b) => a + b, 0) / zs.length;
  const positive = zs.filter((value) => value >= 0).length;
  const agreement = Math.abs(positive - (zs.length - positive)) / zs.length;
  const direction: Direction = z > 0.005 ? "increasing" : z < -0.005 ? "decreasing" : "none";
  const significant = records.filter(
    (record) => record.significantFdr && record.z !== null && sameSign(record.z, z),
  );
  const evidence: EvidenceLevel =
    significant.length / Math.max(1, selectedCount) >= 2 / 3
      ? "strong"
      : significant.length / Math.max(1, selectedCount) >= 1 / 3
        ? "moderate"
        : "weak";
  const methodDependent = records.some((record) => record.methodDependent);
  return {
    z,
    agreement,
    significantCount: significant.length,
    selectedCount,
    mixed: agreement < 0.67,
    methodDependent,
    evidence: methodDependent && evidence === "strong" ? "moderate" : evidence,
    direction,
  };
}

export function divergenceColor(value: number, domain: number): string {
  if (!Number.isFinite(value)) return "#667a8c";
  const ratio = Math.max(-1, Math.min(1, value / Math.max(domain, 1e-9)));
  const neutral = [143, 166, 178];
  const amber = [245, 184, 75];
  const blue = [90, 169, 255];
  const target = ratio >= 0 ? amber : blue;
  const weight = Math.sqrt(Math.abs(ratio));
  const rgb = neutral.map((channel, index) => Math.round(channel + (target[index] - channel) * weight));
  return `rgb(${rgb.join(",")})`;
}

export function sequentialColor(value: number, from = "#2c4053", to = "#eaffff"): string {
  const ratio = Math.max(0, Math.min(1, value));
  const parse = (hex: string) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const a = parse(from);
  const b = parse(to);
  return `rgb(${a.map((channel, index) => Math.round(channel + (b[index] - channel) * ratio)).join(",")})`;
}

export const EVIDENCE_COLORS: Record<EvidenceLevel, string> = {
  strong: "#eaffff",
  moderate: "#6fe7ff",
  weak: "#8fa6b2",
  insufficient: "#42586b",
};

export const EVIDENCE_SCORE: Record<EvidenceLevel, number> = {
  insufficient: 0,
  weak: 0.28,
  moderate: 0.62,
  strong: 1,
};

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

export function digitsFor(variable: Variable | undefined): number {
  if (!variable) return 2;
  if (variable.key === "AOD_55" || variable.key.startsWith("GWET")) return 3;
  if (variable.key === "RH2M") return 1;
  return 2;
}

export function signed(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

export function formatP(p: number | null | undefined): string {
  if (p === null || p === undefined) return "p unavailable";
  if (p < 0.001) return "p < 0.001";
  return `p = ${p.toFixed(3)}`;
}

export function formatQ(q: number | null | undefined): string {
  if (q === null || q === undefined) return "q unavailable";
  if (q < 0.001) return "q < 0.001";
  return `q = ${q.toFixed(3)}`;
}

export function directionWord(direction: Direction, variableKey: string): string {
  if (variableKey === "PRECTOTCORR" || variableKey.startsWith("GWET")) {
    return direction === "increasing" ? "wetter" : direction === "decreasing" ? "drying" : "no clear trend";
  }
  if (variableKey === "AOD_55") {
    return direction === "increasing" ? "more aerosol" : direction === "decreasing" ? "cleaner air" : "no clear trend";
  }
  return direction === "increasing" ? "rising" : direction === "decreasing" ? "falling" : "no clear trend";
}

export function slopeUnit(variable: Variable | undefined): string {
  if (!variable) return "per decade";
  return `${variable.units}/decade`;
}

export function makeCityNotes(
  trends: CityTrends,
  variables: Variable[],
  cityId: string,
  variableKeys: string[],
  windowId: WindowId,
  season: Season,
): CityNote[] {
  const variableByKey = new Map(variables.map((variable) => [variable.key, variable]));
  return variableKeys
    .map((key) => {
      const record = getRecord(trends, cityId, key, windowId, season);
      const variable = variableByKey.get(key);
      if (!record || !variable) return null;
      const digits = digitsFor(variable);
      const unit = slopeUnit(variable);
      if (record.status !== "ok" || record.slope === null) {
        return {
          variableKey: key,
          tone: "insufficient" as const,
          evidence: "insufficient" as const,
          text: `${variable.label}: not enough data for a trend in this window.`,
        };
      }
      const slope = signed(record.slope, digits);
      const signWord = record.slope >= 0 ? "rising" : "falling";
      const q = formatQ(record.qVar);
      let text: string;
      if (record.methodDependent) {
        text = `${variable.label}: ${signWord} ${slope} ${unit}, method-dependent (${q}).`;
      } else if (record.significantVar) {
        text = `${variable.label}: ${signWord} ${slope} ${unit}, significant (${q}).`;
      } else {
        text = `${variable.label}: ${signWord} ${slope} ${unit}, not significant after FDR (${q}).`;
      }
      const tone =
        record.methodDependent || !record.significantVar
          ? "weak"
          : record.slope >= 0
            ? "rising"
            : "falling";
      return {
        variableKey: key,
        text,
        tone,
        evidence: record.evidenceVar,
      };
    })
    .filter((note): note is CityNote => note !== null);
}

export function evidenceLine(notes: CityNote[]): string {
  const tested = notes.filter((note) => note.evidence !== "insufficient");
  if (!tested.length) return "INSUFFICIENT DATA";
  const significant = tested.filter((note) => note.evidence === "strong" || note.evidence === "moderate").length;
  const strong = tested.filter((note) => note.evidence === "strong").length;
  const overall: EvidenceLevel =
    strong >= Math.ceil(tested.length * 0.5)
      ? "strong"
      : significant >= Math.ceil(tested.length * 0.34)
        ? "moderate"
        : "weak";
  return `${overall.toUpperCase()} overall · ${significant} of ${tested.length} significant`;
}

export function rankCities(
  trends: CityTrends,
  cities: City[],
  variableKey: string,
  windowId: WindowId,
  season: Season,
  direction: "increasing" | "decreasing" | "all",
  limit = 10,
): { city: City; record: TrendRecord }[] {
  const rows: { city: City; record: TrendRecord }[] = [];
  for (const city of cities) {
    const record = getRecord(trends, city.id, variableKey, windowId, season);
    if (!record || record.status !== "ok" || record.slope === null) continue;
    if (direction === "increasing" && record.slope <= 0) continue;
    if (direction === "decreasing" && record.slope >= 0) continue;
    rows.push({ city, record });
  }
  rows.sort((a, b) => {
    const scoreA = Math.abs(a.record.z ?? a.record.slope ?? 0);
    const scoreB = Math.abs(b.record.z ?? b.record.slope ?? 0);
    return scoreB - scoreA;
  });
  return rows.slice(0, limit);
}

export function sparklinePath(values: number[], width = 66, height = 18): string {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length < 2) return "";
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function cityById(cities: City[], id: string | null | undefined): City | null {
  if (!id) return null;
  return cities.find((city) => city.id === id) ?? null;
}

export function findCity(cities: City[], query: string): City | null {
  const needle = query.toLowerCase().trim();
  if (!needle) return null;
  const aliases = cities.map((city) => ({
    city,
    names: [city.name, city.id, city.country, ...city.aliases].map((name) => name.toLowerCase()),
  }));
  const exact = aliases.find(({ names }) => names.some((name) => name === needle));
  if (exact) return exact.city;
  const starts = aliases.find(({ names }) => names.some((name) => name.startsWith(needle)));
  if (starts) return starts.city;
  const contains = aliases.find(({ names }) => names.some((name) => needle.includes(name) || name.includes(needle)));
  return contains?.city ?? null;
}

export function variableByKey(variables: Variable[], key: string): Variable | undefined {
  return variables.find((variable) => variable.key === key);
}

export function annualValuesForSparkline(
  series: SeriesData,
  cityId: string,
  variableKey: string,
  window: WindowDef,
): number[] {
  const points = filterWindow(seriesPoints(series, cityId, variableKey), window);
  return annualize(points).map((point) => point.value as number);
}
