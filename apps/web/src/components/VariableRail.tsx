import { Check, SlidersHorizontal, Layers, Flame, LayoutGrid } from "lucide-react";
import type { CoreData } from "@/lib/api";
import type { City, Lens, Season, ViewState, WindowId } from "@/lib/types";
import { Legend } from "./Legend";
import { digitsFor, getRecord, signed, windowById } from "@/lib/trends";

const THEME_ORDER = ["HEAT", "WATER", "AIR", "ENERGY"] as const;
const LENSES: { id: Lens; label: string }[] = [
  { id: "effect", label: "EFFECT" },
  { id: "evidence", label: "EVIDENCE" },
  { id: "agreement", label: "AGREEMENT" },
  { id: "coverage", label: "COVERAGE" },
];
const SEASONS: { id: Season; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "DJF", label: "DJF" },
  { id: "MAM", label: "MAM" },
  { id: "JJA", label: "JJA" },
  { id: "SON", label: "SON" },
];

export function VariableRail({
  data,
  view,
  selectedCity,
  onSetView,
  onMethods,
}: {
  data: CoreData;
  view: ViewState;
  selectedCity: City | null;
  onSetView: (patch: Partial<ViewState>) => void;
  onMethods: () => void;
}) {
  const window = windowById(data.trends, view.windowId);
  const primaryKey = view.variableKeys[0] ?? "T2M";
  const aodSelected = view.variableKeys.includes("AOD_55");

  const toggleVariable = (key: string) => {
    const selected = view.variableKeys.includes(key);
    let next = selected ? view.variableKeys.filter((item) => item !== key) : [...view.variableKeys, key];
    if (!next.length) next = ["T2M"];
    if (next.length > 8) next = next.slice(0, 8);
    const patch: Partial<ViewState> = { variableKeys: next };
    if (next.length < 2 && view.mode === "combined") patch.mode = "single";
    if (next.length < 2 && view.lens === "agreement") patch.lens = "effect";
    if (key === "AOD_55" && !selected && view.windowId === "full") patch.windowId = "25y";
    onSetView(patch);
  };

  const badgeFor = (key: string) => {
    if (!selectedCity) return null;
    const record = getRecord(data.trends, selectedCity.id, key, view.windowId, view.season);
    if (!record || record.status !== "ok" || record.slope === null) return "—";
    return signed(record.slope, digitsFor(data.variables.find((variable) => variable.key === key)));
  };

  return (
    <aside className="left-rail glass-panel">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <div className="hud-label flex items-center gap-1.5">
          <SlidersHorizontal size={10} /> THE LENS
        </div>
        <div className="hud-label text-[var(--accent)]">{view.variableKeys.length} VARS</div>
      </div>

      <div className="rail-controls">
        <section className="rail-section">
          <div className="rail-heading">
            <div className="hud-label">MODE</div>
            <div className="font-mono text-[8px] text-[var(--text-muted)]">{view.mode.toUpperCase()}</div>
          </div>
          <div className="seg">
            <button className={`seg-btn ${view.mode === "single" ? "seg-btn--on" : ""}`} onClick={() => onSetView({ mode: "single" })}>
              SINGLE
            </button>
            <button
              className={`seg-btn ${view.mode === "combined" ? "seg-btn--on" : ""}`}
              onClick={() => onSetView({ mode: "combined" })}
              disabled={view.variableKeys.length < 2}
              title={view.variableKeys.length < 2 ? "Select two or more variables to combine" : "Standardized composite"}
            >
              COMBINED
            </button>
          </div>
        </section>

        <section className="rail-section">
          <div className="rail-heading">
            <div className="hud-label">LENS</div>
            <div className="font-mono text-[8px] text-[var(--text-muted)]">ONE AT A TIME</div>
          </div>
          <div className="seg">
            {LENSES.map((lens) => (
              <button
                key={lens.id}
                className={`seg-btn ${view.lens === lens.id ? "seg-btn--on" : ""}`}
                onClick={() => onSetView({ lens: lens.id })}
                disabled={lens.id === "agreement" && view.variableKeys.length < 2}
                title={lens.id === "agreement" && view.variableKeys.length < 2 ? "Select two or more variables to compare agreement" : undefined}
              >
                {lens.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rail-section">
          <div className="rail-heading">
            <div className="hud-label">WINDOW</div>
            <div className="font-mono text-[8px] text-[var(--accent)]">{window.short}</div>
          </div>
          <div className="seg">
            {data.trends.windows.map((item) => (
              <button
                key={item.id}
                className={`seg-btn ${view.windowId === item.id ? "seg-btn--on" : ""}`}
                onClick={() => onSetView({ windowId: item.id as WindowId })}
                title={item.label}
              >
                {item.short}
              </button>
            ))}
          </div>
          <div className="font-mono text-[8px] text-[var(--text-muted)]">{window.start}–{window.end} · slope per decade</div>
        </section>

        <section className="rail-section">
          <div className="rail-heading">
            <div className="hud-label">SEASON</div>
            <div className="font-mono text-[8px] text-[var(--text-muted)]">{view.season === "all" ? "12 MONTHS" : view.season}</div>
          </div>
          <div className="seg">
            {SEASONS.map((season) => (
              <button
                key={season.id}
                className={`seg-btn ${view.season === season.id ? "seg-btn--on" : ""}`}
                onClick={() => onSetView({ season: season.id })}
              >
                {season.label}
              </button>
            ))}
          </div>
        </section>

        <Legend data={data} view={view} />
      </div>

      <div className="rail-catalog">
        <section className="rail-section">
          <div className="rail-heading">
            <div className="hud-label">VARIABLES</div>
            <div className="flex gap-2">
              <button
                className="font-mono text-[8px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--accent)]"
                onClick={() => onSetView({ variableKeys: ["T2M", "T2M_MAX", "PRECTOTCORR", "GWETROOT", "AOD_55", "WS2M", "ALLSKY_SFC_SW_DWN"] })}
              >
                ALL
              </button>
              <button
                className="font-mono text-[8px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--accent)]"
                onClick={() => onSetView({ variableKeys: ["T2M"], mode: "single" })}
              >
                CLEAR
              </button>
            </div>
          </div>
          {THEME_ORDER.map((theme) => {
            const variables = data.variables.filter((variable) => variable.theme === theme);
            if (!variables.length) return null;
            return (
              <div key={theme} className="mb-0.5">
                <div className="mb-0.5 font-mono text-[7px] tracking-[0.12em] text-[var(--text-muted)] opacity-80">{theme}</div>
                {variables.map((variable) => {
                  const active = view.variableKeys.includes(variable.key);
                  const coverage = variable.coverageStart.startsWith("2001") ? "#f5b84b" : "#4d95d8";
                  return (
                    <button
                      key={variable.key}
                      className={`var-row w-full text-left focus-ring ${active ? "var-row--active" : ""}`}
                      onClick={() => toggleVariable(variable.key)}
                      aria-pressed={active}
                      title={`${variable.definition} · ${variable.units}`}
                    >
                      <span className={`var-check ${active ? "var-check--on" : ""}`}>
                        {active ? <Check size={8} strokeWidth={3} /> : null}
                      </span>
                      <span className="var-meta">
                        <span className="var-name">{variable.label}</span>
                        <span className="var-code block">{variable.code}</span>
                      </span>
                      {selectedCity ? <span className="var-badge">{badgeFor(variable.key)}</span> : null}
                      <span className="coverage-dot" style={{ background: coverage }} />
                    </button>
                  );
                })}
              </div>
            );
          })}
          {aodSelected ? (
            <div className="font-mono text-[8px] leading-relaxed text-[var(--amber)]/80">
              AOD coverage starts 2001. The window is adjusted where needed.
            </div>
          ) : null}
        </section>

        <div className="divider" />

        <section className="rail-section">
          <div className="hud-label flex items-center gap-1.5"><Layers size={10} /> LAYERS</div>
          <label className="flex items-center justify-between py-0.5 text-[10.5px] text-[var(--text-dim)]">
            <span>City areas</span>
            <span className="tag tag--ok">ON</span>
          </label>
          <button
            className="flex w-full items-center justify-between py-0.5 text-left text-[10.5px] text-[var(--text-dim)]"
            onClick={() => onSetView({ fireOn: !view.fireOn })}
          >
            <span className="flex items-center gap-1.5"><Flame size={11} className="text-[var(--ember)]" /> Fire watch</span>
            <span className={`tag ${view.fireOn ? "tag--fire" : "tag--muted"}`}>{view.fireOn ? "ON" : "OFF"}</span>
          </button>
          <button
            className="flex w-full items-center justify-between py-0.5 text-left text-[10.5px] text-[var(--text-dim)]"
            onClick={() => onSetView({ gridOn: !view.gridOn })}
          >
            <span className="flex items-center gap-1.5"><LayoutGrid size={11} className="text-[var(--cyan)]" /> MERRA cell grid</span>
            <span className={`tag ${view.gridOn ? "tag--ok" : "tag--muted"}`}>{view.gridOn ? "ON" : "OFF"}</span>
          </button>
          <button
            className="flex w-full items-center justify-between py-0.5 text-left text-[10.5px] text-[var(--text-dim)]"
            onClick={() => onSetView({ labels: !view.labels })}
          >
            <span>City labels</span>
            <span className={`tag ${view.labels ? "tag--ok" : "tag--muted"}`}>{view.labels ? "ON" : "OFF"}</span>
          </button>
          <button
            className="flex w-full items-center justify-between py-0.5 text-left text-[10.5px] text-[var(--text-dim)]"
            onClick={() => onSetView({ night: !view.night })}
          >
            <span>Night side</span>
            <span className={`tag ${view.night ? "tag--ok" : "tag--muted"}`}>{view.night ? "ON" : "OFF"}</span>
          </button>
        </section>

        <button className="mt-2 w-full text-left font-mono text-[8px] leading-relaxed tracking-[0.08em] text-[var(--text-muted)] hover:text-[var(--accent)]" onClick={onMethods}>
          METHOD {data.trends.methodVersion} · SEN + MANN–KENDALL + FDR
          <br />
          NASA POWER / MERRA-2 · CERES · NASA FIRMS
          <br />
          <span className="text-[var(--accent-dim)]">OPEN METHODS + LIMITATIONS →</span>
        </button>
      </div>
    </aside>
  );
}
