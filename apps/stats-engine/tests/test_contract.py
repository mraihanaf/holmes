"""HTTP contract tests for the FastAPI app."""

from __future__ import annotations

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app import methods
from app.main import app

SECRET = "test-secret-value"


def monthly_payload(
    series_id: str = "series-1",
    *,
    years: int = 20,
    slope: float = 0.5,
    noise: float = 0.1,
    seed: int = 0,
) -> dict:
    rng = np.random.default_rng(seed)
    points = [
        {
            "ts": f"{2000 + year}-{month:02d}",
            "value": float(slope * year + rng.normal(0, noise)),
        }
        for year in range(years)
        for month in range(1, 13)
    ]
    return {
        "series_id": series_id,
        "variable_key": "T2M",
        "units": "°C",
        "frequency": "monthly",
        "aggregation": "mean",
        "points": points,
    }


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.delenv("STATS_SHARED_SECRET", raising=False)
    with TestClient(app) as test_client:
        yield test_client


def test_healthz(client):
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["method_version"]


def test_analyze_allows_local_dev_when_secret_is_unset(client):
    response = client.post("/analyze", json=monthly_payload())

    assert response.status_code == 200


def test_analyze_requires_matching_secret(client, monkeypatch):
    monkeypatch.setenv("STATS_SHARED_SECRET", SECRET)
    payload = monthly_payload()

    assert client.post("/analyze", json=payload).status_code == 401
    assert (
        client.post("/analyze", json=payload, headers={"X-Stats-Secret": "wrong"}).status_code
        == 401
    )
    assert (
        client.post("/analyze", json=payload, headers={"X-Stats-Secret": SECRET}).status_code
        == 200
    )


def test_batch_requires_matching_secret(client, monkeypatch):
    monkeypatch.setenv("STATS_SHARED_SECRET", SECRET)
    payload = {"series": [monthly_payload()]}

    assert client.post("/analyze/batch", json=payload).status_code == 401
    assert (
        client.post("/analyze/batch", json=payload, headers={"X-Stats-Secret": SECRET}).status_code
        == 200
    )


def test_healthz_never_requires_the_secret(client, monkeypatch):
    monkeypatch.setenv("STATS_SHARED_SECRET", SECRET)

    assert client.get("/healthz").status_code == 200


def test_bad_secret_is_rejected_before_body_validation(client, monkeypatch):
    monkeypatch.setenv("STATS_SHARED_SECRET", SECRET)

    response = client.post(
        "/analyze",
        content=b"this is not json",
        headers={"Content-Type": "application/json", "X-Stats-Secret": "wrong"},
    )
    assert response.status_code == 401


def test_analyze_contract(client):
    payload = monthly_payload(series_id="jakarta-t2m")
    response = client.post("/analyze", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["method_version"] == "1.0.0"
    assert body["series_id"] == "jakarta-t2m"
    assert body["status"] == "ok"
    assert body["n"] == 240
    assert body["expected_n"] == 240
    assert body["completeness"] == pytest.approx(1.0)
    assert body["slope_per_decade"] > 0
    assert body["sen_slope_per_decade"] > 0
    assert body["p_value"] < 0.05
    assert body["test"] == "hamed_rao_mann_kendall"
    assert body["significant"] is True
    assert body["direction"] == "increasing"
    assert isinstance(body["verdict"], str) and body["verdict"]
    assert isinstance(body["caveats"], list) and body["caveats"]
    assert body["diagnostics"]["seasonal_adjusted"] is True
    assert body["diagnostics"]["min_n_met"] is True


@pytest.mark.parametrize(
    "payload",
    [
        {
            "variable_key": "T2M",
            "units": "°C",
            "points": [{"ts": "2000-01", "value": 1.0}],
        },
        {
            "series_id": "empty",
            "variable_key": "T2M",
            "units": "°C",
            "points": [],
        },
        {
            "series_id": "bad-frequency",
            "variable_key": "T2M",
            "units": "°C",
            "frequency": "weekly",
            "points": [{"ts": "2000-01", "value": 1.0}],
        },
    ],
)
def test_analyze_invalid_input_returns_422(client, payload):
    assert client.post("/analyze", json=payload).status_code == 422


def test_analyze_batch_contract(client):
    payload = {
        "series": [
            monthly_payload("increase", seed=1),
            monthly_payload("decrease", slope=-0.4, seed=2),
        ],
        "fdr": {"alpha": 0.05, "method": "fdr_bh"},
    }
    response = client.post("/analyze/batch", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["method_version"] == "1.0.0"
    assert [row["series_id"] for row in body["results"]] == ["increase", "decrease"]
    for row in body["results"]:
        assert row["status"] == "ok"
        assert row["p_adj"] is not None
        assert 0.0 <= row["p_adj"] <= 1.0
        assert row["significant"] is True
    assert body["results"][0]["significant_fdr"] is True
    assert body["results"][1]["significant_fdr"] is True


def test_analyze_batch_rejects_more_than_500_series(client):
    entry = {
        "series_id": "tiny",
        "variable_key": "T2M",
        "units": "°C",
        "points": [{"ts": "2000-01", "value": 1.0}],
    }
    response = client.post("/analyze/batch", json={"series": [entry] * 501})

    assert response.status_code == 422


def test_request_body_limit(client):
    response = client.post(
        "/analyze",
        content=b"x" * (10 * 1024 * 1024 + 1),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 413


def test_internal_error_returns_500(monkeypatch):
    monkeypatch.delenv("STATS_SHARED_SECRET", raising=False)

    def explode(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(methods, "analyze_points", explode)
    with TestClient(app, raise_server_exceptions=False) as failing_client:
        response = failing_client.post("/analyze", json=monthly_payload())

    assert response.status_code == 500
    assert response.json()["detail"] == "Internal stats engine error."


def test_analyze_cell_returns_all_window_season_combinations(client):
    points = monthly_payload(years=30, slope=0.2, noise=0.05)["points"]
    payload = {
        "cell_id": "c167_458",
        "series": [
            {"variable_key": "T2M", "units": "°C", "points": points},
            {"variable_key": "PRECTOTCORR", "units": "mm/day", "points": points},
        ],
        "windows": [{"id": "25y", "start": 2001, "end": 2029}],
        "seasons": ["all", "DJF"],
    }

    response = client.post("/analyze/cell", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["cell_id"] == "c167_458"
    assert body["method_version"] == "1.0.0"
    assert len(body["results"]) == 4
    assert {row["window"] for row in body["results"]} == {"25y"}
    assert {row["season"] for row in body["results"]} == {"all", "DJF"}
    assert all(row["result"]["status"] in {"ok", "insufficient_data"} for row in body["results"])
