import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import maplibregl, {
  type GeoJSONSource,
  type Map as MapLibreMap,
  type MapMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { CoreData } from "@/lib/api";
import type { City, ViewState } from "@/lib/types";
import {
  EVIDENCE_COLORS,
  compositeForCity,
  divergenceColor,
  getRecord,
  percentile,
  sequentialColor,
} from "@/lib/trends";

export interface GlobeMapHandle {
  flyToCity: (city: City) => void;
  flyToCoords: (lon: number, lat: number, zoom?: number) => void;
  setProjection: (mode: "globe" | "mercator") => void;
  zoomBy: (delta: number) => void;
  reset: () => void;
}

interface Props {
  data: CoreData;
  view: ViewState;
  onSelectCity: (cityId: string) => void;
  onReady: () => void;
  onProjectionChange?: (mode: "globe" | "mercator") => void;
}

const DARK_STYLE = {
  version: 8,
  name: "Holmes Dark",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#0a1f30" },
    },
  ],
} as const;

function graticuleGeoJson() {
  const features: Feature[] = [];
  for (let lat = -60; lat <= 60; lat += 30) {
    const coordinates: [number, number][] = [];
    for (let lon = -180; lon <= 180; lon += 3) coordinates.push([lon, lat]);
    features.push({
      type: "Feature",
      properties: { kind: "lat" },
      geometry: { type: "LineString", coordinates },
    });
  }
  for (let lon = -150; lon <= 150; lon += 30) {
    const coordinates: [number, number][] = [];
    for (let lat = -80; lat <= 80; lat += 3) coordinates.push([lon, lat]);
    features.push({
      type: "Feature",
      properties: { kind: "lon" },
      geometry: { type: "LineString", coordinates },
    });
  }
  return { type: "FeatureCollection" as const, features };
}

function solarTerminatorPolygon(now = new Date()) {
  const yearStart = Date.UTC(now.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - yearStart) / 86400000);
  const declination = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  const decRad = (declination * Math.PI) / 180;
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const subsolarLng = (12 - utcHours) * 15;
  const ring: [number, number][] = [];
  for (let lng = -180; lng <= 180; lng += 2) {
    const lngRad = ((lng - subsolarLng) * Math.PI) / 180;
    const lat = (Math.atan(-Math.cos(lngRad) / Math.tan(decRad)) * 180) / Math.PI;
    ring.push([lng, lat]);
  }
  const darkSide = declination >= 0 ? -90 : 90;
  ring.push([180, darkSide], [-180, darkSide], ring[0]);
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [ring] },
  };
}

function domainFor(data: CoreData, view: ViewState): number {
  const values: number[] = [];
  for (const city of data.cities) {
    if (view.mode === "combined" && view.variableKeys.length > 1) {
      const composite = compositeForCity(data.trends, city.id, view.variableKeys, view.windowId, view.season);
      if (composite.z !== null) values.push(Math.abs(composite.z));
    } else {
      const record = getRecord(data.trends, city.id, view.variableKeys[0] ?? "T2M", view.windowId, view.season);
      if (record?.slope !== null && record?.slope !== undefined) values.push(Math.abs(record.slope));
    }
  }
  if (!values.length) return 1;
  return Math.max(percentile(values, 92), 1e-6);
}

const MERRA_HALF_LAT = 0.25;
const MERRA_HALF_LON = 0.3125;
const MIN_REGION_PX = 16;
const MAX_REGION_HALF_DEG = 4;
const CITY_PICK_RADIUS_PX = 16;
const SPIN_DEG_PER_SEC = 2;
const WHOLE_GLOBE_ZOOM = 2.8;
const SPIN_RESUME_MS = 1200;

interface CityAreaProperties {
  id: string;
  name: string;
  source: string;
  labelLon: number;
  labelLat: number;
  bbox: [number, number, number, number];
}

type CityAreaShape = Feature<Polygon | MultiPolygon, CityAreaProperties>;

