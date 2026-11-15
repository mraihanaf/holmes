import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, Globe2, Map as MapIcon, Minus, Plus, RotateCcw, SlidersHorizontal, Sparkles } from "lucide-react";
import {
  ensureBoards,
  ensureCityDetail,
  loadCoreData,
  mergeCoreData,
  type CoreData,
} from "@/lib/api";
import { startFeatureTour } from "@/lib/tour";
import type { CaseEntry, FireCluster, Lens, Season, ViewState, WindowId } from "@/lib/types";
import { cityById, hasCityRecords, windowById } from "@/lib/trends";
import { GlobeMap, type GlobeMapHandle } from "@/components/GlobeMap";
import { Splash } from "@/components/Splash";
import { Header } from "@/components/Header";
import { VariableRail } from "@/components/VariableRail";
import { CitySearch } from "@/components/CitySearch";
import { RightPanel } from "@/components/RightPanel";
import { StatusTicker } from "@/components/StatusTicker";
import { FireNotice } from "@/components/FireWatch";
import { MethodsDrawer } from "@/components/MethodsDrawer";
import { Shortcuts } from "@/components/Shortcuts";

const DEFAULT_VIEW: ViewState = {
  variableKeys: ["T2M"],
  lens: "effect",
  windowId: "25y",
  season: "all",
  cityId: null,
  panelTab: "file",
  areasOn: true,
  fireOn: false,
  night: false,
  labels: true,
  gridOn: true,
  methodsOpen: false,
};

const LENS_KEYS: Record<string, Lens> = {
  "1": "effect",
  "2": "evidence",
  "3": "agreement",
  "4": "coverage",
};

const BOARD_VARIABLES = ["T2M", "PRECTOTCORR", "AOD_55", "T2M_MAX"];

function boardVariableKeys(variableKeys: string[]): string[] {
  return [...new Set([...variableKeys, ...BOARD_VARIABLES])];
}

function parseUrl(data: CoreData): ViewState {
  const params = new URLSearchParams(window.location.search);
  const next: ViewState = { ...DEFAULT_VIEW };
  const variables = params.get("v")?.split(",").filter((key) => data.variables.some((variable) => variable.key === key));
  if (variables?.length) next.variableKeys = variables;
  const place = params.get("place");
  if (place && data.cities.some((city) => city.id === place)) next.cityId = place;
  const windowParam = params.get("w");
  if (windowParam && data.trends.windows.some((window) => window.id === windowParam)) {
    next.windowId = windowParam as WindowId;
  } else {
    const from = Number(params.get("from"));
    if (Number.isFinite(from) && from > 1900) {
      const candidate = [...data.trends.windows].reverse().find((window) => from >= window.start - 2);
      if (candidate) next.windowId = candidate.id;
    }
  }
  const season = params.get("season") as Season | null;
  if (season && data.trends.seasons.includes(season)) next.season = season;
  const lens = params.get("lens") as Lens | null;
  if (lens && ["effect", "evidence", "agreement", "coverage"].includes(lens)) next.lens = lens;
  const panel = params.get("panel");
  if (panel === "brief") next.panelTab = "file";
  else if (panel === "file" || panel === "fire") next.panelTab = panel;
  next.areasOn = params.get("areas") !== "0";
  next.fireOn = params.get("fire") === "1";
  next.night = params.get("night") === "1";
  next.labels = params.get("labels") !== "0";
  next.gridOn = params.get("grid") !== "0";
  if (next.cityId && !params.get("panel")) next.panelTab = "file";
  return next;
}

