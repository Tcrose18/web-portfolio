import { UNIVERSE, AS_OF, SOURCE } from './real-data.js';

const FACTORS = [
  { key: 'value', label: 'Value', raw: s => -(safeLog(s.pe, 4) + safeLog(s.pb, .15)) },
  { key: 'momentum', label: 'Momentum', raw: s => number(s.mom) },
  { key: 'quality', label: 'Quality', raw: s => number(s.roe) },
  { key: 'lowVol', label: 'Low Volatility', raw: s => -number(s.vol) },
  { key: 'growth', label: 'Growth', raw: s => number(s.grw) },
  { key: 'yield', label: 'Dividend Yield', raw: s => number(s.dy) },
  { key: 'size', label: 'Size', raw: s => safeLog(s.mc, .01) },
];

const MODELS = {
  balanced: {
    label: 'Balanced Multi-Factor',
    family: 'Core',
    desc: 'Average of all standardized factor scores for a broad diversified ranking.',
    formula: 'Equal-weight z-score composite.',
    weights: { value: 50, momentum: 50, quality: 50, lowVol: 50, growth: 50, yield: 50, size: 50 },
  },
  famaFrench3: {
    label: 'Fama-French 3-Factor Style',
    family: 'Academic',
    desc: 'Classic value and size ranking with profitability used as a secondary confirmation signal.',
    formula: 'Value + size + profitability proxy.',
    weights: { value: 90, momentum: 0, quality: 45, lowVol: 0, growth: 0, yield: 15, size: 85 },
  },
  carhart4: {
    label: 'Carhart 4-Factor Style',
    family: 'Academic',
    desc: 'Starts with value and size, then adds a standalone momentum sleeve.',
    formula: 'Fama-French style score plus momentum.',
    weights: { value: 75, momentum: 95, quality: 35, lowVol: 0, growth: 0, yield: 10, size: 65 },
  },
  famaFrench5: {
    label: 'Fama-French 5-Factor Style',
    family: 'Academic',
    desc: 'Combines value, size, profitability, and growth while penalizing unstable names.',
    formula: 'Four core factors minus a volatility drag.',
    weights: { value: 75, momentum: 10, quality: 85, lowVol: 10, growth: 65, yield: 10, size: 70 },
  },
  qmj: {
    label: 'Quality Minus Junk',
    family: 'Quality',
    desc: 'Rewards quality and stability, then applies a penalty to names with weak value support.',
    formula: 'Quality/stability score with junk penalty.',
    weights: { value: 15, momentum: 15, quality: 100, lowVol: 70, growth: 55, yield: 10, size: 35 },
  },
  valueMomentum: {
    label: 'Value + Momentum',
    family: 'Blend',
    desc: 'Requires both value and momentum to be strong rather than letting one fully offset the other.',
    formula: 'Value-momentum interaction plus quality guardrail.',
    weights: { value: 95, momentum: 95, quality: 25, lowVol: 10, growth: 15, yield: 20, size: 10 },
  },
  garp: {
    label: 'GARP',
    family: 'Growth',
    desc: 'Growth at a reasonable price: strong growth must be supported by quality and reasonable valuation.',
    formula: 'Growth and quality, gated by value.',
    weights: { value: 55, momentum: 45, quality: 75, lowVol: 15, growth: 95, yield: 0, size: 15 },
  },
  pureGrowth: {
    label: 'Aggressive Growth',
    family: 'Growth',
    desc: 'Ranks high-growth stocks, but cuts the score for weak momentum or very high volatility.',
    formula: 'Growth engine with momentum confirmation and volatility penalty.',
    weights: { value: 5, momentum: 75, quality: 50, lowVol: 0, growth: 100, yield: 0, size: 25 },
  },
  deepValue: {
    label: 'Deep Value',
    family: 'Value',
    desc: 'Screens for cheap stocks and income, then penalizes low quality and negative price trend.',
    formula: 'Value/yield score with quality and momentum traps.',
    weights: { value: 100, momentum: 5, quality: 40, lowVol: 25, growth: 5, yield: 65, size: 25 },
  },
  dividendIncome: {
    label: 'Dividend Income',
    family: 'Income',
    desc: 'Prioritizes dividend yield, then discounts unstable or low-quality yield traps.',
    formula: 'Yield score adjusted by quality and volatility.',
    weights: { value: 50, momentum: 5, quality: 65, lowVol: 70, growth: 5, yield: 100, size: 70 },
  },
  minimumVolatility: {
    label: 'Minimum Volatility',
    family: 'Defensive',
    desc: 'Focuses on stability first and penalizes high volatility regardless of other strengths.',
    formula: 'Low-volatility core with quality and income support.',
    weights: { value: 25, momentum: 0, quality: 60, lowVol: 100, growth: 5, yield: 55, size: 75 },
  },
  highMomentum: {
    label: 'Momentum Breakout',
    family: 'Trend',
    desc: 'Uses momentum as the engine, then penalizes expensive or low-quality trend names.',
    formula: 'Trend score with quality and valuation checks.',
    weights: { value: 0, momentum: 100, quality: 30, lowVol: 0, growth: 55, yield: 0, size: 20 },
  },
  largeCapQuality: {
    label: 'Large-Cap Quality',
    family: 'Core',
    desc: 'Targets profitable large companies while applying a stability bonus.',
    formula: 'Large-cap quality score with low-volatility bonus.',
    weights: { value: 35, momentum: 25, quality: 90, lowVol: 60, growth: 35, yield: 25, size: 100 },
  },
  smallCapOpportunity: {
    label: 'Small-Cap Opportunity',
    family: 'Opportunistic',
    desc: 'Inverts the size factor to surface smaller names, then requires value, momentum, or growth support.',
    formula: 'Small-cap tilt plus opportunity composite.',
    weights: { value: 70, momentum: 75, quality: 35, lowVol: 10, growth: 55, yield: 15, size: 0 },
  },
};

