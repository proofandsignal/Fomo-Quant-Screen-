# QUANT RELEASE EVIDENCE REGISTER — 16 Nov 2026

**Scope:** ONE product release: FOMO Quant Screen + Risk/PAPER Security + Market Sources + Profit Calculator. **No partial release.**

**Exact code under review:** `96c49235a1b11c2d99483df77bc541173e097e31` on [Draft PR #20](https://github.com/proofandsignal/Fomo-Quant-Screen-/pull/20).
**Security source integrated:** [Draft PR #15](https://github.com/proofandsignal/Fomo-Quant-Screen-/pull/15) at `ae606b568eb007386ce94fa96e973b639fd855ca`, with only three Calculator UI navigation additions.
**Independent review issue:** [#21](https://github.com/proofandsignal/Fomo-Quant-Screen-/issues/21).
**Venue licensing issue:** [#22](https://github.com/proofandsignal/Fomo-Quant-Screen-/issues/22).
**State:** INTERNAL DRAFT ONLY — MERGE HOLD / DEPLOY HOLD / REAL FUNDS LOCKED.

## Evidence versus claims

| Gate | Primary evidence currently available | Decision / authority |
|---|---|---|
| Isolated Quant + Profit Calculator functional QA | [Run 43804134676](https://github.com/proofandsignal/Fomo-Quant-Screen-/actions/runs/43804134676): 27/27 tests PASS; protected localhost Chromium (synthetic), navigation, calculator/export, 7/10 read-only venue quotes from loopback origin | **TECHNICAL PASS ONLY**; 7/10 is neither legal rights nor production-access proof |
| Reliability & Bybit technical checks | [Reliability 43804134658](https://github.com/proofandsignal/Fomo-Quant-Screen-/actions/runs/43804134658), [Bybit UI 43804134673](https://github.com/proofandsignal/Fomo-Quant-Screen-/actions/runs/43804134673) PASS on exact head | **PASS, limited scope** |
| PAPER Security/Birdeye financial guard regressions | [Main CI 43804134744](https://github.com/proofandsignal/Fomo-Quant-Screen-/actions/runs/43804134744): security contract, PAPER entry, planner, checkpoints and Bybit individual steps PASS | **INDIVIDUAL TEST PASS**, but full CI failed at independent fingerprint lock |
| Full Main Quant CI | [Run 43804134744](https://github.com/proofandsignal/Fomo-Quant-Screen-/actions/runs/43804134744) failure in `tests/derivatives-isolation.mjs` | **BLOCKED**. Expected `e9430dd172bcec1d`; observed `06e7c4a3cc9797ff`. Never automatically rewrite this pin |
| Independent Security/Financial sign-off | No submitted reviews in PR #15 or PR #20; [#21](https://github.com/proofandsignal/Fomo-Quant-Screen-/issues/21) is open | **PENDING DOCUMENTATION**; owner-reported PASS is not a signed independent review |
| Independent Legal/IP/source rights | No independently signed per-provider client/external redistribution matrix; [#22](https://github.com/proofandsignal/Fomo-Quant-Screen-/issues/22) remains open | **REVIEW / HOLD**. Coinbase, OKX, Gemini and Kraken documented permissions questions. Other providers UNKNOWN |
| Protected shared HTTPS | Prepared Node service [preview code](https://github.com/proofandsignal/Fomo-Quant-Screen-/blob/build/multivenue-profit-calculator-v01/preview/quant-protected/server.mjs); no Render Quant service found in last check | **NOT DEPLOYED**. Localhost Basic Auth is not real protected HTTPS |
| Actual HTTPS browser QA | No hosted URL, no matching deploy SHA | **PENDING** |
| Physical Samsung device QA | No device/browser report on protected URL | **PENDING** |
| User Human Approval for this release | No tested protected URL with explicit approval | **PENDING**, not inferred from general request to BOOST |

## Reviewer attestation contract (never pre-fill PASS)

**Security reviewer** (not author/implementation agent):
- Identity / professional role: __________________
- GitHub account or verifiable audit reference: __________________
- Exact reviewed commit `96c49235a1b11c2d99483df77bc541173e097e31`: __________________
- Full source diff reviewed, including PR #15 PAPER & Quant Calculator: **YES / NO**
- Threat model / vulnerabilities / remediation report: __________________
- Full Main CI fingerprint `06e7c4a3cc9797ff` approved for the exact source by the reviewer? **YES / NO / REVIEW**
- Actual review submission (GitHub Review link, not author comment): __________________
- Signed decision with date: **PASS / REVIEW / BLOCKED** __________________

**Independent financial reviewer:**
- Identity / qualification / verifiable report: __________________
- Exact code SHA: __________________
- Recomputed LONG, analytical SHORT, bid/ask direction, taker fees, slippage, break-even, stale-quote behavior, USD vs USDT distinction: __________________
- Disclosed unmodelled borrowing, depth, margin, funding and account fees: __________________
- Signed decision/date: **PASS / REVIEW / BLOCKED** __________________

**Independent legal/IP reviewer:**
- Name, qualification and signed report: __________________
- For each of Kraken, Coinbase, Gemini, Bybit, OKX, KuCoin, Gate.io, Bitfinex, HTX and Crypto.com Exchange: provider/entity, exact source API, jurisdiction, intended use (internal/private reviewer/public client), display/redistribution and derived analytics rights, attribution, permitted rate limit, source URL/date, license document/permission ID.
- Unlicensed/unknown source **disabled for restricted client use**, not silently proxied or bypassed.
- At least 6 legally approved, technically working client-facing sources if a marketing claim is made about six live exchanges: **YES / NO / NOT CLAIMED**
- Signed decision/date: **PASS / REVIEW / BLOCKED** __________________

**Protected preview operator** (only after verified reviewer approvals and owner authorization):
- My Workspace service ID / name: __________________
- Same-origin authenticated HTTPS URL: __________________
- Frozen commit SHA: __________________
- Auto-Deploy OFF, no secrets in repository, no public access: __________________
- Anonymous 401, authenticated app+calculator 200, real browser source CORS evidence, CSP, money lock: __________________
- Deployment/reviewer approval link: __________________

**Physical Samsung QA** (actual owner device, only after protected URL works):
- Device model and Chrome version, date/time: __________________
- Quant → Calculator → Quant, responsive layout, venue provenance, bid/ask currency, BTC/ETH/SOL, hypothetical PnL, invalid input, JSON export: __________________
- Sign-off: **PASS / FAIL**, owner confirmation: __________________

**Final Human Approval** (owner after personally testing exact HTTPS build):
- URL + tested SHA: __________________
- Decision: **APPROVE DEMO / REJECT / REWORK** and date: __________________
- This is not approval for live capital; real-money trading requires its own reviewed release with risk and paper evidence: **ACKNOWLEDGED / NO**

## Change-control

1. Reviewer MUST inspect the **current PR head**, not an earlier passing SHA. A new code commit invalidates previous source-specific review and fingerprint decision until reconciled.
2. Do not mark **FULL CI PASS** until the reviewer-authorized fingerprint is safely updated and the workflow rerun on that same reviewed source passes; do **not** delete/skip the isolation test.
3. Do not mark **LEGAL/IP PASS** merely because API responses were received. Public-data access can have separate redistribution restrictions. Author assertions and archived logs do not prove actual vendor licenses.
4. Do not mark **HTTPS or SAMSUNG PASS** based on local Chromium, GitHub Pages old version, screenshots, or unapproved Render services.
5. The private Quant research preview may not disclose third-party live market data to a reviewer/external user unless their use is independently confirmed permissible. Synthetic-only material must be unmistakably marked synthetic.
6. `ONE UNIFIED RELEASE: QUANT + CALCULATOR`. When any mandatory gate fails, release remains HOLD.

**Current honest release decision (16 Nov 2026):**

`TECHNICAL QA PASS · FULL CI BLOCKED · INDEPENDENT REVIEW UNVERIFIED · LEGAL/IP UNVERIFIED · HTTPS HOLD · SAMSUNG PENDING · HUMAN APPROVAL PENDING`

`MERGE HOLD · DEPLOY HOLD · REAL FUNDS LOCKED`
