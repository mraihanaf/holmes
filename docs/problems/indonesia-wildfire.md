# Indonesia wildfire check — 14 November 2026

**Question:** Is there a wildfire in Indonesia recently, and where?

**Short answer:** **Yes — widespread active-fire / thermal-anomaly detections across Indonesia, not one single fire.** NASA FIRMS shows **8,881 high/nominal-confidence detections** from MODIS and VIIRS NOAA-20/21 over **10–14 November 2026**. Activity is strongest in **South Sulawesi, North Maluku, Papua, West Papua, East Kalimantan, Southeast Sulawesi, and Central Sulawesi**.

> **Caveat:** FIRMS detects hot pixels. It does not distinguish a forest wildfire from peat burning, land-clearing, or agricultural burning. Many Indonesian fires in the dry season are deliberately set for land clearing. For an official incident name, burned area, or cause, check **BNPB** and local government reports. NASA **EONET** has no open named wildfire event inside the Indonesia bounding box on this date.

## Top provinces by summed FRP

| Province | Detections | Summed FRP | Max FRP |
|---|---:|---:|---:|
| Papua | 1,900 | 15,923 | 123 |
| Southeast Sulawesi | 1,164 | 9,301 | 197 |
| East Kalimantan | 1,034 | 7,598 | 325 |
| Central Sulawesi | 617 | 4,999 | 173 |
| East Nusa Tenggara | 651 | 4,096 | 50 |
| North Maluku | 545 | 4,039 | 209 |
| South Sulawesi | 386 | 3,995 | 144 |
| Maluku | 534 | 3,334 | 58 |
| West Papua | 117 | 2,632 | 402 |
| Central Kalimantan | 206 | 2,142 | 136 |

## Strongest 0.1° clusters

| Rank | Province | Lat, Lon | Detections | Summed FRP | Dates |
|---|---|---|---:|---:|---|
| 1 | South Sulawesi | −2.6, 121.4 | 76 | 1,672 | 10–14 Nov |
| 2 | North Maluku | −1.7, 128.1 | 95 | 1,319 | 10–14 Nov |
| 3 | Papua | −8.2, 138.3 | 163 | 1,008 | 10–14 Nov |
| 4 | North Maluku | −1.6, 128.1 | 136 | 981 | 10–14 Nov |
| 5 | West Papua | −2.2, 132.4 | 24 | 889 | 10 Nov |
| 6 | East Kalimantan | −0.6, 115.9 | 5 | 768 | 12–14 Nov |
| 7 | Papua | −8.4, 141.0 | 44 | 739 | 10–12 Nov |
| 8 | Papua | −8.5, 140.6 | 18 | 667 | 10–11 Nov |
| 9 | Southeast Sulawesi | −4.7, 123.0 | 44 | 656 | 10–12 Nov |
| 10 | West Papua | −2.2, 132.3 | 11 | 620 | 10 Nov |

## 30-day context

VIIRS NOAA-20 detections peaked around **21–25 October 2026** at roughly **14,000 detections/day**, then declined. The last five days still show roughly **1,000–2,700 detections/day**, so the fire season is not over — it is lower than the late-October peak.

## Files

- Executed notebook: `docs/problems/indonesia_wildfire_exploration.ipynb`
- Filtered 5-day detections: `assets/firms/indonesia_fires_5d_filtered.csv`
- Province ranking: `assets/firms/indonesia_fires_by_province.csv`
- Top clusters: `assets/firms/indonesia_fire_clusters_top.csv`
- Maps: `assets/firms/indonesia_fire_map.png`, `assets/firms/indonesia_fire_top_cluster_zoom.png`
- 30-day chart: `assets/firms/indonesia_fire_30day_context.png`
- Interactive map: `assets/firms/indonesia_fire_map.html`

## Sources

- NASA FIRMS API: https://firms.modaps.eosdis.nasa.gov/api/
- NASA FIRMS: https://firms.modaps.eosdis.nasa.gov/
- NASA EONET: https://eonet.gsfc.nasa.gov/
- Indonesia ADM1 boundaries: https://www.geoboundaries.org/