function urlFor(view: ViewState, data: CoreData) {
  const params = new URLSearchParams();
  params.set("v", view.variableKeys.join(","));
  if (view.cityId) params.set("place", view.cityId);
  const windowDef = windowById(data.trends, view.windowId);
  params.set("w", view.windowId);
  params.set("from", String(windowDef.start));
  params.set("to", String(windowDef.end));
  params.set("season", view.season);
  params.set("lens", view.lens);
  params.set("panel", view.panelTab);
  if (!view.areasOn) params.set("areas", "0");
  if (view.fireOn) params.set("fire", "1");
  if (view.night) params.set("night", "1");
  if (!view.labels) params.set("labels", "0");
  if (!view.gridOn) params.set("grid", "0");
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

export default function App() {
  const [data, setData] = useState<CoreData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [projection, setProjection] = useState<"globe" | "mercator">("globe");
  const [splashDone, setSplashDone] = useState(false);
  const [view, setViewState] = useState<ViewState>(DEFAULT_VIEW);
  const [toast, setToast] = useState<string | null>(null);
  const [methodsOpen, setMethodsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<FireCluster | null>(null);
  const [fireNoticeDismissed, setFireNoticeDismissed] = useState(false);
  const [fetchingCity, setFetchingCity] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [boardRefreshToken, setBoardRefreshToken] = useState(0);
  const mapRef = useRef<GlobeMapHandle>(null);
  const toastTimer = useRef<number | null>(null);
  const cityRequestRef = useRef<string | null>(null);
  const cityAttemptsRef = useRef<Set<string>>(new Set());
  const refreshedTokenRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadCoreData()
      .then((core) => {
        setData(core);
        setViewState(parseUrl(core));
      })
      .catch((cause) => setError(String(cause?.message ?? cause)));
  }, []);

  useEffect(() => {
    if (!data) return;
    const url = urlFor(view, data);
    window.history.replaceState(null, "", url);
  }, [view, data]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const variableSignature = view.variableKeys.join(",");

  useEffect(() => {
    if (!data) return;
    ensureBoards(data, boardVariableKeys(view.variableKeys), view.windowId, view.season)
      .then((next) => {
        if (!next || !mountedRef.current) return;
        setData((previous) => (previous ? mergeCoreData(previous, next) : next));
      })
      .catch((cause) => console.warn("Board data unavailable", cause));
  }, [data, variableSignature, view.windowId, view.season]);

  useEffect(() => {
    if (!view.cityId) {
      cityRequestRef.current = null;
      cityAttemptsRef.current.clear();
      setFetchingCity(false);
      return;
    }
    if (!data) return;
    const cityId = view.cityId;
    if (data.loadedCities?.[cityId]) {
      cityRequestRef.current = null;
      setFetchingCity(false);
      return;
    }
    const primaryKey = view.variableKeys[0] ?? "T2M";
    const requestKey = `${cityId}|${primaryKey}|${view.windowId}|${view.season}`;
    if (cityRequestRef.current === requestKey || cityAttemptsRef.current.has(requestKey)) return;
    cityAttemptsRef.current.add(requestKey);
    cityRequestRef.current = requestKey;
    setFetchingCity(true);
    ensureCityDetail(data, cityId, primaryKey, view.windowId, view.season)
      .then((next) => {
        if (!mountedRef.current || cityRequestRef.current !== requestKey) return;
        if (next) {
          setData((previous) => (previous ? mergeCoreData(previous, next) : next));
          setBoardRefreshToken((token) => token + 1);
          if (!hasCityRecords(next.trends, cityId)) {
            showToast(next.backend.mode === "convex" ? "CITY CELL RETURNED NO TRENDS" : "CITY NOT CACHED — OFFLINE DEMO");
          }
        } else if (!hasCityRecords(data.trends, cityId)) {
          showToast(data.backend.mode === "convex" ? "CITY DATA NOT AVAILABLE" : "CITY NOT CACHED — OFFLINE DEMO");
        }
      })
      .catch((cause) => {
        console.warn(`City ${cityId} detail failed`, cause);
        if (mountedRef.current && cityRequestRef.current === requestKey) showToast("CITY FETCH FAILED");
      })
      .finally(() => {
        if (cityRequestRef.current === requestKey) {
          cityRequestRef.current = null;
          if (mountedRef.current) setFetchingCity(false);
        }
      });
  }, [data, view.cityId, view.variableKeys, view.windowId, view.season, showToast]);

  useEffect(() => {
    if (!data || !boardRefreshToken || refreshedTokenRef.current === boardRefreshToken) return;
    refreshedTokenRef.current = boardRefreshToken;
    ensureBoards(data, boardVariableKeys(view.variableKeys), view.windowId, view.season, true)
      .then((next) => {
        if (!next || !mountedRef.current) return;
        setData((previous) => (previous ? mergeCoreData(previous, next) : next));
      })
      .catch((cause) => console.warn("Board refresh after city fetch failed", cause));
  }, [data, boardRefreshToken, variableSignature, view.windowId, view.season]);

  const setView = useCallback((patch: Partial<ViewState>) => {
    setViewState((previous) => {
      const next = { ...previous, ...patch };
      if (patch.variableKeys && next.variableKeys.length < 2 && next.lens === "agreement") next.lens = "effect";
      return next;
    });
  }, []);

  const selectCity = useCallback((cityId: string) => {
    setRailOpen(false);
    setViewState((previous) => ({ ...previous, cityId, panelTab: "file" }));
  }, []);

  const openCase = useCallback((entry: CaseEntry) => {
    setRailOpen(false);
    setViewState((previous) => ({
      ...previous,
      cityId: entry.placeId,
      variableKeys: entry.variableKeys,
      windowId: entry.windowId,
      season: entry.season,
      panelTab: "file",
      lens: "effect",
    }));
  }, []);

  const share = useCallback(async () => {
    if (!data) return;
    const url = urlFor(view, data);
    try {
      await navigator.clipboard.writeText(url);
      showToast("SHARE URL COPIED");
    } catch {
      window.prompt("Copy this share URL", url);
    }
  }, [data, view, showToast]);

  const flyToCluster = useCallback((cluster: FireCluster) => {
    setSelectedCluster(cluster);
    setViewState((previous) => ({ ...previous, panelTab: "fire", fireOn: true }));
    mapRef.current?.flyToCoords(cluster.lon, cluster.lat, 7);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const province = (event as CustomEvent<string>).detail;
      if (!data) return;
      const cluster = data.fires.clusters.find((candidate) => candidate.province === province);
      if (cluster) flyToCluster(cluster);
    };
    window.addEventListener("holmes:fire-select", handler);
    return () => window.removeEventListener("holmes:fire-select", handler);
  }, [data, flyToCluster]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (event.key === "Escape") {
        setMethodsOpen(false);
        setShortcutsOpen(false);
        setRailOpen(false);
        return;
      }
      if (typing) return;
      if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen(true);
      }
      if (event.key === "m" || event.key === "M") setMethodsOpen(true);
      if (event.key === "e" || event.key === "E") setView({ lens: "evidence" });
      if (event.key === "f" || event.key === "F") setView({ fireOn: !view.fireOn });
      if (LENS_KEYS[event.key]) setView({ lens: LENS_KEYS[event.key] });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setView, view.fireOn]);

  const selectedCity = data ? cityById(data.cities, view.cityId) : null;
  const hero = !view.cityId;
  const showPanel = Boolean(view.cityId) || view.panelTab === "fire";

  if (error) {
    return (
      <div className="app-shell flex items-center justify-center p-6">
        <div className="glass-panel max-w-lg p-6 text-center">
          <div className="hud-title text-base text-[var(--amber)]">DATA LOAD FAILED</div>
          <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-dim)]">
            {error}. This build reads data from Convex. Check <span className="hud-mono text-[var(--accent)]">VITE_CONVEX_URL</span> and seed the deployment with <span className="hud-mono text-[var(--accent)]">pnpm seed</span>.
          </p>
          <button className="btn-hud mt-4" onClick={() => window.location.reload()}>RETRY</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="app-shell">
        <Splash ready={false} onDone={() => setSplashDone(true)} />
      </div>
    );
  }

  return (
    <>
    <div className="app-shell">
      <GlobeMap
        ref={mapRef}
        data={data}
        view={view}
        onSelectCity={selectCity}
        onReady={() => setMapReady(true)}
        onProjectionChange={setProjection}
      />
      <div className="vignette" />
      <div className="crt-scanlines" />
      <div className="corner-frame" />
      <div className="corner-frame corner-frame--tr" />
      <div className="corner-frame corner-frame--bl" />
      <div className="corner-frame corner-frame--br" />

      <Header
        data={data}
        view={view}
        selectedCity={selectedCity}
        fetchingCity={fetchingCity}
        onShare={share}
        onMethods={() => setMethodsOpen(true)}
        onTour={() => startFeatureTour(data.cities.length)}
      />

      {!showPanel ? (
        <button
          type="button"
          className="mobile-controls btn-hud"
          onClick={() => setRailOpen(true)}
          aria-controls="holmes-lens-rail"
          aria-expanded={railOpen}
          aria-label="Open lens controls"
        >
          <SlidersHorizontal size={12} /> CONTROLS
        </button>
      ) : null}

      {railOpen ? (
        <button type="button" className="mobile-rail-backdrop" aria-label="Close lens controls" onClick={() => setRailOpen(false)} />
      ) : null}

      <VariableRail
        data={data}
        view={view}
        selectedCity={selectedCity}
        open={railOpen}
        onClose={() => setRailOpen(false)}
        onSetView={setView}
        onMethods={() => {
          setRailOpen(false);
          setMethodsOpen(true);
        }}
      />

      {showPanel ? (
        <RightPanel
          data={data}
          view={view}
          fetchingCity={fetchingCity}
          onSetView={setView}
          onShare={share}
          selectedCluster={selectedCluster}
          onSelectCluster={setSelectedCluster}
          onFlyCluster={flyToCluster}
        />
      ) : null}

      {view.fireOn && !fireNoticeDismissed && view.panelTab !== "fire" && data.fires.clusters.length ? (
        <FireNotice
          data={data}
          onView={() => {
            setFireNoticeDismissed(true);
            setView({ panelTab: "fire" });
          }}
          onDismiss={() => setFireNoticeDismissed(true)}
        />
      ) : null}

      <div className="map-controls glass-panel !p-1" id="tour-map-controls">
        <button className="btn-hud btn-hud--ghost !px-2" onClick={() => mapRef.current?.zoomBy(1)} aria-label="Zoom in"><Plus size={12} /></button>
        <button className="btn-hud btn-hud--ghost !px-2" onClick={() => mapRef.current?.zoomBy(-1)} aria-label="Zoom out"><Minus size={12} /></button>
        <div className="h-px w-full bg-[var(--border)]" />
        <button
          className={`btn-hud btn-hud--ghost !px-2 ${projection === "globe" ? "btn-hud--active" : ""}`}
          onClick={() => mapRef.current?.setProjection("globe")}
          aria-pressed={projection === "globe"}
          title="Globe projection"
        >
          <Globe2 size={12} />
        </button>
        <button
          className={`btn-hud btn-hud--ghost !px-2 ${projection === "mercator" ? "btn-hud--active" : ""}`}
          onClick={() => mapRef.current?.setProjection("mercator")}
          aria-pressed={projection === "mercator"}
          title="Flat projection"
        >
          <MapIcon size={12} />
        </button>
        <button className="btn-hud btn-hud--ghost !px-2" onClick={() => mapRef.current?.reset()} title="Reset camera"><RotateCcw size={12} /></button>
        <div className="h-px w-full bg-[var(--border)]" />
        <button
          className={`btn-hud btn-hud--ghost !px-2 ${view.fireOn ? "!text-[var(--ember)]" : ""}`}
          onClick={() => setView({ fireOn: !view.fireOn })}
          title="Toggle fire watch"
        >
          <Flame size={12} />
        </button>
      </div>

      <CitySearch cities={data.cities} onSelect={selectCity} />

      {hero ? (
        <div className="cases-strip glass-panel px-2 py-1.5" id="tour-cases">
          <span className="hud-label mr-1 flex items-center gap-1"><Sparkles size={9} /> STARTER CASES</span>
          {data.cases.slice(0, 6).map((entry) => (
            <button key={entry.slug} className="chip-btn !py-1" onClick={() => openCase(entry)} title={entry.narrative}>
              {entry.title}
            </button>
          ))}
        </div>
      ) : null}

      <StatusTicker
        data={data}
        view={view}
        selectedCity={selectedCity}
        fetchingCity={fetchingCity}
        onOpenFile={() => setView({ panelTab: "file" })}
        onOpenFire={() => setView({ panelTab: "fire" })}
        onOpenMethods={() => setMethodsOpen(true)}
      />

      {methodsOpen ? <MethodsDrawer data={data} onClose={() => setMethodsOpen(false)} /> : null}
      {shortcutsOpen ? <Shortcuts onClose={() => setShortcutsOpen(false)} /> : null}

      {toast ? (
        <div className="fixed bottom-12 left-1/2 z-[300] -translate-x-1/2 rounded border border-[var(--border-strong)] bg-[rgba(14,22,30,0.96)] px-4 py-2 font-mono text-[10px] tracking-[0.1em] text-[var(--accent)] shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
    {!splashDone ? <Splash ready={mapReady} onDone={() => setSplashDone(true)} /> : null}
    </>
  );
}
