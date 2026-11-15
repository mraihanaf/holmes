import type { CoreData } from "@/lib/api";
import type { ViewState } from "@/lib/types";
import { compositeForCity, digitsFor, getRecord, modeFor, percentile, slopeUnit } from "@/lib/trends";

function CityAreaNote() {
  return (
    <div className="text-[8px] leading-relaxed text-[var(--text-muted)]">
      Shape = a low-vertex showcase outline for a few curated cities, otherwise a screen-space circle. The trend is measured for the MERRA-2 cell. Click a shape to inspect it.
    </div>
  );
}

export function Legend({ data, view }: { data: CoreData; view: ViewState }) {
  const primary = view.variableKeys[0] ?? "T2M";
  const variable = data.variables.find((item) => item.key === primary);
  const digits = digitsFor(variable);
  const combined = modeFor(view.variableKeys) === "combined";

  let domain = 1;
  if (view.lens === "effect") {
    const values: number[] = [];
    for (const city of data.cities) {
      if (combined) {
        const composite = compositeForCity(data.trends, city.id, view.variableKeys, view.windowId, view.season);
        if (composite.z !== null) values.push(Math.abs(composite.z));
      } else {
        const record = getRecord(data.trends, city.id, primary, view.windowId, view.season);
        if (record?.slope !== null && record?.slope !== undefined) values.push(Math.abs(record.slope));
      }
    }
    domain = Math.max(percentile(values, 92), 1e-6);
  }

  if (view.lens === "evidence") {
    return (
      <div className="rail-section">
        <div className="hud-label">EVIDENCE AFTER FDR</div>
        <div className="legend-bar" style={{ background: "linear-gradient(90deg,#42586b,#6fe7ff,#eaffff)" }} />
        <div className="legend-ticks"><span>WEAK</span><span>MODERATE</span><span>STRONG</span></div>
        <div className="flex items-center gap-3 pt-1 font-mono text-[8px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 border border-[#f5b84b]" /> RISING</span>
          <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 border border-[#5aa9ff]" /> FALLING</span>
          <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 border border-[#8fa6b2]" /> MIXED</span>
        </div>
        <div className="text-[9px] leading-relaxed text-[var(--text-muted)]">
          Statistical evidence strength, not the probability that the trend is true.
        </div>
        <CityAreaNote />
      </div>
    );
  }

  if (view.lens === "agreement") {
    return (
      <div className="rail-section">
        <div className="hud-label">VARIABLE AGREEMENT</div>
        <div className="legend-bar" style={{ background: "linear-gradient(90deg,#1b2c3d,#3a76b0,#6fe7ff)" }} />
        <div className="legend-ticks"><span>DISAGREE</span><span>0.67</span><span>AGREE</span></div>
        <div className="text-[9px] leading-relaxed text-[var(--text-muted)]">
          A grey outline means the selected variables move in different directions.
        </div>
        <CityAreaNote />
      </div>
    );
  }

  if (view.lens === "coverage") {
    return (
      <div className="rail-section">
        <div className="hud-label">RECORD COVERAGE</div>
        <div className="legend-bar" style={{ background: "linear-gradient(90deg,#1b2c3d,#6d8296,#eaffff)" }} />
        <div className="legend-ticks"><span>0%</span><span>50%</span><span>100%</span></div>
        <div className="text-[9px] leading-relaxed text-[var(--text-muted)]">
          A faint area means insufficient data, not weak evidence.
        </div>
        <CityAreaNote />
      </div>
    );
  }

  return (
    <div className="rail-section">
      <div className="flex items-baseline justify-between gap-2">
        <div className="hud-label">{combined ? "COMBINED SIGNAL" : `${variable?.label.toUpperCase() ?? primary} TREND`}</div>
        <div className="font-mono text-[8px] text-[var(--text-muted)]">{combined ? "σ/decade" : slopeUnit(variable)}</div>
      </div>
      <div className="legend-bar" style={{ background: "linear-gradient(90deg,#5aa9ff,#8fa6b2,#f5b84b)" }} />
      <div className="legend-ticks">
        <span>{combined ? `−${domain.toFixed(2)}` : `−${domain.toFixed(digits)}`}</span>
        <span>0</span>
        <span>{combined ? `+${domain.toFixed(2)}` : `+${domain.toFixed(digits)}`}</span>
      </div>
      <div className="flex items-center justify-between font-mono text-[8px] text-[var(--text-muted)]">
        <span>DECREASING ◀</span><span>▶ INCREASING</span>
      </div>
      <div className="flex items-center gap-3 pt-1 font-mono text-[8px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 border border-[#e2eefb]" /> SIGNIFICANT</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 border border-[#6d8296]" /> NOT SIG.</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 border border-dashed border-[#42586b]" /> INSUFFICIENT</span>
      </div>
      <CityAreaNote />
    </div>
  );
}
