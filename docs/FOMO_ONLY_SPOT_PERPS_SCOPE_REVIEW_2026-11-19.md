# FOMO Quant Screen — FOMO-Specific Synthetic Demo Remediation

**Date:** 2026-11-19. **Repository:** `proofandsignal/Fomo-Quant-Screen-`. **Target:** Draft PR #26; inspect its exact HEAD before review.

## Owner scope
The FOMO Quant Screen is exclusively for **fomo.family workflows and trading decisions**. Analyze meme-coin information from **CoinGecko, DEX Screener and X** as supporting research only. The goal is **Spot BUY/SELL and eligible FOMO Perps LONG/SHORT** when and only when the specific FOMO market, account, jurisdiction, risk inputs, data rights and fees are independently confirmed. **Hyperliquid Quant Lab and Arbitrage Intelligence are separate projects and shall not be duplicated.**

## What this patch implements
- FOMO-first English premium synthetic user journey, FOMO platform link and explicit external source status **NOT CONNECTED**; removes generic cross-venue calculator promotional positioning from the Premium page. Legacy internal calculator and research files remain untouched for regression, isolated from the Premium client journey.
- Six deterministic cases: original four risk/momentum cases, plus **FOMO PERPS LONG and SHORT**; Spot simulated BUY stays distinct from Perps. Market availability is **UNVERIFIED** for all; none can trigger a PAPER position or order.
- Assumed costs (not verified FOMO charges): fixture FOMO fee **5 bps per side**, Perps protocol fee **3 bps per side**, round-trip slippage **16 bps**, Perps funding expense **4 bps**, nominal margin `notional / leverage`. All numbers are fictional modeling inputs and must not be represented as executable venue fees, live quotes, a margin/liquidation oracle or guaranteed profits.
- Direction-aware gross/net/risk/reward: Spot/LONG gains when scenario exit is higher; SHORT gains when exit lower; stale case returns null net/gross/costs; export retains `NOT_PAPER_ELIGIBLE`, `sourceVerified:false`, `fomoMarketVerified:false`, `verifiedNet:null`, `allowedToTrade:false`, `executedOrders:0`.
- Source/rights and tradeability status are explicit. No new API calls or market data rights claims; `connect-src 'none'` and protected preview remain unchanged.

## Honest limitations and upcoming gates
- The demo does **NOT** connect to FOMO, CoinGecko, DEX Screener, X, a brokerage account or a wallet. It does **NOT** establish that a meme coin is listed on FOMO Perps or shortable.
- Margin, liquidation, funding direction, tiered exchange fees and protocol pricing are **not model-verified**. The user-supplied goal of trading profit requires later independent Financial review and truly observed profitable outcomes.
- Existing generic multi-venue research module should be separately considered for removal/deprecation in a later scoped change. It remains an internal technical artifact, not approved FOMO scope.
- No source-level Security, Legal/IP, Financial, HTTPS, Samsung or Human approval is gained simply by this patch. The Draft remains **NO MERGE, NO DEPLOY, NO CAPITAL**.

## Reviewer acceptance
1. Verify the current PR #26 exact SHA and inspect changes relative to earlier SHA `cb932afb5eeed17f2927240121e111a01e11a173`.
2. Independently run Main FOMO CI and Quant Premium + Chromium QA on same SHA.
3. Verify all six scenario outputs, Spot vs Perps directions and synthetic export tags, source status, no API calls, zero real funds.
4. Review the new math/fees as **hypothetical assumptions**, reject any false claim of verified profit and confirm screenshot consistency.
5. Confirm FOMO-only positioning and no arbitrary 10-venue market aggregator in public client navigation; no Hyperliquid/Arbitrage product duplication.

`FOMO-ONLY SCOPE UI BUILT → CI VERIFY → INDEPENDENT REVIEW → AUTHORIZED PROTECTED HTTPS → SAMSUNG → HUMAN APPROVAL`
