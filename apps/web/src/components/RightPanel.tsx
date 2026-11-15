import { useEffect, useState } from "react";
import { BookOpen, Flame, HelpCircle, Share2, X } from "lucide-react";
import type { CoreData } from "@/lib/api";
import type { City, EvidenceLevel, FireCluster, PanelTab, ViewState, Variable } from "@/lib/types";
import {
  annualValuesForSparkline,
  cityById,
  digitsFor,
  directionWord,
  evidenceLine,
  formatP,
  formatQ,
  getRecord,
  hasCityRecords,
  makeCityNotes,
  seriesPoints,
  signed,
  slopeUnit,
  windowById,
} from "@/lib/trends";
import { EvidenceChart } from "./EvidenceChart";
import { FireWatchPanel } from "./FireWatch";
import { Sparkline } from "./Sparkline";
import { ThenNow } from "./ThenNow";

const SUMMARY_VARIABLES = ["T2M", "PRECTOTCORR", "AOD_55", "T2M_MAX"];

function ScopeTag({ level }: { level: EvidenceLevel }) {
  const map: Record<EvidenceLevel, string> = {
    strong: "tag--ok",
    moderate: "tag--info",
    weak: "tag--muted",
    insufficient: "tag--muted",
  };
  return <span className={`tag ${map[level]}`}>{level.toUpperCase()}</span>;
}

function verdictWord(variableKey: string, direction: string, significant: boolean, methodDependent: boolean) {
  if (methodDependent) return "METHOD-DEPENDENT";
  if (!significant) return "NO CLEAR TREND";
  if (variableKey === "T2M" || variableKey === "T2M_MAX" || variableKey === "T2M_MIN") {
    return direction === "increasing" ? "WARMING" : "COOLING";
  }
  if (variableKey === "PRECTOTCORR" || variableKey.startsWith("GWET")) {
    return direction === "increasing" ? "WETTER" : "DRYING";
  }
  if (variableKey === "AOD_55") {
    return direction === "increasing" ? "MORE AEROSOL" : "CLEANER AIR";
  }
  return direction === "increasing" ? "RISING" : "FALLING";
}

function ModisCaseCard({ data, city }: { data: CoreData; city: City }) {
  const modis = data.modis;
  const key = city.id === "jakarta" ? "jakarta" : city.id === "wisconsin" ? "wisconsin" : null;
  if (!modis || !key) return null;
  const trend = modis.trends[key];
  const buckets = new Map<number, { sum: number; count: number }>();
  for (const row of modis.series) {
    const value = row[key];
    if (value === null) continue;
    const year = Number(row.month.slice(0, 4));
    const bucket = buckets.get(year) ?? { sum: 0, count: 0 };
    bucket.sum += value;
    bucket.count += 1;
    buckets.set(year, bucket);
  }
  const spark = [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, bucket]) => bucket.sum / bucket.count);
  return (
    <div className="rounded border border-[rgba(111,231,255,0.22)] bg-[rgba(111,231,255,0.04)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="hud-label text-[var(--cyan)]">MODIS MYD08_M3 · CROSS-CHECK</div>
          <div className="mt-0.5 text-[12px] font-medium text-[var(--text)]">AOD at 550 nm · {city.name}</div>
        </div>
        <span className="tag tag--info">RESOURCES TAB</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <div className="font-mono text-[18px] font-bold text-[var(--cyan)]">
            {trend.slopePerDecade > 0 ? "+" : ""}{trend.slopePerDecade.toFixed(3)}
            <span className="ml-1 text-[8px] font-normal text-[var(--text-muted)]">AOD/decade</span>
          </div>
          <div className="font-mono text-[8px] text-[var(--text-dim)]">
            {formatP(trend.p)} · {trend.nYears} years · MK annual means
          </div>
        </div>
        <Sparkline values={spark} color="#6fe7ff" width={84} height={22} />
      </div>
      <div className="mt-2 text-[9.5px] leading-relaxed text-[var(--text-muted)]">
        {trend.verdict} Annual means 2003–2025 from NASA LAADS / Giovanni. This is the challenge Resources-tab case; it is a cross-check, not the live city layer.
      </div>
    </div>
  );
}

