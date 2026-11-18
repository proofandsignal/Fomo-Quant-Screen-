# FOMO Quant — F-001 / F-002 Reviewer Response
**Date:** 2026-11-18  ·  **Target:** Draft PR #26 (check *current HEAD* at review time)
**Status:** AUTHOR-SIDE REMEDIATION FOR RE-REVIEW; no independent sign-off.

## F-001 HIGH — reverse proxy + Basic Auth limiter
Prior code stored failures in a `Map` keyed by `req.socket.remoteAddress`. Behind Render's reverse proxy, the app may only see a proxy network address. Forged `X-Forwarded-For` is not an authenticated client identity and cannot safely be used as the sole limiter key.

The narrow **single-instance, internal synthetic-only preview** now uses a **global, fixed 60-second window of 8 failed Basic Auth attempts per process**, regardless of `X-Forwarded-For` content. A valid login does **not** reset the pressure. Requests after the 8th failure receive 429 for the remaining window. There is no per-IP `Map` overflow/clear bypass. This is a deliberately restrictive *preview-only* fail-closed policy; it can temporarily lock out the legitimate reviewer under attack.

HTTPS trust remains Render-specific: on startup trust is enabled only in Render's web-service environment; a valid `RENDER_EXTERNAL_HOSTNAME` ending in `.onrender.com` is required; request `Host` must equal it; `X-Forwarded-Proto` must be exactly `https`; connection cannot originate from localhost. **Header validation is not cryptographic attestation of proxy identity.** Security still depends on Render keeping the app port inaccessible from the public internet and rewriting/validating inbound forwarding headers. Independently verify on deployed origin and do not infer this from loopback tests.

**Known residuals:** counters are process-local, lost on restart and not shared across replicas; global limiter is DoS-sensitive; Basic Auth is only acceptable for a small, preauthorized internal synthetic evaluation audience using strong unique credentials over TLS. It is NOT a production-scale account/identity solution. Multi-instance or wider exposure requires managed identity and shared edge rate-limiting (or reviewed external access control). Render's generic DDoS mitigation does not automatically prove application-layer brute-force protection.

## F-002 MEDIUM — existing live PAPER timestamp guards
Source already enforced:
- `securityGateOf(t)`: reject missing/non-finite, mismatched, future, and **older-than-15-minute** Birdeye evidence.
- `Paper.open(t, 'auto'|'manual')` in LIVE mode: must re-evaluate fresh Security Gate, require an approved decision/entry, reject missing/non-finite, future and **older-than-120-second** market snapshot.
- Synthetic SIM operation remains explicitly non-real-money and is not proof that live transactions are enabled.

No production financial logic change was needed for the reported issue. The exact-source `tests/paper-live-entry-gate.mjs` adds **future security**, **just over 15-minute** security, missing and malformed market timestamp tests for both auto/manual paths.

## Verify and sign
```sh
git rev-parse HEAD
node tests/derivatives-isolation.mjs
node tests/paper-live-entry-gate.mjs
node tests/birdeye-security-contract.mjs
node --test tests/quant-multivenue.mjs tests/quant-release-invariants.mjs tests/quant-protected-preview.mjs tests/premium-demo.mjs
python tests/quant-browser-qa.py
```
The final CI evidence must reference **one exact current SHA**. Also inspect HTTPS host/edge behavior, cookie/header/privacy posture, logs and rate-limit on a **small authorized test**, not bulk brute-force. Render disallows DoS testing against its hosted environment.

**Explicit non-goals:** no release approval, no merge to `main`, no live provider redistribution rights, no paid APIs or real trades, no external credentials in files. Reviewer must decide whether these controls are sufficient for a limited protected QA preview and document remaining risks.

`F-001 SOURCE MITIGATED / HOSTED EDGE UNVERIFIED · F-002 EXISTING GUARD VERIFIED + TEST COVERAGE · LEGAL/IP REVIEW · HTTPS HOLD · PHYSICAL SAMSUNG HOLD · PUBLIC RELEASE HOLD`
