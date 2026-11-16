# QUANT-REVIEW-002 — Independent release reviewer handoff

**Prepared 15 November 2026 · intentionally unsigned**

## CURRENT REVIEW TARGET — 16 NOV 2026 UPDATE

**Supersedes historical code SHAs and earlier LIVE-preview instructions elsewhere in this document.** This document is a **handoff, not an independent sign-off**.

- Exact implementation candidate before this documentation-only commit: `bb9e0bbb5f375e7cba72b8e147a0636aae7d4854` on Draft [PR #20](https://github.com/proofandsignal/Fomo-Quant-Screen-/pull/20). Reviewer must record and inspect **current final HEAD** at time of approval; a docs-only update changes the commit SHA and an app/code update invalidates source-specific approval.
- Atomic bundle: FOMO Quant Screen + Position Planner + PAPER Security + Market Sources + Profit Calculator. Security changes from PR #15 **are integrated into Draft PR #20**; they are not yet merged to `main`.
- Protected preview is **SYNTHETIC_ONLY**: requires authentication; `/index.html?mode=sim`; `connect-src 'none'` on the protected origin; deliberately generated `SYNTHETIC_QUOTE`; exported `NOT_PAPER_ELIGIBLE`; no live order or account APIs. The old advice to test external BTC/ETH/SOL exchange quotes on this protected preview is **not applicable**. Public quote research on separate loopback Chromium remains internal and has unapproved third-party redistribution rights.
- [Research + protected Browser QA run](https://github.com/proofandsignal/Fomo-Quant-Screen-/actions/runs/43885446481) PASS: **28/28 Node tests**, authenticated local Chromium 390px, synthetic export, verified CSP-blocked attempt to Kraken, same-origin CTA navigation and in-flight asset race. [Reliability](https://github.com/proofandsignal/Fomo-Quant-Screen-/actions/runs/43885446540), [Bybit Diagnostic](https://github.com/proofandsignal/Fomo-Quant-Screen-/actions/runs/43885446528), [Bybit Shadow](https://github.com/proofandsignal/Fomo-Quant-Screen-/actions/runs/43885446401) PASS.
- [Full FOMO CI](https://github.com/proofandsignal/Fomo-Quant-Screen-/actions/runs/43885446521) FAIL at unchanged reviewed-JavaScript fingerprint gate `tests/derivatives-isolation.mjs`. Seven preceding functional steps PASS. **Do not update or disable the pin without independent source review and signed approval.**
- Independent reviewer submitted approvals: **0** on PR #15 and **0** on PR #20 at last check. Market licensing approval: **0 confirmed**. HTTPS Render Quant preview: **NOT DEPLOYED**. Physical Samsung: **PENDING**. Human approval: **PENDING**. PAPER 48/60 **USER-REPORTED / NOT INDEPENDENTLY AUDITED**. Real capital: **LOCKED**.

### Reviewer reproducibility — current candidate

```sh
git clone https://github.com/proofandsignal/Fomo-Quant-Screen-.git
cd Fomo-Quant-Screen-
git fetch origin build/multivenue-profit-calculator-v01
git checkout bb9e0bbb5f375e7cba72b8e147a0636aae7d4854
node --check preview/quant-protected/server.mjs
node --check quant-market-lab.js
node --check quant-profit-calc.js
node --test tests/quant-multivenue.mjs tests/quant-release-invariants.mjs tests/quant-protected-preview.mjs
node tests/planner-paper-ready.mjs
node tests/birdeye-security-contract.mjs
node tests/paper-live-entry-gate.mjs
node tests/derivatives-isolation.mjs
```

**Expected:** deterministic tests pass; `derivatives-isolation.mjs` fails on purpose pending independent review of the changed application JavaScript. Separately reproduce Chromium only in an isolated environment with Playwright + Chrome by running `python tests/quant-browser-qa.py`; **that script also performs real public API read-only diagnostics from LOCALHOST** and should be run only after checking permitted internal use. A synthetic protected browser run must not be mistaken for a hosted HTTPS run.

### Independent decisions to return

1. **Security:** exact commit SHA, reviewed code diff, read-only isolation, Basic Auth / trusted proxy / CSP threat model, live PAPER gate and cached-security bypass checks; an explicit **APPROVE / REMEDIATE / BLOCKED** decision on any fingerprint rebaseline.
2. **Financial:** independently recomputed LONG and hypothetical SHORT, price/time identity, fees/slippage, PnL assumptions, storage and PAPER sample integrity; NEVER mark hypothetical profits as verified.
3. **Legal / IP:** protected **synthetic-only** internal QA versus separately licensed **client-facing market data** are distinct decisions. Each live venue needs a dated source-specific determination before public quotes; review [Issue #22](https://github.com/proofandsignal/Fomo-Quant-Screen-/issues/22).
4. Signed reviewer identity, independence, qualifications, UTC date, evidence links, exact HEAD, unresolved findings and `PASS / REVIEW / BLOCKED` per discipline in [Issue #21](https://github.com/proofandsignal/Fomo-Quant-Screen-/issues/21) and PR review. An author/assistant comment is not a separate reviewer.
5. **Only after required approvals:** authorized private Render HTTPS, exact deployed SHA, external browser QA, physical Samsung QA by owner, then explicit Human Approval; no partial Quant-versus-Calculator release.

`BUILD TESTS PASS · INDEPENDENT SIGNOFF PENDING · FINGERPRINT HOLD · HTTPS NOT DEPLOYED · SAMSUNG PENDING · PUBLIC RELEASE HOLD · LIVE CAPITAL LOCKED`

---


**Bundle:** FOMO Quant Screen + Market Sources + Profit Calculator (ONE release)
**Draft PR:** https://github.com/proofandsignal/Fomo-Quant-Screen-/pull/20
**Control issue:** https://github.com/proofandsignal/Fomo-Quant-Screen-/issues/21
**Reviewer status:** NOT ASSIGNED · NO INDEPENDENT SIGNOFF
**Prohibited:** merge, public deployment, production changes, orders, live funds, API secrets, bypassing CORS/geographic restrictions.

## 1. What the implementation proves — and does not

- Multi-screen navigation: `index.html` → `quant-market-lab.html` → original screen, via relative links; underlying Quant `PAPER`, security and scoring logic remain unchanged.
- Read-only public SPOT BTC / ETH / SOL reference adapters (10 configured), quote currency explicit USD or USDT, basic source identity validation, bounded 8.5-second timeout, source timestamps and status `OBSERVED_QUOTE` or `VERIFY`.
- Hypothetical LONG or **analytical SHORT only**, explicit fee/slippage/cost assumptions, conditional break-even and P&L in the original quote currency. **No** independently verified exchange execution, fees, borrow, depth, collateral, settlement, account profit or trade permission.
- Desktop and 390px mobile *Chromium* regressions and local-origin CORS source checks. Chromium viewport ≠ physical Samsung. `localhost` CORS ≠ any future HTTPS domain.
- Security hardening: standalone `quant-market-lab.html` now has CSP restricting scripts to same origin and `connect-src` to ten named exchange API origins, with `object-src`, `frame-src`, `form-action` and `base-uri` disabled. This is **not** an independent security audit; a future HTTPS server should additionally set appropriate response headers and access controls.

## 2. New legal/IP findings — IMPORTANT PUBLIC DEMO BLOCKER

Before any non-internal demonstration, third-party client access, monetization or social promotion, independently verify what the market-data terms allow. A source being public and technically reachable does NOT grant redistribution rights.

- **Coinbase official Market Data Terms (last updated 7 Aug 2026):** https://www.coinbase.com/legal/market_data — review sections 2 and 3 on internal/research-only use and prohibitions on external-user applications and redistributing/displaying data and derived analytics outside the organization without prior written consent. **Potential conflict with a customer-facing Quant Screen.** Obtain appropriate written permission or use another properly licensed data source, and document scope; do not infer a license from CORS success.
- **OKX official API Agreement (last updated 28 July 2026):** https://www.okx.com/en-gb/help/okx-api-agreement — review sections 9.3/9.4: commercial applications, public market-data redistribution, display and third-party analytics have restrictions, explicitly including unauthenticated public endpoints. **Potential conflict with a customer-facing screen.** Independent legal reviewer must determine applicability and required written permission.
- All other venues (Kraken, Gemini, Bybit, KuCoin, Gate.io, Bitfinex, HTX, Crypto.com Exchange) require their own separately evidenced **region-specific** API and market-data licensing decisions. Do not automatically mark them allowed. API document describing an endpoint is not a license.
- Code currently exists only on isolated Draft branch, for internal research. **No public/client deployment authorized.** If permissions are unavailable, source rows must be held or excluded from the public product; do not silently substitute data or bypass exchange access controls.

A qualified independent reviewer must sign per-source `APPROVED FOR THIS CLIENT USE / INTERNAL ONLY / PROHIBITED / UNKNOWN`. Current per-source legal gate: `UNKNOWN`, with identified substantial restrictions for Coinbase and OKX. Zero source licenses are claimed here.

## 3. Reproduction on reviewed commit

Reviewer independently records exact SHA and pulls reviewed code, then runs:

```bash
node --check quant-market-sources.js
node --check quant-profit-calc.js
node --check quant-market-lab.js
node --test tests/quant-multivenue.mjs tests/quant-release-invariants.mjs
python -m http.server 8765 --bind 127.0.0.1
# In a separate process, with Playwright and installed Chrome:
python tests/quant-browser-qa.py
```

The browser test starts its own local HTTP server; **stop the manual server before the Python test**. Do not call unauthorized APIs from live-capital accounts. CI workflow: `.github/workflows/quant-multivenue-qa.yml`.

Expected evidence:
- [ ] Main-to-calculator navigation via header and Position Planner CTAs.
- [ ] Final SHA CI status for core, reliability, exchange source and Chromium.
- [ ] CSP source-host allowlist, no credentials, no outbound requests to private order endpoints.
- [ ] Non-matching Kraken pair identity, malformed or future provider timestamps → `VERIFY`, no fallback.
- [ ] Crossed/missing bid/ask and missing fee, stale quote, negative costs → no hypothetical P&L number.
- [ ] USD and USDT isolated, cannot assert equality, cost and ROI labels only in original quote currency.
- [ ] External source HTML/JS injection resistance, JSON export limits, supply-chain dependencies, CORS and rate limits.
- [ ] Original quant paper security logic and all locked trading gates unchanged.

**Known limitations:** original index is an evolving single-file client script with separate existing finance/security gates. This packet does not certify its entire codebase. Tests are evidence for a reviewer to reproduce, not the review itself.

## 4. Protected HTTPS target — deployment is HOLD until approval

The preview must host the **complete bundle on a single restricted HTTPS origin**, disable Auto-Deploy, never modify `main` / current GitHub Pages, expose no private GitHub code/secrets, and have documented access control that reviewers approve. HTTP 200 alone is NOT a live-browser PASS. Test each exact provider from the deployed HTTPS origin, read-only calls only, stale requests, JSON export, desktop and mobile viewport.

Any hosting, security headers, CSP policy changes or provider requirements discovered later require a new review of the final SHA. No full release based on CI-only evidence.

## 5. Physical Samsung acceptance (requires human)

On **the actual Samsung phone**, after the protected URL is approved and available:
1. Open the supplied restricted HTTPS screen via Chrome in a normal (non-SIM) tab.
2. Tap the main header **MARKET SOURCES + PROFIT CALCULATOR** and return to Quant; tap the Position Planner CTA as well.
3. Refresh BTC, ETH, SOL separately. Record **actual** accessible venues, currency, timestamps, CORS failures and any unexpectedly substituted prices. `VERIFY` must remain for blocked sources.
4. Enter a hypothetical LONG example, adjust fee/slippage and confirm net and break-even recalculate; test blank fee and stale quotes to ensure `VERIFY`.
5. Export JSON and inspect the filename, scope `NOT_PAPER_ELIGIBLE`, no private identifiers or keys, accurate quote currency.
6. Confirm no overflowing controls, broken navigation, unreadable text or false LIVE/PAPER/REAL PROFIT claims.
7. Report **Samsung PASS / FAIL** with device/browser version and time. Screenshot optional and redact identifiers.

No software emulator or remote assistant may sign physical-device PASS.

## 6. Independent approval evidence — ALL FIELDS EMPTY

| Gate | Reviewer evidence required | State |
|---|---|---|
| Security | independent reviewer identity, audit SHA, vulnerabilities and resolution, sign-off | **PENDING** |
| Financial correctness | separately reproduced formulas, fee and fill assumptions, edge cases | **PENDING** |
| Legal/IP | venue-by-venue terms, data redistribution/use permission, EEA and consumer scope | **PENDING** |
| Protected HTTPS | approved access controls, full bundle URL and immutable deploy SHA | **HOLD** |
| Deployed Chromium | origin-specific CORS results and interactive QA | **PENDING** |
| Physical Samsung | actual phone browser run | **PENDING** |
| Human Approval | explicit user release decision after testing | **NOT GIVEN** |

Reviewer name / qualifications: **NOT ASSIGNED**

Reviewer evidence SHA: **NONE**

Signed decision `PASS / REVIEW / VERIFY / BLOCKED`: **NOT PRESENT**

**No independent reviewer has been hired, assigned or substituted by this assistant.**

`BUILD QA → INDEPENDENT SECURITY/FINANCIAL/LEGAL/IP SIGNOFF → PROTECTED HTTPS → LIVE DEPLOYED BROWSER QA → SAMSUNG → HUMAN APPROVAL`

`MERGE HOLD · DEPLOY HOLD · REAL FUNDS LOCKED`