// Fallback for cities without a footprint in city-areas.geojson: the MERRA-2
// cell, lifted to a legible size at overview zooms.
function regionHalfSize(map: MapLibreMap, city: City) {
  const center = map.project([city.lon, city.lat]);
  const east = map.project([city.lon + 0.5, city.lat]);
  const north = map.project([city.lon, city.lat + 0.5]);
  const pxPerDegreeLon = Math.max(1e-4, Math.abs(east.x - center.x) / 0.5);
  const pxPerDegreeLat = Math.max(1e-4, Math.abs(north.y - center.y) / 0.5);
  return {
    halfLat: Math.min(MAX_REGION_HALF_DEG, Math.max(MERRA_HALF_LAT, (MIN_REGION_PX / 2) / pxPerDegreeLat)),
    halfLon: Math.min(MAX_REGION_HALF_DEG, Math.max(MERRA_HALF_LON, (MIN_REGION_PX / 2) / pxPerDegreeLon)),
  };
}

// A smooth display footprint for cities without a Natural Earth urban-area
// polygon. It is deliberately not a rectangle: the colored shape is a marker,
// not the MERRA-2 measurement support.
function circleRing(
  lon: number,
  lat: number,
  halfLon: number,
  halfLat: number,
  segments = 20,
): [number, number][] {
  const ring: [number, number][] = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    ring.push([lon + Math.cos(angle) * halfLon, lat + Math.sin(angle) * halfLat]);
  }
  return ring;
}

function labelPointFor(area: CityAreaShape | null | undefined, city: City): [number, number] {
  return area ? [area.properties.labelLon, area.properties.labelLat] : [city.lon, city.lat];
}

function labelLiftFor(map: MapLibreMap, city: City, area?: CityAreaShape | null) {
  const [lon, lat] = labelPointFor(area, city);
  const north = area ? area.properties.bbox[3] : city.lat + regionHalfSize(map, city).halfLat;
  const center = map.project([lon, lat]);
  const edge = map.project([lon, north]);
  return Math.min(32, Math.max(8, Math.abs(center.y - edge.y) + 4));
}

function populationFloor(zoom: number): number {
  if (zoom < 3) return 5_000_000;
  if (zoom < 4) return 500_000;
  if (zoom < 5) return 100_000;
  return 0;
}

function visibleCities(data: CoreData, selectedCityId: string | null, zoom: number) {
  const floor = populationFloor(zoom);
  const visible: City[] = [];
  for (const city of data.cities) {
    // Cached cells are the board's evidence; keep them visible at every zoom
    // even when the city is smaller than the density threshold.
    if (city.population >= floor || city.id === selectedCityId || data.trends.cities[city.id]) {
      visible.push(city);
    }
  }
  return visible;
}

function nearestCity(
  map: MapLibreMap,
  data: CoreData,
  selectedCityId: string | null,
  point: { x: number; y: number },
) {
  let best: City | null = null;
  let bestDistance = CITY_PICK_RADIUS_PX;
  for (const city of visibleCities(data, selectedCityId, map.getZoom())) {
    const projected = map.project([city.lon, city.lat]);
    const distance = Math.hypot(projected.x - point.x, projected.y - point.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = city;
    }
  }
  return best;
}

