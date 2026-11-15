"""Build a global 7-day FIRMS snapshot for the Fire Watch layer.

Uses the public MODIS C6.1 global 7-day CSV (no MAP_KEY). Filters confidence
to nominal/high, aggregates 0.5-degree cells for the heatmap, and ranks
1-degree clusters by summed fire radiative power. Country labels come from the
local Natural Earth country polygons.
"""

from __future__ import annotations

import csv
import io
import json
import math
from collections import defaultdict
from pathlib import Path

import httpx
from shapely.geometry import Point, shape

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Global_7d.csv"
COUNTRIES = ROOT / "apps/web/public/data/ne_110m_admin_0_countries.geojson"
OUT_WEB = ROOT / "apps/web/public/data/fires.json"
OUT_CONVEX = ROOT / "convex/data/fires.jsonl"
OUT_SEED = ROOT / "data/seed/out/fires-global.json"
MAX_POINTS = 8000
MAX_CLUSTERS = 40


def load_countries():
    data = json.loads(COUNTRIES.read_text())
    countries = []
    for feature in data["features"]:
        props = feature["properties"]
        name = props.get("ADMIN") or props.get("NAME") or "Unknown"
        countries.append((name, shape(feature["geometry"])))
    return countries


def country_for(lon: float, lat: float, countries) -> str:
    point = Point(lon, lat)
    for name, geometry in countries:
        if geometry.contains(point):
            return name
    return "Ocean / offshore"


def main() -> int:
    response = httpx.get(SOURCE, timeout=120)
    response.raise_for_status()
    rows = list(csv.DictReader(io.StringIO(response.text)))
    countries = load_countries()

    filtered = []
    for row in rows:
        try:
            confidence = float(row["confidence"])
        except (TypeError, ValueError):
            confidence = 0
        if confidence < 50:
            continue
        try:
            lat = float(row["latitude"])
            lon = float(row["longitude"])
            frp = float(row["frp"] or 0)
        except (TypeError, ValueError):
            continue
        filtered.append(
            {
                "lat": lat,
                "lon": lon,
                "frp": max(0.0, frp),
                "confidence": confidence,
                "date": row["acq_date"],
            }
        )

    if not filtered:
        raise SystemExit("FIRMS returned no usable detections")

    # 0.5-degree heatmap points.
    heat: dict[tuple[int, int], dict] = {}
    for row in filtered:
        key = (math.floor(row["lat"] * 2), math.floor(row["lon"] * 2))
        cell = heat.setdefault(key, {"lat": 0.0, "lon": 0.0, "frp": 0.0, "count": 0})
        cell["lat"] += row["lat"]
        cell["lon"] += row["lon"]
        cell["frp"] += row["frp"]
        cell["count"] += 1
    heat_rows = []
    for cell in heat.values():
        count = max(1, cell["count"])
        heat_rows.append(
            [
                round(cell["lon"] / count, 4),
                round(cell["lat"] / count, 4),
                round(cell["frp"], 2),
                "nominal" if count < 3 else "high",
            ]
        )
    heat_rows.sort(key=lambda row: row[2], reverse=True)
    points = heat_rows[:MAX_POINTS]

    # 1-degree clusters.
    clusters: dict[tuple[int, int], dict] = {}
    for row in filtered:
        key = (math.floor(row["lat"]), math.floor(row["lon"]))
        cluster = clusters.setdefault(
            key,
            {
                "lat": 0.0,
                "lon": 0.0,
                "count": 0,
                "sumFrp": 0.0,
                "maxFrp": 0.0,
                "start": row["date"],
                "end": row["date"],
            },
        )
        cluster["lat"] += row["lat"]
        cluster["lon"] += row["lon"]
        cluster["count"] += 1
        cluster["sumFrp"] += row["frp"]
        cluster["maxFrp"] = max(cluster["maxFrp"], row["frp"])
        cluster["start"] = min(cluster["start"], row["date"])
        cluster["end"] = max(cluster["end"], row["date"])

    ranked = sorted(clusters.values(), key=lambda cluster: cluster["sumFrp"], reverse=True)[:MAX_CLUSTERS]
    out_clusters = []
    for index, cluster in enumerate(ranked):
        lon = cluster["lon"] / cluster["count"]
        lat = cluster["lat"] / cluster["count"]
        country = country_for(lon, lat, countries)
        out_clusters.append(
            {
                "id": f"fire-{index + 1}",
                "label": f"{abs(lat):.1f}°{'N' if lat >= 0 else 'S'} {abs(lon):.1f}°{'E' if lon >= 0 else 'W'}",
                "province": country,
                "lat": round(lat, 4),
                "lon": round(lon, 4),
                "count": cluster["count"],
                "sumFrp": round(cluster["sumFrp"], 1),
                "maxFrp": round(cluster["maxFrp"], 1),
                "start": cluster["start"],
                "end": cluster["end"],
            }
        )

    dates = [row["date"] for row in filtered]
    snapshot = {
        "start": min(dates),
        "end": max(dates),
        "source": "NASA FIRMS NRT · MODIS C6.1 global 7-day",
        "caveat": "FIRMS detects hot pixels. They can be wildfires, peat burning, land clearing, agricultural burns, or industrial flares. This is not a confirmed incident.",
    }
    payload = {"snapshot": snapshot, "points": points, "clusters": out_clusters}
    OUT_WEB.write_text(json.dumps(payload, separators=(",", ":"), allow_nan=False))
    OUT_SEED.write_text(json.dumps(payload, indent=1, allow_nan=False))

    chunks = [points[index : index + 2000] for index in range(0, len(points), 2000)]
    row = {"snapshot": snapshot, "pointChunks": chunks, "clusters": out_clusters}
    OUT_CONVEX.write_text(json.dumps(row, separators=(",", ":"), allow_nan=False) + "\n")
    print(
        f"OK: {len(filtered)} filtered detections, {len(points)} heat points, "
        f"{len(out_clusters)} clusters, {snapshot['start']}..{snapshot['end']}"
    )
    print("Top:", [(c["province"], c["count"], c["sumFrp"]) for c in out_clusters[:5]])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