function CityFileView({
  data,
  view,
  city,
  onSetView,
  onShare,
}: {
  data: CoreData;
  view: ViewState;
  city: City;
  onSetView: (patch: Partial<ViewState>) => void;
  onShare: () => void;
}) {
  const primaryKey = view.variableKeys[0] ?? "T2M";
  const primaryVariable = data.variables.find((variable) => variable.key === primaryKey);
  const primaryRecord = getRecord(data.trends, city.id, primaryKey, view.windowId, view.season);
  const window = windowById(data.trends, view.windowId);
  const rowKeys = [...new Set([primaryKey, ...view.variableKeys, ...SUMMARY_VARIABLES])].slice(0, 8);
  const [expandedKey, setExpandedKey] = useState(primaryKey);
  useEffect(() => {
    if (!rowKeys.includes(expandedKey)) setExpandedKey(primaryKey);
  }, [primaryKey, expandedKey, rowKeys]);
  const expandedVariable = data.variables.find((variable) => variable.key === expandedKey);
  const expandedRecord = getRecord(data.trends, city.id, expandedKey, view.windowId, view.season);
  const expandedPoints = seriesPoints(data.series, city.id, expandedKey).filter((point) => point.year >= window.start && point.year <= window.end);
  const notes = makeCityNotes(data.trends, data.variables, city.id, SUMMARY_VARIABLES, view.windowId, view.season);
  const thenNow = data.thenNow[city.id];
  const direction = primaryRecord?.direction ?? "none";
  const verdict = primaryRecord
    ? verdictWord(primaryKey, direction, primaryRecord.significantVar, primaryRecord.methodDependent)
    : "INSUFFICIENT DATA";

  return (
    <div className="panel-scroll space-y-4">
      <div className="glass-inset px-2 py-1.5 font-mono text-[8px] leading-relaxed text-[var(--text-muted)]">
        <span className="text-[var(--accent)]">VARIABLE</span> → REGION → SERIES → SIGNIFICANCE
        <br />
        {primaryVariable?.code ?? primaryKey} → {city.name} → {window.start}–{window.end} → {primaryRecord ? formatP(primaryRecord.p) : "no data"}
      </div>

      <div>
        <div className="hud-label mb-1">HOLMES NOTES · AUTO-GENERATED</div>
        <div className="font-mono text-[8px] text-[var(--text-muted)]">{city.name.toUpperCase()} · {window.start}–{window.end} · {view.season === "all" ? "ALL MONTHS" : view.season}</div>
        <div className="mt-1">
          {notes.map((note) => (
            <div className="note-row" key={note.variableKey}>
              <span
                className="note-dot"
                style={{ background: note.tone === "rising" ? "var(--amber)" : note.tone === "falling" ? "var(--blue)" : note.tone === "insufficient" ? "#42586b" : "var(--slate)" }}
              />
              <div className="note-text">{note.text}</div>
              <ScopeTag level={note.evidence} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9px] text-[var(--accent)]">EVIDENCE: {evidenceLine(notes)}</span>
          <span className="font-mono text-[8px] text-[var(--text-muted)]">q-values are FDR-adjusted</span>
        </div>
        <div className="mt-1 text-[9.5px] leading-relaxed text-[var(--text-muted)]">
          Caveat: MERRA-2 grid cell ≈ 55 × 69 km, not a weather station.
        </div>
      </div>

      <div className="rounded border border-[var(--border)] bg-[rgba(77,149,216,0.03)] p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="hud-label">VERDICT · {primaryVariable?.label.toUpperCase()}</div>
            <div className="mt-1 font-mono text-[15px] font-bold tracking-wide text-[var(--text)]">{verdict}</div>
            <div className="mt-1 font-mono text-[21px] font-bold text-[var(--accent)]">
              {primaryRecord?.slope === null || primaryRecord?.slope === undefined ? "—" : signed(primaryRecord.slope, digitsFor(primaryVariable))}
              <span className="ml-1 text-[9px] font-normal text-[var(--text-dim)]">{slopeUnit(primaryVariable)}</span>
            </div>
            <div className="mt-1 font-mono text-[9px] text-[var(--text-dim)]">
              {primaryRecord ? `${formatP(primaryRecord.p)} · ${primaryRecord.nYears} years · ${primaryRecord.n} months` : "no trend result"}
              {primaryRecord?.methodDependent ? ` · OLS HAC ${formatP(primaryRecord.pOls)}` : ""}
            </div>
          </div>
          <div className="text-right">
            <ScopeTag level={primaryRecord?.evidenceVar ?? "insufficient"} />
            {primaryRecord?.methodDependent ? <div className="mt-1"><span className="tag tag--warn">METHOD-DEPENDENT</span></div> : null}
          </div>
        </div>
        {primaryRecord?.ci ? (
          <div className="mt-2 font-mono text-[8px] text-[var(--text-muted)]">
            95% CI {signed(primaryRecord.ci[0], digitsFor(primaryVariable))} … {signed(primaryRecord.ci[1], digitsFor(primaryVariable))} {slopeUnit(primaryVariable)} · {primaryRecord.effectiveStart < window.start ? `coverage starts ${primaryRecord.effectiveStart}` : "full window"}
          </div>
        ) : null}
      </div>

      {primaryKey === "AOD_55" ? <ModisCaseCard data={data} city={city} /> : null}

      <div>
        <div className="mb-1 flex items-center justify-between">
          <div className="hud-label">EVIDENCE STACK</div>
          <div className="font-mono text-[8px] text-[var(--text-muted)]">{rowKeys.length} VARIABLES</div>
        </div>
        <div className="space-y-0.5">
          {rowKeys.map((key) => {
            const variable = data.variables.find((item) => item.key === key);
            const record = getRecord(data.trends, city.id, key, view.windowId, view.season);
            const spark = annualValuesForSparkline(data.series, city.id, key, window);
            const active = key === expandedKey;
            return (
              <div
                key={key}
                className={`evidence-row ${active ? "evidence-row--active" : ""}`}
                onClick={() => setExpandedKey(key)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setExpandedKey(key); }}
              >
                <div className="min-w-0">
                  <div className="truncate text-[10.5px] text-[var(--text)]">{variable?.label}</div>
                  <div className="font-mono text-[8px] text-[var(--text-muted)]">{variable?.code}</div>
                </div>
                <div className="text-right font-mono text-[9px] text-[var(--accent)]">
                  {record?.slope === null || record?.slope === undefined ? "—" : signed(record.slope, digitsFor(variable))}
                </div>
                <Sparkline values={spark} color="auto" width={42} height={16} />
                <ScopeTag level={record?.evidenceVar ?? "insufficient"} />
              </div>
            );
          })}
        </div>
        <div className="mt-1 pl-1.5 font-mono text-[8px] text-[var(--text-muted)]">
          p = raw · q = FDR-adjusted · outline uses q
        </div>
      </div>

      <div className="glass-inset p-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="hud-label">{expandedVariable?.label.toUpperCase()} · {window.label}</div>
          <span className="tag tag--muted">{expandedVariable?.code}</span>
        </div>
        <div className="mb-2 text-[10.5px] leading-relaxed text-[var(--text-dim)]">
          {expandedRecord
            ? `${expandedVariable?.label}: ${directionWord(expandedRecord.direction, expandedKey)}, ${signed(expandedRecord.slope, digitsFor(expandedVariable))} ${slopeUnit(expandedVariable)}, ${formatP(expandedRecord.p)}${expandedRecord.methodDependent ? " · METHOD-DEPENDENT" : ""}.`
            : "No trend result for this window."}
        </div>
        <EvidenceChart points={expandedPoints} record={expandedRecord} variable={expandedVariable} />
      </div>

      <ThenNow entry={thenNow} city={city} />

      <div>
        <div className="hud-label mb-1">PROVENANCE</div>
        <dl className="prov-grid">
          <dt>Source</dt><dd>NASA POWER / {primaryVariable?.sourceDetail} ({primaryVariable?.code})</dd>
          <dt>Parameter</dt><dd>{primaryVariable?.label} ({primaryVariable?.units})</dd>
          <dt>Period</dt><dd>{window.start}–{window.end} · {view.season === "all" ? "all months" : view.season}</dd>
          <dt>Retrieved</dt><dd>{data.trends.generatedAt.slice(0, 10)} · fetched on demand and cached in Convex</dd>
          <dt>Method A</dt><dd>Seasonal Sen slope · Hamed-Rao Mann–Kendall</dd>
          <dt>Method B</dt><dd>OLS with HAC (12 lags) · {primaryRecord?.methodDependent ? "disagrees" : "cross-check"}</dd>
          <dt>Method</dt><dd>{data.trends.methodVersion} · q-values FDR (Benjamini–Hochberg)</dd>
          <dt>Citation</dt><dd>NASA POWER (2026), monthly point API. NASA Langley Research Center.</dd>
          <dt>License</dt><dd>NASA data: open, attribution requested.</dd>
        </dl>
        <div className="mt-2 text-[9.5px] leading-relaxed text-[var(--text-muted)]">
          Caveats: reanalysis grid cell, not a station. A trend is an association, not a cause. Multiple variables were tested; q-values are FDR-adjusted. A short window is noisier; compare with the full record.
        </div>
      </div>

      <div className="action-row">
        <button className="btn-hud" onClick={() => onSetView({ lens: "evidence" })}><HelpCircle size={10} /> HOW SURE?</button>
        <button className="btn-hud" onClick={onShare}><Share2 size={10} /> SHARE</button>
      </div>
    </div>
  );
}

function CityFileLoading({ city }: { city: City }) {
  return (
    <div className="panel-scroll space-y-4" aria-busy="true" aria-live="polite">
      <div className="fetch-status">
        <span className="fetch-spinner" aria-hidden="true" />
        <div>
          <div className="font-mono text-[9px] tracking-[0.14em] text-[var(--amber)]">FETCHING MERRA-2 CELL</div>
          <div className="mt-0.5 font-mono text-[8px] tracking-[0.08em] text-[var(--text-muted)]">
            {city.cellId} · {city.lat.toFixed(2)}°, {city.lon.toFixed(2)}° · TREND + SERIES
          </div>
        </div>
      </div>
      <div className="fetch-track" aria-hidden="true"><span className="fetch-track__bar" /></div>
      <div className="skeleton-card">
        <div className="skeleton-line w-1/3" />
        <div className="skeleton-line w-full" />
        <div className="skeleton-line w-5/6" />
      </div>
      <div className="skeleton-card">
        <div className="skeleton-line w-1/4" />
        <div className="skeleton-line skeleton-line--hero w-2/3" />
        <div className="skeleton-line w-1/2" />
      </div>
      <div className="skeleton-card">
        {[0, 1, 2, 3].map((row) => (
          <div className="skeleton-row" key={row}>
            <span className="skeleton-dot" />
            <span className="skeleton-line flex-1" />
            <span className="skeleton-line w-10" />
          </div>
        ))}
      </div>
      <div className="font-mono text-[8px] leading-relaxed text-[var(--text-muted)]">
        FIRST INSPECTION FETCHES THIS CELL ONCE · THE BOARD REUSES THE CACHE
      </div>
    </div>
  );
}

export function RightPanel({
  data,
  view,
  fetchingCity,
  onSetView,
  onShare,
  selectedCluster,
  onSelectCluster,
  onFlyCluster,
}: {
  data: CoreData;
  view: ViewState;
  fetchingCity: boolean;
  onSetView: (patch: Partial<ViewState>) => void;
  onShare: () => void;
  selectedCluster: FireCluster | null;
  onSelectCluster: (cluster: FireCluster) => void;
  onFlyCluster: (cluster: FireCluster) => void;
}) {
  const city = cityById(data.cities, view.cityId);
  const cityUncached = city ? !hasCityRecords(data.trends, city.id) : false;
  const tabs: { id: PanelTab; label: string }[] = [
    { id: "file", label: "CITY FILE" },
    { id: "fire", label: "FIRE WATCH" },
  ];
  return (
    <aside className="right-panel glass-panel" id={view.panelTab === "file" ? "tour-city-file" : "tour-fire-watch"}>
      <div className="panel-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`panel-tab ${view.panelTab === tab.id ? "panel-tab--active" : ""}`}
            onClick={() => onSetView({ panelTab: tab.id })}
            data-testid={`tab-${tab.id}`}
          >
            {tab.id === "fire" ? <Flame size={9} className="mr-1 inline text-[var(--ember)]" /> : null}
            {tab.label}
          </button>
        ))}
        <button
          type="button"
          className="panel-tab !flex-none !px-1.5"
          onClick={() => onSetView({ cityId: null, panelTab: "file" })}
          aria-label="Close panel"
        >
          <X size={11} />
        </button>
      </div>
      {view.panelTab === "file" ? (
        city ? (
          <>
            <div className="panel-head">
              <div>
                <div className="city-title">{city.name}, {city.country}</div>
                <div className="city-sub">
                  {city.lat.toFixed(2)}°, {city.lon.toFixed(2)}° · trend cell MERRA-2 ≈ 55 × 69 km
                </div>
              </div>
            </div>
            {fetchingCity && cityUncached ? (
              <CityFileLoading city={city} />
            ) : (
              <CityFileView data={data} view={view} city={city} onSetView={onSetView} onShare={onShare} />
            )}
          </>
        ) : (
          <div className="panel-scroll flex flex-col items-center justify-center gap-3 py-16 text-center">
            <BookOpen size={24} className="text-[var(--accent-dim)]" />
            <div className="hud-title text-sm">NO CITY SELECTED</div>
            <div className="max-w-[240px] text-[12px] leading-relaxed text-[var(--text-dim)]">
              Click a city area on the globe or search for a city to open its evidence file.
            </div>
          </div>
        )
      ) : null}
      {view.panelTab === "fire" ? (
        <FireWatchPanel data={data} selected={selectedCluster} onSelect={onSelectCluster} onFly={onFlyCluster} />
      ) : null}
    </aside>
  );
}