function cityAreas(
  data: CoreData,
  view: ViewState,
  selectedCityId: string | null,
  map: MapLibreMap,
  geometries: Map<string, CityAreaShape>,
) {
  const domain = domainFor(data, view);
  const primaryKey = view.variableKeys[0] ?? "T2M";
  const ranked = [...visibleCities(data, selectedCityId, map.getZoom())].sort((a, b) => a.population - b.population);
  return {
    type: "FeatureCollection" as const,
    features: ranked.map((city) => {
      const selected = city.id === selectedCityId;
      const record = getRecord(data.trends, city.id, primaryKey, view.windowId, view.season);
      const composite =
        view.mode === "combined" && view.variableKeys.length > 1
          ? compositeForCity(data.trends, city.id, view.variableKeys, view.windowId, view.season)
          : null;
      const uncached = !data.trends.cities[city.id];
      let color = "#667a8c";
      let fillOpacity = 0.14;
      let borderColor = "#42586b";
      let borderOpacity = 0.3;
      let insufficient = uncached || !record || record.status !== "ok";

      if (view.lens === "effect") {
        const value = composite ? composite.z : record?.slope ?? null;
        if (value !== null && value !== undefined && !insufficient) {
          color = divergenceColor(value, domain);
          fillOpacity = 0.38 + Math.min(0.38, Math.abs(value / domain) * 0.34);
        }
        const significant = composite ? composite.evidence !== "weak" && composite.evidence !== "insufficient" : record?.significantFdr;
        borderColor = significant ? "#e2eefb" : "#6d8296";
        borderOpacity = significant ? 0.92 : 0.34;
      } else if (view.lens === "evidence") {
        const evidence = composite ? composite.evidence : record?.evidence ?? "insufficient";
        color = EVIDENCE_COLORS[evidence];
        const direction = composite ? composite.direction : record?.direction ?? "none";
        borderColor = direction === "increasing" ? "#f5b84b" : direction === "decreasing" ? "#5aa9ff" : "#8fa6b2";
        borderOpacity = evidence === "insufficient" ? 0.22 : 0.9;
        fillOpacity = evidence === "strong" ? 0.82 : evidence === "moderate" ? 0.66 : evidence === "weak" ? 0.42 : 0.11;
        insufficient = evidence === "insufficient";
      } else if (view.lens === "agreement") {
        const agreement = composite?.agreement ?? 0;
        color = composite ? sequentialColor(agreement, "#1b2c3d", "#6fe7ff") : "#1b2c3d";
        borderColor = composite?.mixed ? "#8fa6b2" : "#e2eefb";
        borderOpacity = composite ? (composite.mixed ? 0.5 : 0.9) : 0.2;
        fillOpacity = composite ? 0.3 + agreement * 0.44 : 0.11;
        insufficient = !composite || composite.evidence === "insufficient";
      } else {
        const coverage = record?.coverage ?? 0;
        color = sequentialColor(Math.min(1, coverage), "#1b2c3d", "#eaffff");
        borderColor = insufficient ? "#42586b" : "#e2eefb";
        borderOpacity = insufficient ? 0.2 : 0.85;
        fillOpacity = insufficient ? 0.11 : 0.2 + Math.min(1, coverage) * 0.52;
      }

      if (uncached) {
        color = "#3f505c";
        fillOpacity = 0.1;
        borderColor = "#42586b";
        borderOpacity = 0.2;
        insufficient = true;
      }

      if (selected) {
        fillOpacity = Math.min(0.94, fillOpacity + 0.18);
      } else if (selectedCityId) {
        fillOpacity *= 0.55;
      }

      const { halfLat, halfLon } = regionHalfSize(map, city);
      const markerScale = uncached ? 0.62 : 1;
      const fallbackRing = circleRing(
        city.lon,
        city.lat,
        halfLon * markerScale,
        halfLat * markerScale,
      );
      const area = city.curated ? geometries.get(city.id) : undefined;

      return {
        type: "Feature" as const,
        properties: {
          id: city.id,
          name: city.name,
          lon: city.lon,
          lat: city.lat,
          color,
          fillOpacity,
          borderColor,
          borderOpacity,
          selected: selected ? 1 : 0,
          insufficient: insufficient ? 1 : 0,
          uncached: uncached ? 1 : 0,
        },
        geometry: (area?.geometry ?? { type: "Polygon" as const, coordinates: [fallbackRing] }) as Polygon | MultiPolygon,
      };
    }),
  };
}

function primaryKeyFor(view: ViewState) {
  return view.variableKeys[0] ?? "T2M";
}

function firePoints(data: CoreData) {
  return {
    type: "FeatureCollection" as const,
    features: data.fires.points.map((point) => ({
      type: "Feature" as const,
      properties: { frp: point[2], confidence: point[3] },
      geometry: { type: "Point" as const, coordinates: [point[0], point[1]] },
    })),
  };
}

