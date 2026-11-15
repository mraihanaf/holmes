import { useEffect, useState } from "react";
import type { CoreData } from "@/lib/api";
import type { City, ViewState } from "@/lib/types";
import { digitsFor, formatP, getRecord, signed, slopeUnit, windowById } from "@/lib/trends";

export function StatusTicker({
  data,
  view,
  selectedCity,
  cachedCells,
  fetchingCity,
  onOpenFile,
  onOpenFire,
  onOpenMethods,
}: {
  data: CoreData;
  view: ViewState;
  selectedCity: City | null;
  cachedCells: number;
  fetchingCity: boolean;
  onOpenFile: () => void;
  onOpenFire: () => void;
  onOpenMethods: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const primary = view.variableKeys[0] ?? "T2M";
  const variable = data.variables.find((item) => item.key === primary);
  const record = selectedCity ? getRecord(data.trends, selectedCity.id, primary, view.windowId, view.season) : null;
  const windowDef = windowById(data.trends, view.windowId);
  const fire = data.fires.clusters[0];

  const items: { text: string; onClick?: () => void }[] = [];
  if (fetchingCity) {
    items.push({ text: "FETCHING CITY DATA · NASA POWER CELL · TREND + SERIES CACHE" });
  }
  if (selectedCity && record) {
    items.push({
      text: `${selectedCity.name.toUpperCase()} ${variable?.code ?? primary} ${signed(record.slope, digitsFor(variable))} ${slopeUnit(variable)} · ${formatP(record.p)}`,
      onClick: onOpenFile,
    });
  }
  items.push({ text: `${data.cities.length} CITIES · ${view.variableKeys.length} VARIABLES · ${windowDef.start}–${windowDef.end}` });
  items.push({ text: `${cachedCells} CACHED CELLS · q ACROSS CACHED CELLS · GRAY = NOT CACHED — CLICK TO FETCH` });
  items.push({ text: `LENS: ${view.lens.toUpperCase()} · COMPUTED EVIDENCE` });
  if (fire) {
    items.push({
      text: `FIRMS // ${fire.province.toUpperCase()} // ${fire.count} DETECTIONS // ${Math.round(fire.sumFrp)} MW // ${fire.start}–${fire.end}`,
      onClick: onOpenFire,
    });
  }
  items.push({ text: `METHOD ${data.trends.methodVersion} · SEN SLOPE · MANN–KENDALL · FDR`, onClick: onOpenMethods });
  items.push({ text: `NASA POWER / MERRA-2 · RETRIEVED ${data.trends.generatedAt.slice(0, 10)}` });

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % items.length), 6500);
    return () => window.clearInterval(timer);
  }, [items.length, paused]);

  const item = items[index % items.length];
  return (
    <footer className="status-ticker" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <span className="tag tag--ok">STATUS</span>
      <button key={`${index}-${item.text}`} className="ticker-item truncate text-[var(--text-dim)]" onClick={item.onClick}>
        {item.text}
      </button>
      <span className="ml-auto flex shrink-0 items-center gap-3">
        <span className="ticker-sep">|</span>
        <span>NASA POWER</span>
        <span className="ticker-sep">|</span>
        <span>FIRMS</span>
        <span className="ticker-sep">|</span>
        <span>GIBS</span>
        <span className="ticker-sep">|</span>
        <span className="text-[var(--accent-dim)]">{cachedCells} CACHED CELLS</span>
      </span>
    </footer>
  );
}
