import type { City, ThenNowEntry } from "./types";

const GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";
const THEN_YEAR = 2001;
const NOW_YEAR = 2025;

export interface GibsQuery {
  layer: string;
  date: string;
  bbox: [number, number, number, number];
  size?: number;
}

/** Build a NASA GIBS WMS GetMap URL. EPSG:4326 WMS 1.3.0 uses lat,lon order. */
export function gibsImageUrl({ layer, date, bbox, size = 512 }: GibsQuery): string {
  const [latMin, lonMin, latMax, lonMax] = bbox;
  const params = new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.3.0",
    LAYERS: layer,
    CRS: "EPSG:4326",
    BBOX: [latMin, lonMin, latMax, lonMax].map((value) => value.toFixed(4)).join(","),
    WIDTH: String(size),
    HEIGHT: String(size),
    FORMAT: "image/jpeg",
    TIME: date,
  });
  return `${GIBS_WMS}?${params.toString()}`;
}

function bboxForCity(city: City): [number, number, number, number] {
  const spanLat = 1.4;
  const cosLat = Math.max(0.15, Math.cos((city.lat * Math.PI) / 180));
  const spanLon = Math.min(8, spanLat / cosLat);
  const latMin = Math.max(-85, city.lat - spanLat / 2);
  const latMax = Math.min(85, city.lat + spanLat / 2);
  const lonMin = Math.max(-180, city.lon - spanLon / 2);
  const lonMax = Math.min(180, city.lon + spanLon / 2);
  return [latMin, lonMin, latMax, lonMax];
}

/**
 * Build a live Then & Now comparison for any city. The same calendar date is
 * used in both years; imagery starts in 2000. This is visual context, not a
 * trend test.
 */
export function defaultComparisonMonth(city: City): number {
  if (Math.abs(city.lat) < 23.5) return 8;
  return city.lat >= 0 ? 3 : 9;
}

export function thenNowForCity(city: City, month = defaultComparisonMonth(city)): ThenNowEntry {
  const bbox = bboxForCity(city);
  const trueLayer = "MODIS_Terra_CorrectedReflectance_TrueColor";
  const falseLayer = "MODIS_Terra_CorrectedReflectance_Bands721";
  const monthText = String(month).padStart(2, "0");
  const startDate = `${THEN_YEAR}-${monthText}-15`;
  const endDate = `${NOW_YEAR}-${monthText}-15`;
  const startTrue = gibsImageUrl({ layer: trueLayer, date: startDate, bbox });
  const startFalse = gibsImageUrl({ layer: falseLayer, date: startDate, bbox });
  const endTrue = gibsImageUrl({ layer: trueLayer, date: endDate, bbox });
  const endFalse = gibsImageUrl({ layer: falseLayer, date: endDate, bbox });
  return {
    cityId: city.id,
    label: `${city.name}, ${city.country}`,
    startDate,
    endDate,
    sensor: "MODIS Terra",
    resolution: "250 m true color · 500 m false color",
    startTrueImage: startTrue,
    startFalseImage: startFalse,
    endTrueImage: endTrue,
    endFalseImage: endFalse,
    trueImage: endTrue,
    falseImage: endFalse,
    images: {
      start: { true: startTrue, false: startFalse },
      end: { true: endTrue, false: endFalse },
    },
    caveat:
      "Live NASA GIBS MODIS Terra imagery for the same calendar date. Clouds, haze, and season can mislead; this is visual context, not a trend test.",
  };
}
