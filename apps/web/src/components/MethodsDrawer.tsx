import { X } from "lucide-react";
import type { CoreData } from "@/lib/api";

export function MethodsDrawer({ data, onClose }: { data: CoreData; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card glass-panel p-5" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="hud-title text-base">METHODS + LIMITATIONS</div>
            <div className="hud-label mt-1">METHOD {data.trends.methodVersion} · NASA POWER / MERRA-2 · LAZY CELL CACHE</div>
          </div>
          <button className="btn-hud" onClick={onClose} aria-label="Close methods"><X size={13} /></button>
        </div>
        <div className="space-y-5 text-[12px] leading-relaxed text-[var(--text-dim)]">
          <section>
            <div className="hud-label mb-1 text-[var(--accent)]">THE FIVE STEPS</div>
            <p>Holmes follows the challenge: choose a variable, choose a region, acquire the series, visualize it, and test whether the trend is statistically significant. The globe is the answer surface; the city file is the evidence.</p>
          </section>
          <section>
            <div className="hud-label mb-1 text-[var(--accent)]">TREND METHODS</div>
            <ul className="list-disc space-y-1 pl-4">
              <li><b className="text-[var(--text)]">Seasonal Sen slope</b> — median pairwise slope per calendar month, reported per decade. Robust to outliers.</li>
              <li><b className="text-[var(--text)]">Hamed–Rao Mann–Kendall</b> — non-parametric monotonic trend test after removing the seasonal cycle; corrected for autocorrelation where the implementation supports it.</li>
              <li><b className="text-[var(--text)]">OLS with HAC errors</b> — Newey–West standard errors (12 lags) as an independent cross-check.</li>
              <li><b className="text-[var(--text)]">Benjamini–Hochberg FDR</b> — q-values across the cells currently cached for each board, and across variables for each city.</li>
              <li><b className="text-[var(--text)]">Method-dependent</b> — when Seasonal MK and OLS HAC disagree at the 5% level, the conservative verdict leads and the badge says so.</li>
            </ul>
          </section>
          <section>
            <div className="hud-label mb-1 text-[var(--accent)]">EVIDENCE LEVELS</div>
            <div className="grid gap-1 font-mono text-[10px] sm:grid-cols-2">
              <div><span className="tag tag--ok">STRONG</span> q &lt; 0.01 and at least 20 years</div>
              <div><span className="tag tag--info">MODERATE</span> q &lt; 0.05</div>
              <div><span className="tag tag--muted">WEAK</span> q ≥ 0.05 with at least 10 years</div>
              <div><span className="tag tag--muted">INSUFFICIENT</span> fewer than 10 years or too many gaps</div>
            </div>
            <p className="mt-2">Strong / moderate / weak are explicit rules, not a hidden score. A method-dependent result cannot be STRONG.</p>
          </section>
          <section>
            <div className="hud-label mb-1 text-[var(--accent)]">WHAT NOT TO READ INTO THIS</div>
            <ul className="list-disc space-y-1 pl-4">
              <li>Cells are fetched lazily when a city is inspected. q-values on the global board are adjusted across the cells currently cached, not a completed global scan.</li>
              <li>The trend is computed for the MERRA-2 grid cell (about 55 × 69 km) that contains the city point. The colored map shape is a low-vertex showcase outline for a few curated cities, otherwise a circle marker. It is display geometry, not the trend&apos;s measurement unit.</li>
              <li>A trend is a statistical association, not a causal attribution. Holmes does not forecast.</li>
              <li>A p-value is not the probability that a trend is true. The Evidence Lens shows statistical evidence strength.</li>
              <li>Multiple variables and cities were tested; q-values are FDR-adjusted. A short window is noisier.</li>
              <li>Satellite imagery is visual context, not a trend test. Clouds and seasons can mislead.</li>
              <li>FIRMS hot pixels can be wildfires, peat burning, land clearing, agricultural burns, or industrial flares. They are not confirmed incidents.</li>
              <li>The demo uses a cached snapshot. It does not call live data sources on stage.</li>
            </ul>
          </section>
          <section>
            <div className="hud-label mb-1 text-[var(--accent)]">SOURCES + ATTRIBUTION</div>
            <p>NASA POWER monthly point API (MERRA-2, CERES SYN1deg) · NASA FIRMS NRT (MODIS/VIIRS 5-day Indonesia snapshot) · NASA GIBS (MODIS Terra true/false color). City areas: Natural Earth 10m urban areas (public domain); Indonesian city boundaries: GeoBoundaries / BPS–UNOCHA (CC BY 3.0 IGO). Basemap: CARTO Dark Matter; map: MapLibre GL; OSM attribution is displayed on the map. Osiris HUD is an MIT-licensed design reference.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
