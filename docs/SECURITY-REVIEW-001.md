# SECURITY-REVIEW-001 — FOMO Quant Screen, Birdeye Contract & PAPER Eligibility

**Created:** 2026-11-13
**Scope:** Draft PR #15 (branch `fix/reliability-001-fail-closed-gates`) only.
**Reviewed baseline:** `main` SHA `bdc530414439b6b7ad5e8d04eae49a74b3f2fad1`.
**Candidate head before this document commit:** `da11f7ed7910cb199ec968bd289a5d9f2be89f25`.
**Status:** ENGINEERING TESTS PASS (except deliberate isolation fingerprint hold) / **INDEPENDENT REVIEW NOT YET COMPLETED** / NO MERGE / NO DEPLOY / NO REAL FUNDS.

## Why this review is required

The original application JS was pinned by `tests/derivatives-isolation.mjs` to fingerprint `e9430dd172bcec1d`. The changed inline security/parser source has fingerprint `f189bd7db0048916` at candidate SHA above. That mismatch is intentional and must remain **a failure** until a separate reviewer assesses the exact source and authorizes a new pin. Never auto-update the expected fingerprint or disable the test.

## Provider contract — primary documentation, not live account proof

- Birdeye official endpoint with Solana example (including `freezeable:null`, `freezeAuthority:null`, `ownerAddress:null`, `mutableMetadata:null`, `top10HolderPercent:0.579835...`): https://data.birdeye.so/docs/data-api/security/get-defi-token-security
- Birdeye official guidance (explicit null authority means inactive; missing/malformed is UNKNOWN): https://birdeye.so/data-api/skills/skill-token-security
- Birdeye 2026 guide (mint authority at `ownerAddress`, nullable freeze and transfer-fee fields, percent as 0..1 fraction): https://birdeye.so/data-api/blog/detail/solana-trading-bot-api-data-layer-birdeye

These links verify *documented response shape*, not actual account fills, true token sellability, on-chain mint/freeze status, or execution.

## Changes for reviewer

1. `birdeyeSecurityEvidence` normalizes documented Solana fraction-to-percent, explicit nullable freeze authority and flag, explicit nullable owner address, transfer fee, and Boolean metadata. Missing, malformed or other-chain fields become UNKNOWN.
2. `securityGateOf` verifies source-tag, token identity, chain and local 15-minute retrieval freshness, blocks active freeze/mint authority, marks transfer-fee/holder concentration/metadata as REVIEW, and prohibits PAPER authorization on UNKNOWN evidence.
3. `srcBE` now requires `success===true` and object data before normalization. Retrieval `ts` is **client fetch time**, NOT independently asserted provider or blockchain time.
4. `tests/planner-paper-ready.mjs` now evaluates real `securityGateOf` from the exact HTML rather than a test double, with fail-closed negative fixtures.
5. `tests/birdeye-security-contract.mjs` directly tests the exact source against documented response forms: null authority, active address, active mint, transfer tax, holder fraction, malformed and missing fields, stale/future timestamp, chain/identity conflict. `.github/workflows/ci.yml` runs this test.

## CI evidence (candidate head `da11f7ed...`)

- FOMO Reliability Regression CI: PASS https://github.com/proofandsignal/Fomo-Quant-Screen-/actions/runs/43447366422
- Bybit Shadow UI Preview Smoke: PASS https://github.com/proofandsignal/Fomo-Quant-Screen-/actions/runs/43447366460
- Bybit One-Click Diagnostic CI: PASS https://github.com/proofandsignal/Fomo-Quant-Screen-/actions/runs/43447366369
- FOMO Quant Screen CI: FAIL ONLY on **deliberate changed-source pin**, after planner smoke, planner-paper-ready, Birdeye exact-source contract, low-base, 24h checkpoints, derivatives-shadow all PASS: https://github.com/proofandsignal/Fomo-Quant-Screen-/actions/runs/43447366624

This is NOT a full CI PASS. Independent review and pinned-source gate remain open.

## Reviewer acceptance checklist

- [ ] Re-run CI against final PR HEAD; verify each test file/step and changed files.
- [ ] Validate source field names, null semantics, address parser, 0..1 fraction semantics and all risk decisions against current official provider contract and an authorized redacted real response.
- [ ] Review whether provider values can be supplied, spoofed or cached outside the trusted adapter; validate source/identity/freshness controls under persistence/import, restart and network errors.
- [ ] Trace both automatic Paper.tick and Position Planner paths; ensure UNKNOWN/REVIEW/FAIL never authorizes eligible PAPER, independent of cached PASS or Analyst JSON.
- [ ] Confirm instrument/pool identity, token risk, liquidity, sellability, Token-2022/non-transferable handling, transfer taxes and absence of retroactive entry/checkpoint manipulation.
- [ ] Review all changed inline application JS **in the context of PAPER 50, Risk Gate, persistence, derived scores, derivative isolation and execution lock**; do not restrict review to the new test results.
- [ ] Confirm no private order endpoints, signing, credentials, real capital or change to production deployment.
- [ ] Explicitly approve or request changes. **Only after an independent approval** may the source fingerprint be changed with a reference to that review and a new CI run at the exact SHA.
- [ ] Obtain separate browser/HTTPS QA, physical Samsung QA and human approval for any externally shared demo.

## Remaining evidence blockers

- No independent on-chain proof that provider security flags are correct; claim source is **not** verification source.
- No authorized redacted live Birdeye profile fixture attached to this PR yet; synthetic tests alone do not prove production response validity.
- Provider `mutableMetadata:null` stays UNKNOWN, even where another field may be null and safe.
- Other chain data is UNKNOWN until separate schema review; Token-2022 and sellability require explicit verification before real-money readiness.
- User-reported PAPER 48/60 is **not** independently audited as approved, unique immutable fills; do not change the count based on CI.
- LIVE CAPITAL and PAPER eligibility remain separately locked; test PASS does not authorize either.

**Gate:** SECURITY SOURCE MAPPING IMPROVED → EXACT-SOURCE CONTRACT TEST PASS → INDEPENDENT REVIEW PENDING → FULL CI REBASELINE HOLD → HTTPS/SAMSUNG QA PENDING → HUMAN APPROVAL PENDING.

## Follow-up review delta — 2026-11-13 (separate commit after baseline above)

- Provider documentation: explicit null **ownerAddress/freezeAuthority** may mean inactive; **other null evidence remains UNKNOWN**. `transferFeeEnable:null` is now UNKNOWN, not false; `transferFeeEnable:false` is the observed no-fee fixture.
- `Paper.open` revalidates the current Security Gate and receipt-time market freshness for both manual and automatic **LIVE-mode** paper entries; cached `ALLOW PAPER` alone is insufficient. The standalone SIM demonstration remains synthetic and bypasses live evidence gates; it does not count toward eligible PAPER.
- Tests cover unknown/active security, stale/future market snapshots and cached decision or entry-zone changes. Security refresh candidates are now retried after >10 minutes rather than >30 minutes, ahead of the 15-minute gate expiry.
- **Limit:** read-only, client-side receipt timestamps are not source-origin timestamps. Browser-local records are not independent proof of market data or actual fills.
- **Reviewer action:** independently verify exact final HEAD and both PAPER paths before approving any fingerprint change. **No fingerprint change or CI bypass has been authorized.**
