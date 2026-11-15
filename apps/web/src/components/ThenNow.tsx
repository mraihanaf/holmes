import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X, SplitSquareHorizontal } from "lucide-react";
import type { City, ThenNowEntry } from "@/lib/types";
import { defaultComparisonMonth, thenNowForCity } from "@/lib/satellite";

function assetUrl(path: string | undefined): string | undefined {
  if (!path || !path.startsWith("/")) return path;
  const base = import.meta.env.BASE_URL;
  if (base !== "/" && path.startsWith(base)) return path;
  return `${base.replace(/\/$/, "")}${path}`;
}

function images(entry: ThenNowEntry, mode: "true" | "false") {
  const start =
    mode === "true"
      ? entry.startTrueImage ?? entry.images?.start?.true ?? entry.trueImage
      : entry.startFalseImage ?? entry.images?.start?.false ?? entry.falseImage;
  const end =
    mode === "true"
      ? entry.endTrueImage ?? entry.images?.end?.true ?? entry.trueImage
      : entry.endFalseImage ?? entry.images?.end?.false ?? entry.falseImage;
  return { start: assetUrl(start), end: assetUrl(end) };
}

function Compare({ entry, mode, large = false }: { entry: ThenNowEntry; mode: "true" | "false"; large?: boolean }) {
  const [split, setSplit] = useState(50);
  const [failed, setFailed] = useState(false);
  const { start, end } = images(entry, mode);

  useEffect(() => {
    setFailed(false);
  }, [entry.cityId, mode]);

  return (
    <div>
      <div className="compare-frame" style={large ? { aspectRatio: "16 / 8" } : undefined}>
        <img src={end} alt={`${entry.label} ${entry.endDate} ${mode} color`} onError={() => setFailed(true)} />
        <img
          src={start}
          alt={`${entry.label} ${entry.startDate} ${mode} color`}
          style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
          onError={() => setFailed(true)}
        />
        <div className="compare-handle" style={{ left: `${split}%` }} />
        <span className="compare-label left-2">{entry.startDate}</span>
        <span className="compare-label right-2">{entry.endDate}</span>
        {entry.fallback ? <span className="tag tag--warn absolute bottom-2 left-2">FALLBACK IMAGE</span> : null}
        {failed ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(5,14,22,0.88)] p-4 text-center font-mono text-[9px] text-[var(--text-dim)]">
            GIBS IMAGERY UNAVAILABLE FOR THIS DATE
          </div>
        ) : null}
      </div>
      <input
        className="compare-range mt-2"
        type="range"
        min={2}
        max={98}
        value={split}
        aria-label="Compare then and now"
        onChange={(event) => setSplit(Number(event.target.value))}
      />
    </div>
  );
}

export function ThenNow({ entry, city }: { entry: ThenNowEntry | undefined; city: City }) {
  const [mode, setMode] = useState<"true" | "false">("true");
  const [full, setFull] = useState(false);
  const [month, setMonth] = useState(() => defaultComparisonMonth(city));
  const resolved = useMemo(() => entry ?? thenNowForCity(city, month), [entry, city, month]);
  const live = !entry;

  useEffect(() => {
    setMonth(defaultComparisonMonth(city));
  }, [city.id, city.lat]);

  useEffect(() => {
    if (!full) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);

  const entryValue = resolved;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="hud-label flex items-center gap-1.5">
          <SplitSquareHorizontal size={10} /> THEN & NOW · {entryValue.label.toUpperCase()}
          <span className={`tag ${live ? "tag--info" : "tag--ok"}`}>{live ? "LIVE GIBS" : "CACHED"}</span>
        </div>
        <button className="btn-hud btn-hud--ghost !p-1" onClick={() => setFull(true)} aria-label="Open full screen comparison">
          <Maximize2 size={11} />
        </button>
      </div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button className={`seg-btn ${mode === "true" ? "seg-btn--on" : ""}`} onClick={() => setMode("true")}>TRUE COLOR</button>
          <button className={`seg-btn ${mode === "false" ? "seg-btn--on" : ""}`} onClick={() => setMode("false")}>FALSE COLOR</button>
          {live ? (
            <select
              className="seg-btn !px-1 font-mono text-[8px]"
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              aria-label="Comparison month"
            >
              {["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].map((label, index) => (
                <option key={label} value={index + 1}>{label}</option>
              ))}
            </select>
          ) : null}
        </div>
      </div>
      <Compare entry={entryValue} mode={mode} />
      <div className="mt-2 font-mono text-[8px] leading-relaxed text-[var(--text-muted)]">
        {entryValue.sensor} · {entryValue.resolution} per pixel · NASA GIBS
        <br />
        {entryValue.caveat}
      </div>
      {full ? createPortal(
        <div className="modal-backdrop" onClick={() => setFull(false)}>
          <div className="modal-card glass-panel p-4" style={{ width: "min(1100px, 94vw)" }} onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="hud-title text-sm">{entryValue.label.toUpperCase()} · THEN & NOW</div>
                <div className="hud-label mt-1">{entryValue.sensor} · {entryValue.resolution} · NASA GIBS</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <button className={`seg-btn ${mode === "true" ? "seg-btn--on" : ""}`} onClick={() => setMode("true")}>TRUE</button>
                  <button className={`seg-btn ${mode === "false" ? "seg-btn--on" : ""}`} onClick={() => setMode("false")}>FALSE</button>
                </div>
                <button className="btn-hud" onClick={() => setFull(false)}><X size={12} /></button>
              </div>
            </div>
            <Compare entry={entryValue} mode={mode} large />
            <div className="mt-3 flex items-center justify-between gap-3 font-mono text-[8px] text-[var(--text-muted)]">
              <span>{entryValue.caveat}</span>
              <span>NASA GIBS · MODIS TERRA · 250 M–1 KM</span>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
