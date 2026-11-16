# BOOST-QUANT-RELEASE-001 — One Bundle, One User Approval

**Scope:** FOMO Quant Screen + Market Sources + Profit Calculator
**Repo:** `proofandsignal/Fomo-Quant-Screen-`
**Branch:** `build/multivenue-profit-calculator-v01`
**Draft:** [PR #20](https://github.com/proofandsignal/Fomo-Quant-Screen-/pull/20)
**Review:** [QUANT-RELEASE-001 / issue #21](https://github.com/proofandsignal/Fomo-Quant-Screen-/issues/21)
**Target:** 20 Nov 2026, subject to evidence and reviewer decisions — no calendar override.

## Atomic release contract

**Ship together or hold together.** This is **ONE** multi-screen Quant product, not two independent public demos. The public target must provide all paths on **one HTTPS origin**:

- `/` or `/index.html` — existing FOMO Quant Screen, risk locks, paper tracking, Planner.
- `/quant-market-lab.html` — Research-only Market Sources and Profit Calculator.
- `/quant-market-sources.js`, `/quant-profit-calc.js`, `/quant-market-lab.js` — same-origin assets required by the market lab.
- `/derivatives-shadow.js` — existing Bybit read-only panel with link to market lab.

Navigation:
- `#quantProfitLauncher` inside main Quant header → market lab.
- `#quantProfitFromPlanner` by Position Planner → market lab.
- Market lab brand → main dashboard.
- All links relative; test on **protected HTTPS origin** before public approval.

No partial launch: **DO NOT** release the current main dashboard without the requested calculator alongside it under the same release approval, and do not represent the calculator as live when only the main dashboard is available. No special `PAPER 50` exemption.

## Evidence matrix

| Gate | Source | What it means |
|---|---|---|
| 10 spot adapters built, 7 live in Chromium | [CI+Chromium run 43460148982](https://github.com/proofandsignal/Fomo-Quant-Screen-/actions/runs/43460148982) | Past code head; repeat after latest navigation changes |
| Source QA / cross-origin at local Chromium origin | `tests/quant-browser-qa.py` | Seven public bid/ask sources previously observed, others VERIFY; not HTTPS domain |
| Main dashboard → Calculator navigation | `tests/quant-browser-qa.py` | Required after this bundle integration |
| Profit model and price/fee validation | `tests/quant-multivenue.mjs` | Hypothetical only; no fills/profit proof |
| Main Quant reliability and Bybit reference regression | GitHub workflows | Must PASS on same final head |
| Independent security/financial/legal/IP | [Issue #21](https://github.com/proofandsignal/Fomo-Quant-Screen-/issues/21) | PENDING; no reviewer assigned or sign-off |
| Protected private HTTPS preview | Release owner | HOLD until independent checks and appropriate access controls |
| Live Chrome QA on exact HTTPS deployment | Post-deploy evidence | PENDING; confirm per-venue CORS from actual origin |
| Physical Samsung browser QA | User on device | PENDING, cannot be substituted by 390px Chrome viewport |
| Human approval for public promotion | User | NOT GIVEN |

**Company/venue provider claims:** Each source must show venue, instrument, bid/ask, quote currency, UTC retrieval/provider time where known and `OBSERVED_QUOTE` vs `VERIFY`. USD != USDT. CORS, geo, provider data changes may change coverage by location or origin. No bypass of regional, permission or terms restrictions.

## Required independent reviewer checklist

- [ ] Examine **full PR diff**, including `index.html` changes, strict navigation only and no bypass of `PAPER` / `securityGateOf`, position scoring, persistence or execution.
- [ ] Independently run browser navigation test, core and reliability tests on the **exact reviewed commit**.
- [ ] Confirm financial math, fee/slippage input handling, bid/ask direction, timestamps, actual single-currency units, no shorts execution claims; all output remains `VERIFY` / `HYPOTHETICAL`.
- [ ] Verify data provider usage, redistribution rights, jurisdiction and rate limits. Failed exchanges remain `VERIFY`, not replaced by fabricated feeds.
- [ ] Review supply-chain, JS imports, untrusted source text and export, storage policy, URL/identity allowlist, secrets exposure and security warnings.
- [ ] Sign dated reviewer identity, qualifications, scope, commit SHA, primary evidence, exceptions and `PASS / REVIEW / BLOCKED` **independently**.

**Important**: The author/assistant's implementation and tests are NOT independent reviewer approval.

## Zero extra user hours / no unsafe release

Allow parallel build + CI and bounded research source QA. Avoid redundant jobs and paid APIs. Keep `main`, current GitHub Pages and live funds unchanged until independent review and user approval.

**Reviewer not assigned → reviewer gate PENDING.**
**HTTPS not published → protected preview HOLD.**
**Samsung not run → Samsung PENDING.**

`BUILD BOOST · SOURCE BROWSER 7/10 PREVIOUSLY OBSERVED · ATOMIC BUNDLE QA ACTIVE · INDEPENDENT REVIEW PENDING · HTTPS HOLD · SAMSUNG PENDING · HUMAN APPROVAL PENDING`

`MERGE HOLD · DEPLOY HOLD · LIVE CAPITAL LOCKED`
