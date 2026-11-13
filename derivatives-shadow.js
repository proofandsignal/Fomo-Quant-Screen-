/* FOMO-DERIVATIVES-001: isolated read-only reference markets. No PAPER/scoring writes. */
(function (root) {
  'use strict';
  var BASE = 'https://api.bybit.com';
  var SYMBOLS = Object.freeze(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
  var PATHS = Object.freeze({
    instruments: '/v5/market/instruments-info',
    tickers: '/v5/market/tickers',
    oi: '/v5/market/open-interest',
    funding: '/v5/market/funding/history',
    ratio: '/v5/market/account-ratio'
  });
  var TTL_MS = 120000;
  var latest = null;
  var busy = false;
  function finite(v) {
    if (v == null || v === '') return null;
    var n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function timestamp(v, now) {
    var n = finite(v);
    return n !== null && n >= 1577836800000 && n <= now + 60000 ? n : null;
  }
  function list(env) {
    return env && env.retCode === 0 && env.result && Array.isArray(env.result.list) ? env.result.list : [];
  }
  function good(env, now) {
    var t = timestamp(env && env.time, now);
    return !!(t && Math.abs(now - t) <= TTL_MS);
  }
  function normalize(symbol, data, now) {
    if (!SYMBOLS.includes(symbol)) throw new Error('Reference symbol not allowlisted');
    now = now || Date.now();
    var warnings = [];
    var ins = data.instruments, tick = data.tickers, oi = data.oi, funding = data.funding, ratio = data.ratio;
    var inst = good(ins, now) && list(ins).find(function (v) {
      return v.symbol === symbol && v.contractType === 'LinearPerpetual' &&
        v.status === 'Trading' && v.quoteCoin === 'USDT' && v.settleCoin === 'USDT';
    });
    if (!inst) return { status: 'UNAVAILABLE', symbol: symbol, fetchedAt: now, warnings: ['Instrument identity/status unverified or stale'] };
    var t = good(tick, now) && list(tick).find(function (v) { return v.symbol === symbol; });
    if (!t) return { status: 'UNAVAILABLE', symbol: symbol, fetchedAt: now, warnings: ['Ticker missing, stale or wrong market'] };
    var mark = finite(t.markPrice), f = finite(t.fundingRate), oid = finite(t.openInterestValue);
    if (!(mark > 0) || f === null || f < -1 || f > 1) {
      return { status: 'UNAVAILABLE', symbol: symbol, fetchedAt: now, warnings: ['Ticker contains invalid values'] };
    }
    var result = {
      status: 'VERIFIED', symbol: symbol, provider: 'Bybit', instrument: 'linear USDT perpetual',
      fetchedAt: now, providerTime: Number(tick.time), baseCoin: inst.baseCoin,
      markPrice: mark, currentFundingPct: f * 100, openInterestUsd: oid !== null && oid >= 0 ? oid : null,
      latestSettledFundingPct: null, settledFundingAt: null, openInterestChange1hPct: null,
      oiAt: null, longAccountPct: null, shortAccountPct: null, ratioAt: null, warnings: warnings,
      source: BASE
    };
    if (oid === null || oid < 0) warnings.push('OI USD value missing/invalid');
    if (good(oi, now) && oi.result && oi.result.symbol === symbol && oi.result.category === 'linear') {
      var history = list(oi).filter(function (v) {
        return timestamp(v.timestamp, now) && finite(v.openInterest) !== null && finite(v.openInterest) >= 0;
      }).sort(function (a, b) { return Number(b.timestamp) - Number(a.timestamp); });
      if (history.length >= 2 && Number(history[0].timestamp) >= now - 2 * 3600000 &&
        Number(history[0].timestamp) > Number(history[1].timestamp) && Number(history[0].timestamp) - Number(history[1].timestamp) <= 1.5 * 3600000 && Number(history[0].timestamp) - Number(history[1].timestamp) >= 0.5 * 3600000 &&
        Number(history[1].openInterest) > 0) {
        result.openInterestChange1hPct = (Number(history[0].openInterest) / Number(history[1].openInterest) - 1) * 100;
        result.oiAt = Number(history[0].timestamp);
      } else warnings.push('OI history missing/old');
    } else warnings.push('OI endpoint missing/stale');
    if (good(funding, now)) {
      var settled = list(funding).filter(function (v) {
        return v.symbol === symbol && timestamp(v.fundingRateTimestamp, now) &&
          Number(v.fundingRateTimestamp) >= now - 72 * 3600000 &&
          finite(v.fundingRate) !== null && Math.abs(Number(v.fundingRate)) <= 1;
      }).sort(function (a, b) { return Number(b.fundingRateTimestamp) - Number(a.fundingRateTimestamp); })[0];
      if (settled) {
        result.latestSettledFundingPct = Number(settled.fundingRate) * 100;
        result.settledFundingAt = Number(settled.fundingRateTimestamp);
      } else warnings.push('Settled funding missing/old');
    } else warnings.push('Funding endpoint missing/stale');
    if (good(ratio, now)) {
      var point = list(ratio).filter(function (v) {
        var b = finite(v.buyRatio), s = finite(v.sellRatio);
        return v.symbol === symbol && timestamp(v.timestamp, now) &&
          Number(v.timestamp) >= now - 2 * 3600000 && b !== null && s !== null &&
          b >= 0 && s >= 0 && b <= 1 && s <= 1 && Math.abs(b + s - 1) <= .02;
      }).sort(function (a, b) { return Number(b.timestamp) - Number(a.timestamp); })[0];
      if (point) {
        result.longAccountPct = Number(point.buyRatio) * 100;
        result.shortAccountPct = Number(point.sellRatio) * 100;
        result.ratioAt = Number(point.timestamp);
      } else warnings.push('Long/short account ratio missing/old');
    } else warnings.push('Long/short endpoint missing/stale');
    if (warnings.length) result.status = 'PARTIAL';
    return result;
  }
  function query(name, symbol) {
    var q = '?category=linear&symbol=' + encodeURIComponent(symbol);
    if (name === 'oi') q += '&intervalTime=1h&limit=2';
    if (name === 'ratio') q += '&period=1h&limit=1';
    if (name === 'funding') q += '&limit=1';
    return BASE + PATHS[name] + q;
  }
  async function fetchOne(name, symbol) {
    var ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, 9000);
    try {
      var response = await fetch(query(name, symbol), { method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store', signal: ctrl.signal });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      var json = await response.json();
      if (!json || json.retCode !== 0) throw new Error('Bybit retCode ' + (json && json.retCode));
      return json;
    } finally { clearTimeout(timer); }
  }
  async function load(symbol) {
    if (!SYMBOLS.includes(symbol)) throw new Error('Symbol not supported');
    var keys = Object.keys(PATHS);
    var settled = await Promise.allSettled(keys.map(function (k) { return fetchOne(k, symbol); }));
    var data = {}, failures = [];
    keys.forEach(function (k, i) {
      data[k] = settled[i].status === 'fulfilled' ? settled[i].value : null;
      if (!data[k]) failures.push(k + ': ' + String(settled[i].reason && settled[i].reason.message || 'network/CORS'));
    });
    var result = normalize(symbol, data, Date.now());
    result.failures = failures;
    return result;
  }
  function pct(v, d) { return v == null ? 'N/A' : (v > 0 ? '+' : '') + v.toFixed(d == null ? 3 : d) + '%'; }
  function money(v) { return v == null ? 'N/A' : '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 }); }
  function utc(v) { return v ? new Date(v).toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : 'N/A'; }
  function text(id, value) { var el = document.getElementById(id); if (el) el.textContent = value; }
  function row(label, value) {
    var dl = document.createElement('dl'); dl.className = 'kv';
    var dt = document.createElement('dt'); dt.textContent = label;
    var dd = document.createElement('dd'); dd.textContent = value;
    dl.appendChild(dt); dl.appendChild(dd); return dl;
  }
  function paint(result) {
    var box = document.getElementById('bybitShadowOutput');
    if (!box) return;
    box.replaceChildren();
    latest = result.status === 'UNAVAILABLE' ? null : result;
    text('bybitShadowStatus', result.status + ' · ' + utc(result.fetchedAt));
    if (result.status !== 'UNAVAILABLE') {
      box.appendChild(row('Instrument', result.symbol + ' · USDT perpetual'));
      box.appendChild(row('Mark price', '$' + result.markPrice.toLocaleString('en-US')));
      box.appendChild(row('Current funding (indicative)', pct(result.currentFundingPct, 4)));
      box.appendChild(row('Last settled funding', pct(result.latestSettledFundingPct, 4) + ' · ' + utc(result.settledFundingAt)));
      box.appendChild(row('Open interest value', money(result.openInterestUsd)));
      box.appendChild(row('Open interest Δ1h', pct(result.openInterestChange1hPct, 2) + ' · ' + utc(result.oiAt)));
      box.appendChild(row('Long/short accounts', result.longAccountPct == null ? 'N/A' : result.longAccountPct.toFixed(1) + '% / ' + result.shortAccountPct.toFixed(1) + '% · ' + utc(result.ratioAt)));
    }
    var note = document.createElement('div'); note.className = 'mini'; note.style.marginTop = '8px';
    note.textContent = 'SOURCE: Bybit Public V5 · ' + (result.warnings || []).concat(result.failures || []).join(' | ');
    if (!(result.warnings || []).length && !(result.failures || []).length) note.textContent = 'SOURCE: Bybit Public V5 · validated exchange timestamps';
    box.appendChild(note);
    var exportBtn = document.getElementById('bybitShadowExport');
    if (exportBtn) exportBtn.disabled = !latest;
  }
  async function refresh() {
    if (busy) return;
    if (document.getElementById('modeBadge') && document.getElementById('modeBadge').classList.contains('sim')) {
      latest = null; text('bybitShadowStatus', 'DISABLED IN SIM · switch to LIVE');
      document.getElementById('bybitShadowOutput').replaceChildren();
      document.getElementById('bybitShadowExport').disabled = true;
      return;
    }
    var selector = document.getElementById('bybitShadowSymbol'), button = document.getElementById('bybitShadowRefresh');
    if (!selector || !button) return;
    busy = true; button.disabled = true; latest = null;
    text('bybitShadowStatus', 'FETCHING · 5 public endpoints');
    try { paint(await load(selector.value)); }
    catch (e) { paint({ symbol: selector.value, status: 'UNAVAILABLE', fetchedAt: Date.now(), warnings: ['NETWORK / CORS / API: ' + e.message] }); }
    finally { busy = false; button.disabled = false; }
  }
  function exportSnapshot() {
    if (!latest) return;
    var body = JSON.stringify({ schema: 'fomo.derivatives.shadow.v1', provider: 'Bybit', scope: 'standalone reference market, not DEX token match', mode: 'SHADOW', snapshot: latest }, null, 2);
    var url = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
    var a = document.createElement('a'); a.href = url; a.download = 'fomo_bybit_shadow_' + latest.symbol + '_' + latest.fetchedAt + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function boot() {
    var button = document.getElementById('bybitShadowRefresh'), picker = document.getElementById('bybitShadowSymbol');
    if (!button || !picker) return;
    // Navigation only: the research calculator has no access to this adapter's
    // PAPER, scoring, credential or order pathways.
    if (!document.getElementById('fomoQuantMarketLabLink')) {
      var link = document.createElement('a');
      link.id = 'fomoQuantMarketLabLink';
      link.href = './quant-market-lab.html';
      link.textContent = 'Explore 6-Exchange Profit Calculator';
      link.style.cssText = 'display:inline-block;margin:10px 0 6px;padding:8px 12px;border:1px solid #5899a3;border-radius:10px;color:#a9f5e6;text-decoration:none;font-weight:650';
      button.parentElement.appendChild(link);
    }
    button.addEventListener('click', refresh);
    picker.addEventListener('change', function () { latest = null; text('bybitShadowStatus', 'NOT LOADED · press REFRESH'); document.getElementById('bybitShadowOutput').replaceChildren(); document.getElementById('bybitShadowExport').disabled = true; });
    document.getElementById('bybitShadowExport').addEventListener('click', exportSnapshot);
    text('bybitShadowStatus', 'ON DEMAND · NOT LOADED');
  }
  var api = Object.freeze({ SYMBOLS: SYMBOLS, PATHS: PATHS, query: query, normalize: normalize, load: load });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.FomoDerivatives = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : null);
