import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X, SplitSquareHorizontal } from "lucide-react";
import type { ThenNowEntry } from "@/lib/types";

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
  const { start, end } = images(entry, mode);
  return (
    <div>
      <div className="compare-frame" style={large ? { aspectRatio: "16 / 8" } : undefined}>
        <img src={end} alt={`${entry.label} ${entry.endDate} ${mode} color`} />
        <img
          src={start}
          alt={`${entry.label} ${entry.startDate} ${mode} color`}
          style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
        />
        <div className="compare-handle" style={{ left: `${split}%` }} />
        <span className="compare-label left-2">{entry.startDate}</span>
        <span className="compare-label right-2">{entry.endDate}</span>
        {entry.fallback ? <span className="tag tag--warn absolute bottom-2 left-2">FALLBACK IMAGE</span> : null}
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

export function ThenNow({ entry }: { entry: ThenNowEntry | undefined }) {
  const [mode, setMode] = useState<"true" | "false">("true");
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!full) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);

  if (!entry) {
    return (
      <div className="glass-inset p-3">
        <div className="hud-label mb-1">THEN & NOW</div>
        <div className="text-[11px] text-[var(--text-dim)]">
          No cached satellite snapshot for this city. Imagery starts in 2000; cached comparisons exist for Jakarta and Wisconsin.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="hud-label flex items-center gap-1.5"><SplitSquareHorizontal size={10} /> THEN & NOW · {entry.label.toUpperCase()}</div>
        <button className="btn-hud btn-hud--ghost !p-1" onClick={() => setFull(true)} aria-label="Open full screen comparison">
          <Maximize2 size={11} />
        </button>
      </div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          <button className={`seg-btn ${mode === "true" ? "seg-btn--on" : ""}`} onClick={() => setMode("true")}>TRUE COLOR</button>
          <button className={`seg-btn ${mode === "false" ? "seg-btn--on" : ""}`} onClick={() => setMode("false")}>FALSE COLOR</button>
        </div>
      </div>
      <Compare entry={entry} mode={mode} />
      <div className="mt-2 font-mono text-[8px] leading-relaxed text-[var(--text-muted)]">
        {entry.sensor} · {entry.resolution} per pixel · NASA GIBS
        <br />
        {entry.caveat}
      </div>
      {full ? createPortal(
        <div className="modal-backdrop" onClick={() => setFull(false)}>
          <div className="modal-card glass-panel p-4" style={{ width: "min(1100px, 94vw)" }} onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="hud-title text-sm">{entry.label.toUpperCase()} · THEN & NOW</div>
                <div className="hud-label mt-1">{entry.sensor} · {entry.resolution} · NASA GIBS</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <button className={`seg-btn ${mode === "true" ? "seg-btn--on" : ""}`} onClick={() => setMode("true")}>TRUE</button>
                  <button className={`seg-btn ${mode === "false" ? "seg-btn--on" : ""}`} onClick={() => setMode("false")}>FALSE</button>
                </div>
                <button className="btn-hud" onClick={() => setFull(false)}><X size={12} /></button>
              </div>
            </div>
            <Compare entry={entry} mode={mode} large />
            <div className="mt-3 flex items-center justify-between gap-3 font-mono text-[8px] text-[var(--text-muted)]">
              <span>{entry.caveat}</span>
              <span>NASA GIBS · MODIS TERRA · 250 M–1 KM</span>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
