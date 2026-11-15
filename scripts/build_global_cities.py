"""Build the global city board from Natural Earth populated places.

The output is deterministic: each city gets a stable slug, a MERRA-2 grid
cell, and a region/country label. Curated demo cities keep their existing IDs
so saved URLs and starter cases continue to work.
"""

from __future__ import annotations

import json
import math
import re
import unicodedata
from pathlib import Path

import shapefile

ROOT = Path(__file__).resolve().parents[1]
NE = ROOT / "data/seed/raw/ne/ne_10m_populated_places"
CURATED = ROOT / "data/seed/cities.json"
COUNTRIES = ROOT / "apps/web/public/data/ne_110m_admin_0_countries.geojson"
OUT = ROOT / "data/seed/global"

MERRA_LAT_STEP = 0.5
MERRA_LON_STEP = 0.625


def slugify(value: str) -> str:
    text = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "city"


def cell_for(lat: float, lon: float) -> tuple[str, float, float, int, int]:
    lat_index = math.floor((lat + 90.0) / MERRA_LAT_STEP)
    lon_index = math.floor((lon + 180.0) / MERRA_LON_STEP)
    lat_center = round(-90.0 + (lat_index + 0.5) * MERRA_LAT_STEP, 4)
    lon_center = round(-180.0 + (lon_index + 0.5) * MERRA_LON_STEP, 4)
    return f"c{lat_index}_{lon_index}", lat_center, lon_center, lat_index, lon_index


def load_country_regions() -> dict[str, str]:
    data = json.loads(COUNTRIES.read_text())
    regions: dict[str, str] = {}
    for feature in data["features"]:
        props = feature["properties"]
        region = props.get("SUBREGION") or props.get("REGION_UN") or props.get("CONTINENT") or "World"
        for key in ("ADM0_A3", "SOV_A3", "NAME", "NAME_LONG"):
            value = props.get(key)
            if value:
                regions[str(value).lower()] = region
    return regions


