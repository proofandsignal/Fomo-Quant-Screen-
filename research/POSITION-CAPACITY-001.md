# POSITION-CAPACITY-001 — LONG / SHORT Capacity & Profit Panel
Status: RESEARCH ONLY. Draft PR, no merge or deployment.

For EACH side independently show:
1. Can execute? LONG requires verified spot/margin venue; SHORT requires verified perpetual or borrow instrument.
2. Maximum executable position USD and quantity: min of verified order-book depth at slippage tolerance, venue/order/borrow limits, collateral/margin limits and stop-based risk budget. Missing mandatory constraint => NOT VERIFIED. Never infer capacity from TVL/liquidity alone.
3. Maximum leverage: current verified instrument/venue and collateral-specific limits, with timestamps.
4. Potential NET profit USD and percent: gross target profit less entry and exit fees, spread, slippage/market impact both ways, funding or borrow, and network fees.
5. Potential stop loss USD and percent: stop distance plus all execution costs and adverse stop slippage; losses can exceed stop estimate.
6. Liquidation risk: venue-specific maintenance margin, estimated liquidation price, stop distance, liquidation fees; UNKNOWN when not evidenced.
7. Net reward/risk, break-even win rate, assumptions and timestamp.
8. Decision ALLOW/WATCH/REJECT with reasons for each side; preserve original Quant direction and final WATCH separately.

Gate rules: ALLOW requires security PASS, verified tradable instrument, fresh depth, verified fees/funding, risk constraints and human approval. Research ALLOW is not order permission. WATCH on unknown evidence; REJECT on confirmed failed constraints. SHORT geometry target < entry < stop; LONG stop < entry < target. Never create a SHORT retrospectively from a price fall.

Acceptance tests: show both sides even when unavailable; spot liquidity alone does not verify SHORT; unknown capacity must not display $0 or a fabricated max; missing cost input means NET PnL NOT VERIFIED; invalid stop geometry REJECT; negative net reward cannot ALLOW; preserve NO TRADE; no paper fills, wallet connections or execution; duplicate identical exports counted once.

Inputs/provenance: chain+mint+pool, original timestamp and direction, venue/instrument, bid/ask/depth as-of time, slippage limit, order and borrow limits, fee tier, funding, collateral, risk budget, leverage and margin model, entry/stop/targets, security evidence. Synthetic scenarios must say SCENARIO ONLY.

Premium UI: logo top-left; side-by-side LONG and SHORT cards; cost waterfall; depth/slippage graph; stop/liquidation visual; evidence explorer; expandable risk reasons; data freshness. Separate research preview only until CI, independent security review, browser QA and explicit release approval.

PAPER 0/50; LIVE CAPITAL LOCKED; NO VERIFIED EVIDENCE => NO GATE CHANGE.