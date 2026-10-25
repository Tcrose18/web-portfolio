#!/usr/bin/env python3
"""Local server for NYSE Factor Radar.

The /api/quotes endpoint tries Yahoo Finance first, then falls back to
live-shaped demo ticks if Yahoo is unavailable. Yahoo data is typically
delayed and unofficial for this use case; connect a licensed feed for true
real-time NYSE data.
"""

from __future__ import annotations

import json
import math
import re
import ssl
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SNAPSHOT = ROOT / "real-data.js"
QUOTE_TTL_SECONDS = 60
YAHOO_WORKERS = 24
YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart"
USER_AGENT = "Mozilla/5.0 NYSE-Factor-Radar/1.0"


def load_universe() -> list[dict]:
    text = SNAPSHOT.read_text()
    match = re.search(r"export const UNIVERSE = (\[.*?\]);", text, re.S)
    if not match:
        return []
    return json.loads(match.group(1))


UNIVERSE = load_universe()
QUOTE_CACHE: dict = {"payload": None, "expires_at": 0}


def demo_quote_payload() -> dict:
    now = time.time()
    quotes = []
    for index, stock in enumerate(UNIVERSE):
        base = stock.get("price") or 10
        wave = math.sin(now / 18 + index * 0.37) * 0.85
        pulse = math.cos(now / 7 + index * 0.13) * 0.28
        change_pct = wave + pulse
        quotes.append({
            "t": stock["t"],
            "price": round(base * (1 + change_pct / 100), 2),
            "changePct": round(change_pct, 3),
        })
    return {
        "mode": "demo",
        "source": "Local demo feed",
        "asOf": datetime.now(timezone.utc).isoformat(),
        "quotes": quotes,
    }


def yahoo_chart_quote(stock: dict) -> dict | None:
    symbol = stock["t"]
    query = urllib.parse.urlencode({"range": "1d", "interval": "1m"})
    request = urllib.request.Request(
        f"{YAHOO_URL}/{urllib.parse.quote(symbol)}?{query}",
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            data = json.loads(response.read().decode())
    except urllib.error.URLError as error:
        if "CERTIFICATE_VERIFY_FAILED" not in str(error):
            raise
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(request, timeout=5, context=context) as response:
            data = json.loads(response.read().decode())
    result = (data.get("chart", {}).get("result") or [None])[0]
    if not result:
        return None
    meta = result.get("meta", {})
    price = meta.get("regularMarketPrice")
    previous = meta.get("chartPreviousClose") or meta.get("previousClose")
    if price is None:
        closes = result.get("indicators", {}).get("quote", [{}])[0].get("close") or []
        valid = [value for value in closes if value is not None]
        price = valid[-1] if valid else None
    if price is None:
        return None
    if not previous:
        previous = stock.get("price") or price
    change_pct = ((float(price) - float(previous)) / float(previous) * 100) if previous else 0
    return {
        "t": symbol,
        "price": round(float(price), 2),
        "changePct": round(change_pct, 3),
    }


def yahoo_quote_payload() -> dict:
    quotes = []
    with ThreadPoolExecutor(max_workers=YAHOO_WORKERS) as executor:
        futures = [executor.submit(yahoo_chart_quote, stock) for stock in UNIVERSE]
        for future in as_completed(futures):
            try:
                quote = future.result()
            except Exception:
                quote = None
            if quote:
                quotes.append(quote)
    if len(quotes) < 25:
        raise RuntimeError("Yahoo returned too few usable chart quotes")
    return {
        "mode": "yahoo",
        "source": "Yahoo Finance" if len(quotes) == len(UNIVERSE) else "Yahoo Finance partial",
        "asOf": datetime.now(timezone.utc).isoformat(),
        "quotes": quotes,
    }


def quote_payload() -> dict:
    now = time.time()
    if QUOTE_CACHE["payload"] and QUOTE_CACHE["expires_at"] > now:
        return QUOTE_CACHE["payload"]
    try:
        payload = yahoo_quote_payload()
    except Exception as error:
        payload = demo_quote_payload()
        payload["message"] = f"Yahoo unavailable; using demo ticks ({error})"
    QUOTE_CACHE["payload"] = payload
    QUOTE_CACHE["expires_at"] = now + QUOTE_TTL_SECONDS
    return payload


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/quotes":
            body = json.dumps(quote_payload()).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 5173), Handler)
    print("NYSE Factor Radar running at http://127.0.0.1:5173")
    server.serve_forever()
