"""Build the small curated cell seed for Convex.

Only the 121 existing demo cities are precomputed. Every other city is filled
lazily by the `stats:ensureCity` action.
"""

from __future__ import annotations

import base64
import gzip
import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CITIES = json.loads((ROOT / "data/seed/global/cities.json").read_text())
CELLS = {cell["id"]: cell for cell in json.loads((ROOT / "data/seed/global/cells.json").read_text())}
VARIABLES = json.loads((ROOT / "data/seed/variables.json").read_text())
TRENDS = json.loads((ROOT / "data/seed/out/city-trends.json").read_text())["cities"]
SERIES = json.loads((ROOT / "data/seed/out/series.json").read_text())["cities"]
OUT = ROOT / "convex/data"
DIRECTION = {"decreasing": -1, "none": 0, "increasing": 1}


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    curated = [city for city in CITIES if city.get("curated") and city["id"] in TRENDS]
    curated.sort(key=lambda city: -city["population"])
    seen: set[str] = set()
    rows = []
    for city in curated:
        cell_id = city["cellId"]
        if cell_id in seen:
            continue
        seen.add(cell_id)
        records = TRENDS[city["id"]]
        series = SERIES.get(city["id"])
        if not series:
            continue
        board = {}
        p_values = {}
        for variable, combos in records.items():
            board[variable] = {}
            p_values[variable] = {}
            for key, record in combos.items():
                board[variable][key] = [
                    record.get("slope"),
                    record.get("z"),
                    record.get("nYears"),
                    record.get("coverage"),
                    DIRECTION.get(record.get("direction", "none"), 0),
                    1 if record.get("methodDependent") else 0,
                ]
                p_values[variable][key] = record.get("p")
        series_json = json.dumps(series, separators=(",", ":"), allow_nan=False).encode()
        rows.append(
            {
                "cellId": cell_id,
                "lat": CELLS[cell_id]["lat"],
                "lon": CELLS[cell_id]["lon"],
                "records": records,
                "seriesGz": base64.b64encode(gzip.compress(series_json, 9)).decode(),
                "board": board,
                "pValues": p_values,
                "status": "ready",
                "methodVersion": "1.0.0",
                "fetchedAt": int(time.time() * 1000),
                "source": "curated-seed",
            }
        )
    with (OUT / "seed-cells.jsonl").open("w") as handle:
        for row in rows:
            handle.write(json.dumps(row, separators=(",", ":"), allow_nan=False) + "\n")
    with (OUT / "seed-cell-boards.jsonl").open("w") as handle:
        for row in rows:
            compact = {
                "cellId": row["cellId"],
                "board": row["board"],
                "pValues": row["pValues"],
                "status": row["status"],
                "methodVersion": row["methodVersion"],
                "fetchedAt": row["fetchedAt"],
            }
            handle.write(json.dumps(compact, separators=(",", ":"), allow_nan=False) + "\n")
    with (OUT / "cities.jsonl").open("w") as handle:
        for city in CITIES:
            handle.write(json.dumps(city, separators=(",", ":"), allow_nan=False) + "\n")
    with (OUT / "variables.jsonl").open("w") as handle:
        for variable in VARIABLES:
            handle.write(json.dumps(variable, separators=(",", ":"), allow_nan=False) + "\n")
    print(f"OK: {len(rows)} seed cells, {len(CITIES)} cities, {len(VARIABLES)} variables")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
