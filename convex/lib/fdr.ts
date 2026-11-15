/**
 * Benjamini-Hochberg false discovery rate control.
 *
 * The global board is exploratory: q-values are computed across the cells
 * that are currently cached for one variable/window/season, not across a
 * completed global scan. The UI must describe them that way.
 */

function normalizePValue(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value)) return 1;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Returns q-values aligned with the input order. Missing or non-finite
 * p-values are treated as 1.
 */
export function benjaminiHochberg(pValues: Array<number | null | undefined>): number[] {
  const count = pValues.length;
  if (count === 0) return [];

  const ranked = pValues
    .map((value, index) => ({ p: normalizePValue(value), index }))
    .sort((a, b) => a.p - b.p);

  const qValues = new Array<number>(count).fill(1);
  let previous = 1;
  for (let rank = count; rank >= 1; rank -= 1) {
    const entry = ranked[rank - 1];
    const adjusted = Math.min(previous, (entry.p * count) / rank);
    qValues[entry.index] = adjusted;
    previous = adjusted;
  }
  return qValues;
}

export type EvidenceLevel = "strong" | "moderate" | "weak" | "insufficient";

/** Thresholds mirror apps/stats-engine/app/config.py. */
export function evidenceLevel(
  q: number | null | undefined,
  nYears: number,
  methodDependent = false,
): EvidenceLevel {
  if (nYears < 10 || q === null || q === undefined || !Number.isFinite(q)) {
    return "insufficient";
  }
  if (q < 0.01 && nYears >= 20 && !methodDependent) return "strong";
  if (q < 0.05 && !methodDependent) return "moderate";
  if (q < 0.01 && methodDependent) return "moderate";
  return "weak";
}
