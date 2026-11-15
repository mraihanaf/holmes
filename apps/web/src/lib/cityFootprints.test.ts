import { describe, expect, it } from "vitest";
import { SHOWCASE_FOOTPRINTS } from "./cityFootprints";

describe("showcase footprints", () => {
  it("keeps the showcase set small and low-vertex", () => {
    const entries = Object.values(SHOWCASE_FOOTPRINTS);
    expect(entries.length).toBeGreaterThanOrEqual(6);
    expect(entries.length).toBeLessThanOrEqual(16);
    for (const entry of entries) {
      expect(entry.polygon.length).toBeGreaterThanOrEqual(5);
      expect(entry.polygon.length).toBeLessThanOrEqual(40);
      expect(entry.polygon[0]).toEqual(entry.polygon[entry.polygon.length - 1]);
      for (const [lon, lat] of entry.polygon) {
        expect(Number.isFinite(lon)).toBe(true);
        expect(Number.isFinite(lat)).toBe(true);
        expect(lon).toBeGreaterThanOrEqual(-180);
        expect(lon).toBeLessThanOrEqual(180);
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
      }
    }
  });
});