const state = {
  activeModel: 'balanced',
  weights: { ...MODELS.balanced.weights },
  query: '',
  sector: 'all',
  sort: 'score',
  feedMode: 'snapshot',
  feedSource: SOURCE,
  quotes: new Map(),
  scored: [],
  visible: [],
};

const $ = selector => document.querySelector(selector);
const formatMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const formatCompact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const formatNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const APP_CONFIG = window.NYSE_FACTOR_RADAR_CONFIG || {};

function apiUrl(path) {
  const base = (APP_CONFIG.apiBase || '').replace(/\/$/, '');
  return `${base}${path}`;
}

function number(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function safeLog(value, floor) {
  return Math.log(Math.max(floor, number(value, floor)));
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function zScore(values) {
  const clean = values.map(v => Number.isFinite(v) ? v : median(values));
  const sorted = [...clean].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * .05)];
  const hi = sorted[Math.floor(sorted.length * .95)];
  const clipped = clean.map(v => Math.min(hi, Math.max(lo, v)));
  const mean = clipped.reduce((a, b) => a + b, 0) / clipped.length;
  const variance = clipped.reduce((sum, v) => sum + (v - mean) ** 2, 0) / clipped.length;
  const sd = Math.sqrt(variance) || 1;
  return clean.map(v => (Math.min(hi, Math.max(lo, v)) - mean) / sd);
}

function weightedComposite(stock, weights = state.weights) {
  const weightTotal = FACTORS.reduce((sum, factor) => sum + weights[factor.key], 0) || 1;
  return FACTORS.reduce((sum, factor) => sum + stock.z[factor.key] * weights[factor.key], 0) / weightTotal;
}

function positive(value) {
  return Math.max(0, value);
}

function negative(value) {
  return Math.min(0, value);
}

function bothRequired(a, b) {
  return Math.sign(a) === Math.sign(b)
    ? Math.sign(a) * Math.sqrt(Math.abs(a * b))
    : Math.min(a, b) * 0.7;
}

function modelScore(stock) {
  const z = stock.z;
  switch (state.activeModel) {
    case 'balanced':
      return FACTORS.reduce((sum, factor) => sum + z[factor.key], 0) / FACTORS.length;
    case 'famaFrench3':
      return 0.48 * z.value + 0.36 * z.size + 0.16 * z.quality;
    case 'carhart4':
      return 0.34 * z.value + 0.24 * z.size + 0.32 * z.momentum + 0.10 * z.quality;
    case 'famaFrench5':
      return 0.28 * z.value + 0.23 * z.size + 0.25 * z.quality + 0.18 * z.growth + 0.06 * z.lowVol;
    case 'qmj':
      return 0.52 * z.quality + 0.28 * z.lowVol + 0.16 * z.growth + 0.12 * positive(z.value) + 0.22 * negative(z.value);
    case 'valueMomentum':
      return 0.58 * bothRequired(z.value, z.momentum) + 0.22 * z.quality + 0.12 * z.lowVol + 0.08 * z.growth;
    case 'garp':
      return 0.36 * z.growth + 0.28 * z.quality + 0.26 * bothRequired(z.growth, z.value) + 0.10 * z.momentum;
    case 'pureGrowth':
      return 0.48 * z.growth + 0.26 * positive(z.momentum) + 0.18 * z.quality - 0.22 * Math.max(0, -z.momentum) - 0.12 * Math.max(0, -z.lowVol);
    case 'deepValue':
      return 0.55 * z.value + 0.20 * z.yield + 0.18 * z.quality + 0.07 * z.lowVol + 0.22 * negative(z.momentum);
    case 'dividendIncome':
      return 0.46 * z.yield + 0.26 * z.quality + 0.20 * z.lowVol + 0.08 * z.size + 0.26 * negative(z.quality);
    case 'minimumVolatility':
      return 0.62 * z.lowVol + 0.18 * z.quality + 0.12 * z.yield + 0.08 * z.size - 0.14 * Math.abs(z.momentum);
    case 'highMomentum':
      return 0.62 * z.momentum + 0.18 * positive(z.growth) + 0.12 * z.quality + 0.08 * z.size + 0.18 * negative(z.value);
    case 'largeCapQuality':
      return 0.40 * z.quality + 0.30 * z.size + 0.18 * z.lowVol + 0.12 * z.value;
    case 'smallCapOpportunity':
      return 0.34 * -z.size + 0.24 * z.value + 0.22 * z.momentum + 0.14 * z.growth + 0.06 * z.quality;
    default:
      return weightedComposite(stock);
  }
}

