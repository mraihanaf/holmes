"""HTTP surface for the Holmes stats engine.

The service is stateless: it validates one request, computes one result, and
returns it. Authentication and the request-size cap are enforced in ASGI
middleware so a bad secret is rejected before the JSON body is parsed.
"""

from __future__ import annotations

import hmac
import logging
import os
from typing import Any

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.datastructures import Headers
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from . import methods
from .config import METHOD_VERSION
from .models import (
    AnalyzeRequest,
    BatchRequest,
    BatchResponse,
    CellAnalyzeRequest,
    CellAnalyzeResponse,
    CellResultEntry,
    TrendResult,
)

logger = logging.getLogger("holmes.stats")

MAX_BODY_BYTES = 10 * 1024 * 1024
SECRET_ENV = "STATS_SHARED_SECRET"
SECRET_HEADER = "x-stats-secret"
PROTECTED_PATHS = frozenset({"/analyze", "/analyze/batch", "/analyze/cell"})


class _BodyTooLarge(Exception):
    pass


async def _send_json(
    scope: Scope, receive: Receive, send: Send, status_code: int, detail: str
) -> None:
    response = JSONResponse({"detail": detail}, status_code=status_code)
    await response(scope, receive, send)


class StatsGuardMiddleware:
    """Enforce the shared secret and the 10 MB body cap for every request."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = Headers(scope=scope)
        path = scope.get("path", "")

        if path in PROTECTED_PATHS:
            expected = os.environ.get(SECRET_ENV, "")
            supplied = headers.get(SECRET_HEADER, "")
            if expected and not hmac.compare_digest(
                supplied.encode("utf-8"), expected.encode("utf-8")
            ):
                await _send_json(
                    scope,
                    receive,
                    send,
                    401,
                    "Invalid or missing X-Stats-Secret header.",
                )
                return

        content_length = headers.get("content-length")
        if content_length is not None:
            try:
                declared_length = int(content_length)
            except ValueError:
                await _send_json(scope, receive, send, 400, "Invalid Content-Length header.")
                return
            if declared_length > MAX_BODY_BYTES:
                await _send_json(scope, receive, send, 413, "Request body exceeds 10 MB.")
                return

        received = 0
        response_started = False

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > MAX_BODY_BYTES:
                    raise _BodyTooLarge
            return message

        async def tracked_send(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, limited_receive, tracked_send)
        except _BodyTooLarge:
            if not response_started:
                await _send_json(scope, receive, send, 413, "Request body exceeds 10 MB.")


app = FastAPI(title="Holmes stats engine", version=METHOD_VERSION)
app.add_middleware(StatsGuardMiddleware)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Any, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled stats engine error", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "Internal stats engine error."})


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "method_version": METHOD_VERSION}


@app.post("/analyze", response_model=TrendResult)
def analyze(request: AnalyzeRequest) -> TrendResult:
    result = methods.analyze_points(
        request.points,
        variable_key=request.variable_key,
        units=request.units,
        frequency=request.frequency,
        options=request.options,
    )
    result.series_id = request.series_id
    return result


@app.post("/analyze/batch", response_model=BatchResponse)
def analyze_batch(request: BatchRequest) -> BatchResponse:
    return methods.batch_fdr(request.series)


@app.post("/analyze/cell", response_model=CellAnalyzeResponse)
def analyze_cell(request: CellAnalyzeRequest) -> CellAnalyzeResponse:
    """Analyze every variable x window x season combination for one cell.

    The caller (Convex) sends one monthly series per variable. This keeps the
    expensive statistical work in one round trip instead of 200 HTTP calls.
    """
    results: list[CellResultEntry] = []
    for series in request.series:
        for window in request.windows:
            points = [
                point for point in series.points if window.start <= int(point.ts[:4]) <= window.end
            ]
            if not points:
                continue
            for season in request.seasons:
                options = request.options.model_copy(update={"season": season})
                result = methods.analyze_points(
                    points,
                    variable_key=series.variable_key,
                    units=series.units,
                    frequency="monthly",
                    options=options,
                )
                results.append(
                    CellResultEntry(
                        variable_key=series.variable_key,
                        window=window.id,
                        season=season,
                        result=result,
                    )
                )
    return CellAnalyzeResponse(
        method_version=METHOD_VERSION,
        cell_id=request.cell_id,
        results=results,
    )
