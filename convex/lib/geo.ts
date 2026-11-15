/**
 * MERRA-2 cell geometry. The 0.5 degree latitude by 0.625 degree longitude
 * grid is the same one used by the Python prewarm scripts. Every city in a
 * cell shares one POWER series.
 */

export const MERRA_LAT_STEP = 0.5;
export const MERRA_LON_STEP = 0.625;

export type CellPoint = {
  cellId: string;
  lat: number;
  lon: number;
};

export function cellForPoint(lat: number, lon: number): CellPoint {
  const latIndex = Math.floor((lat + 90) / MERRA_LAT_STEP);
  const lonIndex = Math.floor((lon + 180) / MERRA_LON_STEP);
  return {
    cellId: `c${latIndex}_${lonIndex}`,
    lat: round(-90 + (latIndex + 0.5) * MERRA_LAT_STEP, 4),
    lon: round(-180 + (lonIndex + 0.5) * MERRA_LON_STEP, 4),
  };
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