def unique_aliases(values: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        text = (value or "").strip()
        key = text.lower()
        if not text or key in seen:
            continue
        seen.add(key)
        out.append(text)
    return out[:6]


def main() -> int:
    regions = load_country_regions()
    reader = shapefile.Reader(str(NE))
    records = [record.as_dict() for record in reader.records()]
    curated = json.loads(CURATED.read_text())

    by_name: dict[str, list[dict]] = {}
    for record in records:
        for key in (record.get("NAME"), record.get("NAMEASCII")):
            if key:
                by_name.setdefault(slugify(key), []).append(record)

    curated_matches: dict[int, dict] = {}
    for city in curated:
        candidates = [
            record
            for record in by_name.get(slugify(city["name"]), [])
            if slugify(record.get("ADM0NAME") or "") == slugify(city["country"])
            or slugify(record.get("SOV0NAME") or "") == slugify(city["country"])
            or (
                abs(float(record.get("LATITUDE") or 0) - float(city["lat"])) < 1.0
                and abs(float(record.get("LONGITUDE") or 0) - float(city["lon"])) < 1.0
            )
        ]
        if candidates:
            best = min(
                candidates,
                key=lambda record: (
                    float(record["LATITUDE"]) - float(city["lat"])
                ) ** 2
                + (float(record["LONGITUDE"]) - float(city["lon"])) ** 2,
            )
            curated_matches[id(best)] = city

    cities: list[dict] = []
    used_ids: set[str] = set()
    cell_centers: dict[str, tuple[float, float]] = {}

    def add_city(city: dict, curated_entry: dict | None = None) -> None:
        city_id = city["id"]
        if city_id in used_ids:
            return
        used_ids.add(city_id)
        cell_id, lat_center, lon_center, _, _ = cell_for(float(city["lat"]), float(city["lon"]))
        cell_centers[cell_id] = (lat_center, lon_center)
        cities.append(
            {
                "id": city_id,
                "name": city["name"],
                "country": city["country"],
                "region": city["region"],
                "lat": round(float(city["lat"]), 5),
                "lon": round(float(city["lon"]), 5),
                "timezone": city.get("timezone") or "UTC",
                "population": int(city.get("population") or 0),
                "cellId": cell_id,
                "aliases": city.get("aliases", []),
                "curated": bool(curated_entry),
            }
        )

    for record in records:
        matched = curated_matches.get(id(record))
        if matched:
            population = int(matched.get("population") or record.get("POP_MAX") or 0)
            aliases = unique_aliases(
                [
                    matched.get("name", ""),
                    record.get("NAME") or "",
                    record.get("NAMEASCII") or "",
                    record.get("NAMEALT") or "",
                    record.get("NAME_EN") or "",
                    *(matched.get("aliases") or []),
                ]
            )
            add_city(
                {
                    "id": matched["id"],
                    "name": matched["name"],
                    "country": matched.get("country") or record.get("ADM0NAME") or "",
                    "region": regions.get(str(record.get("ADM0_A3") or "").lower(), "World"),
                    "lat": matched["lat"],
                    "lon": matched["lon"],
                    "timezone": matched.get("timezone") or record.get("TIMEZONE") or "UTC",
                    "population": population,
                    "aliases": aliases,
                },
                matched,
            )
            continue

        name = record.get("NAME") or record.get("NAMEASCII") or "Unknown"
        country_code = record.get("ISO_A2")
        if not country_code or country_code == "-99":
            country_code = record.get("ADM0_A3") or "xx"
        base = f"{slugify(name)}-{str(country_code).lower()}"
        city_id = base
        if city_id in used_ids:
            city_id = f"{base}-{record.get('GEONAMESID') or record.get('NE_ID')}"
        population = int(max(float(record.get("POP_MAX") or 0), float(record.get("POP_MIN") or 0), 0))
        add_city(
            {
                "id": city_id,
                "name": name,
                "country": record.get("ADM0NAME") or "",
                "region": regions.get(str(record.get("ADM0_A3") or "").lower(), "World"),
                "lat": record["LATITUDE"],
                "lon": record["LONGITUDE"],
                "timezone": record.get("TIMEZONE") or "UTC",
                "population": population,
                "aliases": unique_aliases(
                    [
                        record.get("NAMEASCII") or "",
                        record.get("NAMEALT") or "",
                        record.get("NAME_EN") or "",
                        record.get("NAMEPAR") or "",
                    ]
                ),
            }
        )

    for city in curated:
        if city["id"] in used_ids:
            continue
        add_city(
            {
                "id": city["id"],
                "name": city["name"],
                "country": city["country"],
                "region": city.get("region") or "World",
                "lat": city["lat"],
                "lon": city["lon"],
                "timezone": city.get("timezone") or "UTC",
                "population": int(city.get("population") or 0),
                "aliases": unique_aliases([city["name"], *(city.get("aliases") or [])]),
            },
            city,
        )

    cities.sort(key=lambda city: (-city["population"], city["name"].lower()))
    for rank, city in enumerate(cities, start=1):
        city["anchorRank"] = rank

    cells = [
        {"id": cell_id, "lat": lat, "lon": lon}
        for cell_id, (lat, lon) in sorted(cell_centers.items())
    ]
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "cities.json").write_text(json.dumps(cities, separators=(",", ":")))
    (OUT / "cells.json").write_text(json.dumps(cells, separators=(",", ":")))
    (OUT / "meta.json").write_text(
        json.dumps(
            {
                "cityCount": len(cities),
                "cellCount": len(cells),
                "curatedCount": sum(1 for city in cities if city["curated"]),
                "source": "Natural Earth 10m populated places; curated demo overrides",
            },
            indent=2,
        )
    )
    print(f"OK: {len(cities)} cities in {len(cells)} MERRA-2 cells")
    print(f"curated: {sum(1 for city in cities if city['curated'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
