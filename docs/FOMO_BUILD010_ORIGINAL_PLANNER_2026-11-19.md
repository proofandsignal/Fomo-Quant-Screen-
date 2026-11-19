# BUILD-010 · FOMO Original Screen Spot + Perps Research Planner
Owner directive: preserve original FOMO Quant Screen interface. Original `index.html` blob `5710112c3ef124dfc5dd384b2d207e6d7f8c7f08` in Draft PR #26 base.

## Changes
- Added English read-only FOMO Spot BUY/SELL, FOMO Perps LONG/SHORT and hypothetical NET/P&L module **inside existing Position Planner** without removing Radar, tabs, old calculations, PAPER journal, security gates or persistence.
- Reused existing `premium-demo-engine.js` and exposed separate deterministic `modelTrade()`; add-on `fomo-trade-ui.js` has no network, order APIs, tokens, wallets or storage. Sanitized selected RADAR price is **reference only**, not FOMO instrument eligibility proof.
- Editable notional, entry, exit, stop, leverage, assumption fees per side, protocol fees, slippage, assumed funding and optional network cost. Models net, gross, stop outcome, breakeven, margin and notional ROI. Negative returns stay negative; leverage is not a magic multiplier for profits.
- Controls `fomoMarketVerified:false`, `sourceVerified:false`, `verifiedNet:null`, `liquidationPrice:null`, `allowedToTrade:false`, `paperEligible:false`, `realizedPnL:null` are never unlocked. No claim of FOMO live API, verified financial advantage or actual positions.
- CoinGecko, DEX Screener and X are **NOT CONNECTED**; their specific permissions, contracts, provenance and fees require source-level legal and product validation. `getfomoapi.fun` in the old README is explicitly unofficial; do not conflate it with official https://fomo.family/.
- Old multi-venue calculator and Bybit reference remain legacy technical modules, not an endorsement to mix FOMO Quant with Hyperliquid Quant Lab or Arbitrage Intelligence.

## Verification and blockers
- New exact-SHA `tests/fomo-trade-planner.mjs` and original security/PAPER full CI mandatory. Preview remains synthetic with CSP `connect-src 'none'`; original index route remains auth-gated and redirects to `?mode=sim`.
- Independently verify full code, math, browser QA, asset mapping, FOMO availability, market-data licensing and proxy trust. User's older financial/security reports and PR #27/#28 are *prior source artifacts*, not automatic new-SHA approvals.
- Original `index.html` still contains Bulgarian labels/logs. The new add-on is English, but **full English localization remains REVIEW/PARTIAL**; cannot claim public demo PASS yet.
- Do not claim verified profit without source-executed trades or forward PAPER fills plus independently reconciled fees and prices.
- No merge, deploy, production change or real funds; owner must test actual hosted HTTPS on physical Samsung before human release approval.

`BUILD-010 IMPLEMENTED · SOURCE CI PENDING · INDEPENDENT FINANCIAL/SECURITY/LEGAL/IP REVIEW · HTTPS HOLD · SAMSUNG HOLD · REAL FUNDS LOCKED`