function fireClusters(data: CoreData) {
  return {
    type: "FeatureCollection" as const,
    features: data.fires.clusters.map((cluster) => ({
      type: "Feature" as const,
      properties: {
        id: cluster.id,
        label: cluster.label,
        province: cluster.province,
        count: cluster.count,
        sumFrp: cluster.sumFrp,
      },
      geometry: { type: "Point" as const, coordinates: [cluster.lon, cluster.lat] },
    })),
  };
}

export const GlobeMap = forwardRef<GlobeMapHandle, Props>(function GlobeMap(
  { data, view, onSelectCity, onReady, onProjectionChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const readyRef = useRef(false);
  const readyFired = useRef(false);
  const spinRef = useRef<number | null>(null);
  const spinStopped = useRef(false);
  const lastInteraction = useRef(0);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const labelMarkersRef = useRef<{ marker: maplibregl.Marker; city: City; area: CityAreaShape | null }[]>([]);
  const selectedLabelRef = useRef<{ marker: maplibregl.Marker; city: City; area: CityAreaShape | null } | null>(null);
  const cityGeometriesRef = useRef<Map<string, CityAreaShape>>(new Map());
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);
  const dataRef = useRef(data);
  const viewRef = useRef(view);
  const onSelectRef = useRef(onSelectCity);
  const onReadyRef = useRef(onReady);
  const [failed, setFailed] = useState(false);
  const [projection, setProjectionState] = useState<"globe" | "mercator">("globe");
  const [styleReady, setStyleReady] = useState(false);

  dataRef.current = data;
  viewRef.current = view;
  onSelectRef.current = onSelectCity;
  onReadyRef.current = onReady;

  useImperativeHandle(ref, () => ({
    flyToCity(city: City) {
      const map = mapRef.current;
      if (!map) return;
      spinStopped.current = true;
      map.flyTo({
        center: [city.lon, city.lat],
        zoom: 5.7,
        pitch: 30,
        bearing: 0,
        duration: 1600,
        essential: true,
      });
    },
    flyToCoords(lon: number, lat: number, zoom = 6) {
      const map = mapRef.current;
      if (!map) return;
      spinStopped.current = true;
      map.flyTo({ center: [lon, lat], zoom, pitch: 28, duration: 1500, essential: true });
    },
    setProjection(mode) {
      const map = mapRef.current;
      if (!map) return;
      map.setProjection({ type: mode });
      map.easeTo({ pitch: 0, duration: 600 });
      setProjectionState(mode);
      onProjectionChange?.(mode);
    },
    zoomBy(delta) {
      const map = mapRef.current;
      if (!map) return;
      map.zoomTo(map.getZoom() + delta, { duration: 250 });
    },
    reset() {
      const map = mapRef.current;
      if (!map) return;
      spinStopped.current = false;
      map.flyTo({ center: [0, 20], zoom: 2.0, pitch: 0, bearing: 0, duration: 1400 });
    },
  }));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: DARK_STYLE as never,
        center: [0, 20],
        zoom: 2.0,
        minZoom: 1.2,
        maxZoom: 16,
        maxPitch: 85,
        attributionControl: { compact: true },
      });
    } catch (error) {
      console.error("MapLibre failed to initialize", error);
      setFailed(true);
      if (!readyFired.current) {
        readyFired.current = true;
        onReadyRef.current();
      }
      return;
    }
    mapRef.current = map;
    if (import.meta.env.DEV) (window as unknown as { __holmesMap?: MapLibreMap }).__holmesMap = map;

    const fireReady = () => {
      if (readyFired.current) return;
      readyFired.current = true;
      readyRef.current = true;
      setStyleReady(true);
      onReadyRef.current();
    };
    // A basemap can hang on a bad network. Never hold the splash hostage.
    const readyTimer = window.setTimeout(fireReady, 4200);

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    map.on("load", async () => {
      map.resize();
      try {
        map.setProjection({ type: "globe" });
        map.setSky({
          "sky-color": "#000000",
          "sky-horizon-blend": 0.5,
          "horizon-color": "#0a0f14",
          "horizon-fog-blend": 0.3,
          "fog-color": "#000000",
          "fog-ground-blend": 0.9,
        } as never);
      } catch (error) {
        console.warn("Globe projection unavailable", error);
      }

      let countries: FeatureCollection | null = null;
      try {
        countries = await fetch(`${import.meta.env.BASE_URL}data/ne_110m_admin_0_countries.geojson`).then((response) => response.json());
      } catch (error) {
        console.warn("Country geometry unavailable", error);
      }
      if (countries) {
        map.addSource("countries", { type: "geojson", data: countries, attribution: "Natural Earth (public domain)" });
        map.addLayer({
          id: "countries-fill",
          type: "fill",
          source: "countries",
          paint: { "fill-color": "#1a3446", "fill-opacity": 0.96 },
        });
        map.addLayer({
          id: "countries-line",
          type: "line",
          source: "countries",
          paint: { "line-color": "#4d84bd", "line-width": 0.65, "line-opacity": 0.78 },
        });
      }

      try {
        const cityShapes = await fetch(`${import.meta.env.BASE_URL}data/city-areas.geojson`).then(
          (response) => response.json() as Promise<FeatureCollection<Polygon | MultiPolygon, CityAreaProperties>>,
        );
        for (const feature of cityShapes.features) {
          cityGeometriesRef.current.set(feature.properties.id, feature as CityAreaShape);
        }
      } catch (error) {
        console.warn("City geometry unavailable; using MERRA-2 cells", error);
      }
      map.addSource("graticule", { type: "geojson", data: graticuleGeoJson(), attribution: "Holmes graticule" });
      map.addLayer({
        id: "graticule-line",
        type: "line",
        source: "graticule",
        paint: { "line-color": "#2a4a62", "line-width": 0.4, "line-opacity": 0.42 },
      });

      map.addSource("day-night", { type: "geojson", data: solarTerminatorPolygon() });
      map.addLayer({
        id: "day-night-fill",
        type: "fill",
        source: "day-night",
        layout: { visibility: viewRef.current.night ? "visible" : "none" },
        paint: { "fill-color": "#000000", "fill-opacity": 0.42 },
      });

      map.addSource("city-areas", {
        type: "geojson",
        data: cityAreas(dataRef.current, viewRef.current, viewRef.current.cityId, map, cityGeometriesRef.current),
        attribution: "City shapes: Natural Earth urban areas; GeoBoundaries (CC BY 3.0 IGO); circle markers are display footprints",
      });
      map.addLayer({
        id: "city-area-fill",
        type: "fill",
        source: "city-areas",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": ["get", "fillOpacity"],
        },
      });
      map.addLayer({
        id: "city-area-border",
        type: "line",
        source: "city-areas",
        paint: {
          "line-color": ["get", "borderColor"],
          "line-opacity": ["get", "borderOpacity"],
          "line-width": ["case", ["==", ["get", "selected"], 1], 1.7, 0.8],
        },
      });
      map.addLayer({
        id: "city-area-selected-glow",
        type: "line",
        source: "city-areas",
        filter: ["==", ["get", "selected"], 1],
        paint: {
          "line-color": ["get", "color"],
          "line-width": 4.5,
          "line-opacity": 0.22,
          "line-blur": 3,
        },
      });
      map.addLayer({
        id: "city-area-selected-outline",
        type: "line",
        source: "city-areas",
        filter: ["==", ["get", "selected"], 1],
        paint: {
          "line-color": "#eaffff",
          "line-width": 1.5,
          "line-opacity": 0.95,
        },
      });
      map.addLayer({
        id: "city-area-insufficient-outline",
        type: "line",
        source: "city-areas",
        filter: ["==", ["get", "insufficient"], 1],
        paint: {
          "line-color": "#42586b",
          "line-width": 0.9,
          "line-opacity": 0.6,
          "line-dasharray": [2, 2],
        },
      });

      map.addSource("fires", { type: "geojson", data: firePoints(dataRef.current) });
      map.addLayer({
        id: "fire-heat",
        type: "heatmap",
        source: "fires",
        layout: { visibility: viewRef.current.fireOn ? "visible" : "none" },
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "frp"], 0, 0.1, 100, 0.7, 500, 1],
          "heatmap-intensity": 0.85,
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 1, 5, 6, 18],
          "heatmap-opacity": 0.5,
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.2, "rgba(92,26,10,0.55)",
            0.45, "rgba(255,92,58,0.72)",
            0.72, "rgba(255,179,71,0.86)",
            1, "rgba(255,243,176,0.95)",
          ],
        },
      });
      map.addSource("fire-clusters", { type: "geojson", data: fireClusters(dataRef.current) });
      map.addLayer({
        id: "fire-cluster-halo",
        type: "circle",
        source: "fire-clusters",
        layout: { visibility: viewRef.current.fireOn ? "visible" : "none" },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "count"], 20, 9, 100, 20, 500, 30],
          "circle-color": "rgba(255,92,58,0.18)",
        },
      });
      map.addLayer({
        id: "fire-cluster-core",
        type: "circle",
        source: "fire-clusters",
        layout: { visibility: viewRef.current.fireOn ? "visible" : "none" },
        paint: {
          "circle-radius": 3.4,
          "circle-color": "#ff5c3a",
          "circle-stroke-color": "#2a0b05",
          "circle-stroke-width": 1,
        },
      });

      map.on("click", (event: MapMouseEvent) => {
        if (map.getLayer("fire-cluster-core") && map.queryRenderedFeatures(event.point, { layers: ["fire-cluster-core"] }).length) return;
        const hits = map.queryRenderedFeatures(event.point, { layers: ["city-area-fill"] });
        let hitId: string | null = null;
        let hitDistance = Infinity;
        for (const hit of hits) {
          const lon = Number(hit.properties?.lon);
          const lat = Number(hit.properties?.lat);
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
          const projected = map.project([lon, lat]);
          const distance = Math.hypot(projected.x - event.point.x, projected.y - event.point.y);
          if (distance < hitDistance) {
            hitDistance = distance;
            hitId = String(hit.properties?.id ?? "");
          }
        }
        if (hitId) {
          hoverPopupRef.current?.remove();
          onSelectRef.current(hitId);
          return;
        }
        const city = nearestCity(map, dataRef.current, viewRef.current.cityId, event.point);
        if (city) {
          hoverPopupRef.current?.remove();
          onSelectRef.current(city.id);
        }
      });
      map.on("mousemove", "city-area-fill", (event: MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        map.getCanvas().style.cursor = "pointer";
        const feature = event.features?.[0];
        if (!feature) return;
        const name = String(feature.properties?.name ?? "");
        const hint = Number(feature.properties?.uncached) === 1
          ? "NOT CACHED — CLICK TO FETCH"
          : "CLICK TO INSPECT CITY";
        if (!hoverPopupRef.current) {
          hoverPopupRef.current = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 10,
            className: "holmes-popup",
          });
        }
        hoverPopupRef.current
          .setLngLat(event.lngLat)
          .setHTML(`<span class="holmes-popup__name">${name}</span><span class="holmes-popup__hint">${hint}</span>`)
          .addTo(map);
      });
      map.on("mouseleave", "city-area-fill", () => {
        map.getCanvas().style.cursor = "";
        hoverPopupRef.current?.remove();
      });
      map.on("zoomend", () => {
        // A pitched globe drifts away from the screen centre at overview zooms.
        // Flatten the camera as soon as the globe comes back into view.
        if (map.getZoom() < 3.5 && map.getPitch() > 0.5) {
          map.easeTo({ pitch: 0, duration: 420, essential: true });
        }
        const source = map.getSource("city-areas") as GeoJSONSource | undefined;
        source?.setData(cityAreas(dataRef.current, viewRef.current, viewRef.current.cityId, map, cityGeometriesRef.current));
        updateLabelLift(map);
        updateLabelVisibility(map);
      });
      map.on("projectiontransition", () => {
        const source = map.getSource("city-areas") as GeoJSONSource | undefined;
        source?.setData(cityAreas(dataRef.current, viewRef.current, viewRef.current.cityId, map, cityGeometriesRef.current));
        updateLabelLift(map);
        updateLabelVisibility(map);
      });
      map.on("moveend", () => updateLabelVisibility(map));
      let labelFrame = 0;
      map.on("move", () => {
        if (labelFrame) return;
        labelFrame = requestAnimationFrame(() => {
          labelFrame = 0;
          if (!mapRef.current) return;
          updateLabelVisibility(map);
        });
      });
      map.on("click", "fire-cluster-core", (event: MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        const province = event.features?.[0]?.properties?.province;
        if (typeof province === "string") {
          window.dispatchEvent(new CustomEvent("holmes:fire-select", { detail: province }));
        }
      });

      map.once("idle", fireReady);
      window.setTimeout(fireReady, 1600);
      window.setTimeout(() => map.resize(), 350);
      window.setTimeout(() => map.resize(), 900);

      const stopSpin = () => {
        spinStopped.current = true;
        lastInteraction.current = performance.now();
      };
      map.on("mousedown", stopSpin);
      map.on("touchstart", stopSpin);
      map.on("wheel", stopSpin);
      map.on("dragstart", stopSpin);
      map.on("zoomstart", stopSpin);

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let last = performance.now();
      const spin = (now: number) => {
        if (!mapRef.current) return;
        const zoom = map.getZoom();
        const wholeGlobe =
          map.getProjection()?.type === "globe" && zoom <= WHOLE_GLOBE_ZOOM;
        const idle = now - lastInteraction.current;
        const shouldSpin =
          !reduced &&
          !document.hidden &&
          !map.isMoving() &&
          !map.isZooming() &&
          (wholeGlobe
            ? idle > SPIN_RESUME_MS
            : !spinStopped.current && !viewRef.current.cityId);
        if (shouldSpin) {
          const center = map.getCenter();
          const delta = Math.min(0.25, (now - last) / 1000);
          center.lng += delta * SPIN_DEG_PER_SEC;
          map.setCenter(center);
        }
        last = now;
        spinRef.current = requestAnimationFrame(spin);
      };
      spinRef.current = requestAnimationFrame(spin);
    });

    map.on("error", (event) => {
      if (event?.error) console.warn("Map error", event.error.message ?? event.error);
    });
    window.setTimeout(fireReady, 5000);

    return () => {
      resizeObserver.disconnect();
      window.clearTimeout(readyTimer);
      if (spinRef.current) cancelAnimationFrame(spinRef.current);
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
      if (import.meta.env.DEV) delete (window as unknown as { __holmesMap?: MapLibreMap }).__holmesMap;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const source = map.getSource("city-areas") as GeoJSONSource | undefined;
    source?.setData(cityAreas(data, view, view.cityId, map, cityGeometriesRef.current));
    if (map.getLayer("day-night-fill")) {
      map.setLayoutProperty("day-night-fill", "visibility", view.night ? "visible" : "none");
    }
    if (map.getLayer("fire-heat")) {
      const visibility = view.fireOn ? "visible" : "none";
      map.setLayoutProperty("fire-heat", "visibility", visibility);
      map.setLayoutProperty("fire-cluster-halo", "visibility", visibility);
      map.setLayoutProperty("fire-cluster-core", "visibility", visibility);
    }
  }, [data, view, styleReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    markerRef.current?.remove();
    markerRef.current = null;
    selectedLabelRef.current = null;
    if (!view.cityId) return;
    const city = data.cities.find((candidate) => candidate.id === view.cityId);
    if (!city) return;
    const area = city.curated ? cityGeometriesRef.current.get(city.id) ?? null : null;
    const [labelLon, labelLat] = labelPointFor(area, city);
    const element = document.createElement("div");
    element.className = "city-label-anchor";
    const label = document.createElement("span");
    label.className = "city-dom-label city-dom-label--selected";
    label.textContent = city.name;
    label.style.setProperty("--label-lift", `${labelLiftFor(map, city, area)}px`);
    element.appendChild(label);
    markerRef.current = new maplibregl.Marker({ element, anchor: "center" })
      .setLngLat([labelLon, labelLat])
      .addTo(map);
    selectedLabelRef.current = { marker: markerRef.current, city, area };
    spinStopped.current = true;
    map.flyTo({
      center: [labelLon, labelLat],
      zoom: Math.max(map.getZoom(), 5.5),
      pitch: 28,
      duration: 1500,
      essential: true,
    });
  }, [view.cityId, data.cities, styleReady]);

  const updateLabelLift = useCallback((map: MapLibreMap) => {
    const entries = selectedLabelRef.current
      ? [...labelMarkersRef.current, selectedLabelRef.current]
      : labelMarkersRef.current;
    for (const { marker, city, area } of entries) {
      const label = marker.getElement().querySelector<HTMLElement>(".city-dom-label");
      label?.style.setProperty("--label-lift", `${labelLiftFor(map, city, area)}px`);
    }
  }, []);

  const updateLabelVisibility = useCallback((map: MapLibreMap) => {
    const panelVisible = Boolean(viewRef.current.cityId) || viewRef.current.panelTab === "fire";
    const rightLimit = panelVisible ? window.innerWidth - 430 : window.innerWidth - 380;
    const topLimit = 62;
    const bottomLimit = window.innerHeight - 112;
    const entries = selectedLabelRef.current
      ? [...labelMarkersRef.current, selectedLabelRef.current]
      : labelMarkersRef.current;
    for (const { marker } of entries) {
      const point = map.project(marker.getLngLat());
      const element = marker.getElement();
      element.style.display =
        point.x < 12 || point.x > rightLimit || point.y < topLimit || point.y > bottomLimit
          ? "none"
          : "";
    }
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    for (const entry of labelMarkersRef.current) entry.marker.remove();
    labelMarkersRef.current = [];
    if (!view.labels) return;
    const selectedId = view.cityId;
    const scored = visibleCities(data, selectedId, map.getZoom())
      .filter((city) => city.id !== selectedId)
      .map((city) => {
        const record = getRecord(data.trends, city.id, primaryKeyFor(view), view.windowId, view.season);
        return { city, score: Math.abs(record?.z ?? record?.slope ?? 0) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    for (const { city } of scored) {
      const area = city.curated ? cityGeometriesRef.current.get(city.id) ?? null : null;
      const [labelLon, labelLat] = labelPointFor(area, city);
      const element = document.createElement("div");
      element.className = "city-label-anchor";
      const label = document.createElement("span");
      label.className = "city-dom-label";
      label.textContent = city.name;
      label.style.setProperty("--label-lift", `${labelLiftFor(map, city, area)}px`);
      element.appendChild(label);
      const marker = new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat([labelLon, labelLat])
        .addTo(map);
      labelMarkersRef.current.push({ marker, city, area });
    }
    updateLabelVisibility(map);
  }, [data, view, view.labels, view.cityId, styleReady, updateLabelVisibility]);

  return (
    <div className="map-layer">
      <div ref={containerRef} className="absolute inset-0" style={{ position: "absolute", inset: 0 }} />
      {failed ? (
        <div className="map-fallback">
          <div className="glass-panel p-5 max-w-md text-center">
            <div className="hud-label mb-2">Map unavailable</div>
            <div className="text-sm text-[var(--text-dim)]">
              WebGL2 is unavailable. The evidence panels still work. Try a browser with hardware acceleration.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});
