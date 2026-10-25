const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const QUOTE_TTL_MS = 60_000;
const YAHOO_WORKERS = 24;
const FINNHUB_BATCH_SIZE = 25;
const FINNHUB_BATCH_DELAY_MS = 1100;

let quoteCache = { payload: null, expiresAt: 0 };

function loadUniverse() {
  const text = fs.readFileSync(path.join(ROOT, 'real-data.js'), 'utf8');
  const match = text.match(/export const UNIVERSE = (\[.*?\]);/s);
  return match ? JSON.parse(match[1]) : [];
}

const universe = loadUniverse();

function demoQuotePayload(message) {
  const now = Date.now() / 1000;
  return {
    mode: 'demo',
    source: 'Local demo feed',
    asOf: new Date().toISOString(),
    message,
    quotes: universe.map((stock, index) => {
      const base = Number.isFinite(stock.price) ? stock.price : 10;
      const wave = Math.sin(now / 18 + index * 0.37) * 0.85;
      const pulse = Math.cos(now / 7 + index * 0.13) * 0.28;
      const changePct = wave + pulse;
      return {
        t: stock.t,
        price: Number((base * (1 + changePct / 100)).toFixed(2)),
        changePct: Number(changePct.toFixed(3)),
      };
    }),
  };
}

async function yahooChartQuote(stock) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(stock.t)}?range=1d&interval=1m`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 NYSE-Factor-Radar/1.0',
    },
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) return null;

  const data = await response.json();
  const result = data.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta || {};
  const closes = result.indicators?.quote?.[0]?.close || [];
  const validCloses = closes.filter(value => value != null);
  const price = meta.regularMarketPrice ?? validCloses.at(-1);
  const previous = meta.chartPreviousClose ?? meta.previousClose ?? stock.price ?? price;
  if (price == null || previous == null || previous === 0) return null;

  return {
    t: stock.t,
    price: Number(Number(price).toFixed(2)),
    changePct: Number((((Number(price) - Number(previous)) / Number(previous)) * 100).toFixed(3)),
  };
}

async function finnhubQuote(stock, token) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(stock.t)}`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X-Finnhub-Token': token,
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;

  const data = await response.json();
  const price = Number(data.c);
  const previous = Number(data.pc);
  const changePct = Number.isFinite(Number(data.dp))
    ? Number(data.dp)
    : (Number.isFinite(price) && Number.isFinite(previous) && previous !== 0
      ? ((price - previous) / previous) * 100
      : null);

  if (!Number.isFinite(price) || !Number.isFinite(changePct)) return null;

  return {
    t: stock.t,
    price: Number(price.toFixed(2)),
    changePct: Number(changePct.toFixed(3)),
  };
}

async function mapWithConcurrency(items, limit, worker) {
  const results = [];
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        const value = await worker(items[index]);
        if (value) results.push(value);
      } catch {
        // Ignore single-symbol failures.
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, run));
  return results;
}

async function yahooQuotePayload() {
  const quotes = await mapWithConcurrency(universe, YAHOO_WORKERS, yahooChartQuote);
  if (quotes.length < 25) {
    throw new Error('Yahoo returned too few usable chart quotes');
  }
  return {
    mode: 'yahoo',
    source: quotes.length === universe.length ? 'Yahoo Finance' : 'Yahoo Finance partial',
    asOf: new Date().toISOString(),
    quotes,
  };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function finnhubQuotePayload() {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) {
    throw new Error('FINNHUB_API_KEY is not set');
  }

  const quotes = [];
  for (let start = 0; start < universe.length; start += FINNHUB_BATCH_SIZE) {
    const batch = universe.slice(start, start + FINNHUB_BATCH_SIZE);
    const results = await Promise.all(batch.map(stock => (
      finnhubQuote(stock, token).catch(() => null)
    )));
    quotes.push(...results.filter(Boolean));
    if (start + FINNHUB_BATCH_SIZE < universe.length) {
      await delay(FINNHUB_BATCH_DELAY_MS);
    }
  }

  if (quotes.length < 25) {
    throw new Error('Finnhub returned too few usable quotes');
  }

  return {
    mode: 'finnhub',
    source: quotes.length === universe.length ? 'Finnhub' : 'Finnhub partial',
    asOf: new Date().toISOString(),
    quotes,
  };
}

async function quotePayload() {
  const now = Date.now();
  if (quoteCache.payload && quoteCache.expiresAt > now) {
    return quoteCache.payload;
  }

  let payload;
  try {
    payload = process.env.FINNHUB_API_KEY
      ? await finnhubQuotePayload()
      : await yahooQuotePayload();
  } catch (primaryError) {
    try {
      payload = await yahooQuotePayload();
      payload.message = `Primary provider unavailable; using Yahoo fallback (${primaryError.message})`;
    } catch (fallbackError) {
      payload = demoQuotePayload(`Market data unavailable; using demo ticks (${primaryError.message}; ${fallbackError.message})`);
    }
  }

  quoteCache = { payload, expiresAt: now + QUOTE_TTL_MS };
  return payload;
}

module.exports = { quotePayload };