function buildScores() {
  const rows = UNIVERSE.map(stock => ({ ...stock, z: {} }));
  FACTORS.forEach(factor => {
    const scores = zScore(rows.map(factor.raw));
    rows.forEach((row, index) => row.z[factor.key] = scores[index]);
  });
  state.scored = rows.map(stock => {
    const score = modelScore(stock);
    return { ...stock, score };
  });
}

function applyFilters() {
  const q = state.query.trim().toLowerCase();
  let rows = state.scored.filter(stock => {
    const sectorMatch = state.sector === 'all' || stock.s === state.sector;
    const queryMatch = !q || `${stock.t} ${stock.n} ${stock.s}`.toLowerCase().includes(q);
    return sectorMatch && queryMatch;
  });

  rows = rows.sort((a, b) => {
    if (state.sort === 'ticker') return a.t.localeCompare(b.t);
    if (state.sort === 'marketCap') return number(b.mc) - number(a.mc);
    if (state.sort === 'change') return quoteFor(b).changePct - quoteFor(a).changePct;
    return b.score - a.score;
  });
  state.visible = rows;
}

function quoteFor(stock) {
  return state.quotes.get(stock.t) || { price: number(stock.price), changePct: 0 };
}

function renderModels() {
  const select = $('#modelSelect');
  select.innerHTML = '<option value="custom" disabled>Custom slider model</option>' + Object.entries(MODELS).map(([key, model]) => {
    return `<option value="${key}">${model.family} · ${model.label}</option>`;
  }).join('');
  select.value = state.activeModel;
  renderModelNote();
}

function renderModelNote() {
  const model = MODELS[state.activeModel];
  const activeWeights = FACTORS
    .filter(factor => state.weights[factor.key] > 0)
    .map(factor => `${factor.label} ${state.weights[factor.key]}`)
    .join(' · ');
  $('#modelNote').innerHTML = model
    ? `<strong>${model.label}:</strong> ${model.desc} <span>Formula: ${model.formula} Reference weights: ${activeWeights}</span>`
    : `<strong>Custom model:</strong> Slider weights are user-defined. <span>${activeWeights || 'No active factor weights'}</span>`;
}

function renderFactors() {
  const wrap = $('#factorControls');
  wrap.innerHTML = FACTORS.map(factor => `
    <label class="factor">
      <div class="factor-top">
        <strong>${factor.label}</strong>
        <span id="weight-${factor.key}">${state.weights[factor.key]}</span>
      </div>
      <input type="range" min="0" max="100" value="${state.weights[factor.key]}" data-factor="${factor.key}">
    </label>
  `).join('');

  wrap.oninput = event => {
    const key = event.target.dataset.factor;
    if (!key) return;
    state.weights[key] = Number(event.target.value);
    state.activeModel = 'custom';
    $(`#weight-${key}`).textContent = event.target.value;
    $('#weightLabel').textContent = 'Custom';
    $('#modelSelect').value = 'custom';
    renderModelNote();
    update();
  };
}

function renderSectors() {
  const sectors = [...new Set(UNIVERSE.map(stock => stock.s).filter(Boolean))].sort();
  $('#sectorSelect').insertAdjacentHTML('beforeend', sectors.map(sector => `<option value="${sector}">${sector}</option>`).join(''));
}

