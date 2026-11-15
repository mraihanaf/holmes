import { ExternalLink, Flame, MapPin, X } from "lucide-react";
import type { CoreData } from "@/lib/api";
import type { FireCluster } from "@/lib/types";

function frp(value: number) {
  return `${Math.round(value).toLocaleString("en-US")} MW`;
}

export function FireWatchPanel({
  data,
  selected,
  onSelect,
  onFly,
}: {
  data: CoreData;
  selected: FireCluster | null;
  onSelect: (cluster: FireCluster) => void;
  onFly: (cluster: FireCluster) => void;
}) {
  const clusters = data.fires.clusters;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="panel-head">
        <div>
          <div className="city-title flex items-center gap-2"><Flame size={18} className="text-[var(--ember)]" /> Fire Watch</div>
          <div className="city-sub">
            {clusters.length} clusters · FIRMS NRT · {data.fires.snapshot.start} → {data.fires.snapshot.end}
          </div>
        </div>
        <span className="tag tag--fire">GLOBAL 7-DAY</span>
      </div>
      <div className="panel-scroll space-y-3">
        <div className="rounded border border-[rgba(255,92,58,0.24)] bg-[rgba(255,92,58,0.06)] p-3 text-[10.5px] leading-relaxed text-[var(--text-dim)]">
          FIRMS detects hot pixels. They can be wildfires, peat burning, land clearing, agricultural burns, or industrial flares. This is not a confirmed incident. Check local authorities.
        </div>
        {clusters.map((cluster) => (
          <div
            key={cluster.id}
            className={`cluster-row ${selected?.id === cluster.id ? "!border-[rgba(255,92,58,0.5)]" : ""}`}
            onClick={() => onSelect(cluster)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onSelect(cluster);
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[13px] font-medium text-[var(--text)]">{cluster.province}</div>
                <div className="mt-0.5 font-mono text-[9px] text-[var(--text-muted)]">{cluster.label} · {cluster.start} → {cluster.end}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[17px] font-bold text-[var(--ember)]">{cluster.count}</div>
                <div className="font-mono text-[8px] text-[var(--text-muted)]">DETECTIONS</div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="font-mono text-[9px] text-[var(--text-dim)]">
                {frp(cluster.sumFrp)} summed FRP · {frp(cluster.maxFrp)} max
              </div>
              <div className="flex gap-1">
                <button className="btn-hud !py-1 !text-[8px]" onClick={(event) => { event.stopPropagation(); onFly(cluster); }}>
                  <MapPin size={9} /> VIEW
                </button>
                <a
                  className="btn-hud !py-1 !text-[8px]"
                  href={`https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;@${cluster.lon},${cluster.lat},7z`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                >
                  <ExternalLink size={9} /> FIRMS
                </a>
              </div>
            </div>
          </div>
        ))}
        <div className="font-mono text-[8px] leading-relaxed text-[var(--text-muted)]">
          SOURCE NASA FIRMS NRT · MODIS C6.1 global 7-day · confidence ≥ nominal
          <br />
          Cluster rule: 0.1° cells ranked by summed fire radiative power. A single detection is not a notice.
        </div>
      </div>
    </div>
  );
}

export function FireNotice({
  data,
  onView,
  onDismiss,
}: {
  data: CoreData;
  onView: () => void;
  onDismiss: () => void;
}) {
  const cluster = data.fires.clusters[0];
  if (!cluster) return null;
  return (
    <div className="fire-notice glass-panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="hud-label flex items-center gap-1.5 text-[var(--ember)]"><Flame size={10} /> FIRE WATCH</div>
        <button className="btn-hud btn-hud--ghost !p-0.5" onClick={onDismiss} aria-label="Dismiss fire notice"><X size={10} /></button>
      </div>
      <div className="text-[13px] font-medium text-[var(--text)]">{cluster.province}</div>
      <div className="mt-1 font-mono text-[9px] text-[var(--text-dim)]">
        {cluster.count} detections · {frp(cluster.sumFrp)} · {cluster.start} → {cluster.end}
      </div>
      <div className="mt-2 text-[9.5px] leading-relaxed text-[var(--text-muted)]">
        Active-fire detections, not a confirmed wildfire.
      </div>
      <div className="mt-2 flex gap-1">
        <button className="btn-hud flex-1" onClick={onView}>VIEW CLUSTERS</button>
      </div>
    </div>
  );
}
