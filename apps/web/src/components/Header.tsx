import { useEffect, useState } from "react";
import { Share2, BookOpen, CircleHelp } from "lucide-react";
import type { CoreData } from "@/lib/api";
import type { City, ViewState } from "@/lib/types";
import { SEASON_LABEL, modeFor, windowById } from "@/lib/trends";

export function Header({
  data,
  view,
  selectedCity,
  cachedCells,
  fetchingCity,
  onShare,
  onMethods,
  onTour,
}: {
  data: CoreData;
  view: ViewState;
  selectedCity: City | null;
  cachedCells: number;
  fetchingCity: boolean;
  onShare: () => void;
  onMethods: () => void;
  onTour: () => void;
}) {
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const windowDef = windowById(data.trends, view.windowId);
  const primary = view.variableKeys[0] ?? "T2M";
  const variable = data.variables.find((item) => item.key === primary);
  const utc = clock.toISOString().slice(11, 19);
  const mode = modeFor(view.variableKeys);

  return (
    <header className="header">
      <div className="wordmark">
        <h1>HOLMES</h1>
        <span>EARTH SYSTEM DETECTIVE</span>
      </div>
      <div className="breadcrumb">
        <b>CASE</b> {selectedCity ? selectedCity.name.toUpperCase() : "NO CASE"}
        <span className="text-[rgba(77,149,216,0.28)]">//</span>
        <b>{variable?.code ?? primary}</b>
        <span className="text-[rgba(77,149,216,0.28)]">//</span>
        <b>{windowDef.start}–{windowDef.end}</b>
        <span className="text-[rgba(77,149,216,0.28)]">//</span>
        <b>{SEASON_LABEL[view.season]}</b>
        <span className="text-[rgba(77,149,216,0.28)]">//</span>
        <b>{mode === "combined" ? "COMBINED" : "SINGLE"}</b>
      </div>
      <div className="status-chips">
        <span className={`tag ${data.backend.mode === "convex" ? "tag--info" : "tag--muted"}`}>
          {data.backend.mode === "convex" ? "CONVEX · CACHED" : "MODE: CACHED"}
        </span>
        <span className="tag tag--info">LENS: {view.lens.toUpperCase()}</span>
        <span className="tag tag--muted hide-tablet hide-narrow">WINDOW: {windowDef.start}–{windowDef.end}</span>
        <span className="tag tag--muted hide-tablet hide-narrow">VARS: {view.variableKeys.length}</span>
        <span className="tag tag--muted hide-tablet hide-narrow">CITIES: {data.cities.length}</span>
        <span className="tag tag--info" title="Cached cells color the map. Gray cities are not cached yet.">
          CACHED CELLS: {cachedCells}
        </span>
        {fetchingCity ? (
          <span className="tag tag--warn">
            <span className="live-dot" /> FETCHING CITY DATA
          </span>
        ) : null}
        {data.fires.clusters.length ? (
          <span className="tag tag--fire">FIRMS: {data.fires.snapshot.end.slice(5)}</span>
        ) : null}
        <span className="hud-mono text-[9px] text-[var(--text-muted)]">UTC {utc}</span>
        <button className="btn-hud" onClick={onShare} title="Copy share URL" id="tour-share">
          <Share2 size={10} /> SHARE
        </button>
        <button className="btn-hud btn-hud--ghost" onClick={onMethods} title="Methods and limitations" aria-label="Methods and limitations">
          <BookOpen size={11} />
        </button>
        <button className="btn-hud btn-hud--ghost" onClick={onTour} title="Feature tour" aria-label="Open feature tour" id="tour-help">
          <CircleHelp size={11} />
        </button>
      </div>
    </header>
  );
}