function renderSummary() {
  const visible = state.visible;
  const advancers = visible.filter(stock => quoteFor(stock).changePct > 0).length;
  const decliners = visible.filter(stock => quoteFor(stock).changePct < 0).length;
  const scores = visible.map(stock => stock.score).sort((a, b) => a - b);
  $('#stockCount').textContent = formatNumber.format(visible.length);
  $('#advancers').textContent = formatNumber.format(advancers);
  $('#decliners').textContent = formatNumber.format(decliners);
  $('#medianScore').textContent = (scores[Math.floor(scores.length / 2)] || 0).toFixed(2);
  $('#asOfLabel').textContent = `${state.feedSource} · ${state.feedMode === 'yahoo' ? 'quotes' : 'snapshot'} · ${AS_OF}`;
}

function renderLeaders() {
  $('#leaders').innerHTML = state.visible.slice(0, 10).map((stock, index) => {
    const quote = quoteFor(stock);
    const direction = quote.changePct >= 0 ? 'up' : 'down';
    return `
      <article class="leader">
        <span class="rank">${index + 1}</span>
        <div>
          <div class="ticker">${stock.t}</div>
          <div class="company">${stock.n}</div>
          <div class="sector">${stock.s || 'Unclassified'}</div>
        </div>
        <div>
          <div class="score">${stock.score.toFixed(2)}</div>
          <div class="meta ${direction}">${quote.changePct >= 0 ? '+' : ''}${quote.changePct.toFixed(2)}%</div>
        </div>
      </article>
    `;
  }).join('');
}

function renderTable() {
  $('#stockRows').innerHTML = state.visible.slice(0, 350).map(stock => {
    const quote = quoteFor(stock);
    const direction = quote.changePct >= 0 ? 'up' : 'down';
    return `
      <tr>
        <td><strong>${stock.t}</strong></td>
        <td>${stock.n}</td>
        <td>${stock.s || 'Unclassified'}</td>
        <td class="num">${formatMoney.format(quote.price || 0)}</td>
        <td class="num ${direction}">${quote.changePct >= 0 ? '+' : ''}${quote.changePct.toFixed(2)}%</td>
        <td class="num">${stock.score.toFixed(3)}</td>
        <td class="num">${stock.mc ? `$${formatCompact.format(stock.mc * 1_000_000_000)}` : '—'}</td>
      </tr>
    `;
  }).join('');
}

function update() {
  buildScores();
  applyFilters();
  renderSummary();
  renderLeaders();
  renderTable();
}

async function refreshQuotes() {
  try {
    const response = await fetch(apiUrl('/api/quotes'));
    if (!response.ok) throw new Error('Quote endpoint unavailable');
    const payload = await response.json();
    payload.quotes.forEach(quote => state.quotes.set(quote.t, quote));
    state.feedMode = payload.mode || 'demo';
    state.feedSource = payload.source || (payload.mode === 'yahoo' ? 'Yahoo Finance' : 'Local demo feed');
    $('#feedStatus').classList.add('live');
    $('#feedStatus').lastChild.textContent = ` ${state.feedSource} · ${new Date(payload.asOf).toLocaleTimeString()}`;
  } catch {
    simulateQuotes();
    state.feedMode = 'demo';
    state.feedSource = 'Local demo feed';
    $('#feedStatus').classList.add('live');
    $('#feedStatus').lastChild.textContent = ` Local ticks · ${new Date().toLocaleTimeString()}`;
  }
  applyFilters();
  renderSummary();
  renderLeaders();
  renderTable();
}

function simulateQuotes() {
  const now = Date.now() / 1000;
  UNIVERSE.forEach((stock, index) => {
    const base = number(stock.price, 10);
    const wave = Math.sin(now / 18 + index * .37) * .85;
    const pulse = Math.cos(now / 7 + index * .13) * .28;
    const changePct = wave + pulse;
    state.quotes.set(stock.t, {
      t: stock.t,
      price: base * (1 + changePct / 100),
      changePct,
    });
  });
}

function bindControls() {
  $('#searchInput').addEventListener('input', event => {
    state.query = event.target.value;
    update();
  });
  $('#sectorSelect').addEventListener('change', event => {
    state.sector = event.target.value;
    update();
  });
  $('#sortSelect').addEventListener('change', event => {
    state.sort = event.target.value;
    update();
  });
  $('#modelSelect').addEventListener('change', event => {
    const model = MODELS[event.target.value];
    if (!model) return;
    state.activeModel = event.target.value;
    state.weights = { ...model.weights };
    $('#weightLabel').textContent = model.label;
    renderFactors();
    renderModelNote();
    update();
  });
  $('#refreshButton').addEventListener('click', refreshQuotes);
  $('#themeButton').addEventListener('click', () => {
    const root = document.documentElement;
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
  });
}

renderSectors();
renderModels();
renderFactors();
bindControls();
simulateQuotes();
update();
refreshQuotes();
setInterval(refreshQuotes, 15000);
