# FOMO Quant — Integrated Security + Financial Re-review

Prepared 2026-11-18. Developer handoff; NOT independent sign-off.

## Exact code ancestry
- Parent integrated Premium branch: Draft PR #26 at `cb932afb5eeed17f2927240121e111a01e11a173`.
- Financial source and finance regressions: Draft PR #27 at `7730cef80cc51205e1e37d089dd5079f2de6f70c`.
- This candidate bases directly on current PR26 and copies exactly two Finance files from PR27, plus a local real-assets security test and this handoff.

## Security
PR26 uses one fail-closed global per-process 8-failure window, not X-Forwarded-For IP buckets. Render proxy hostname checks were tightened. Residual: limiter resets on restart, is not distributed between replicas, and can lock out legitimate reviewers; host header checking is not cryptographic proxy identity assurance.
Reviewer must independently assess Render edge, proxy header trust, ingress isolation, authentication and acceptable external abuse for a single internal synthetic QA service. No public or hosted PASS.

## Real UI assets (F-02)
Tests now compare actual whitelisted Premium HTML and JS and Quant calculator JS response bodies byte-for-byte with repository files, while checking unauthenticated 401 and authenticated CSP, no-store, and SYNTHETIC_ONLY headers. No stub used for these checks. This complements the existing actual local Chromium QA. Physical Samsung and hosted HTTPS remain pending.

## Financial
PR27 nonfinite intermediate guard and negative tests are copied unchanged, including subnormal overflow/underflow, bad fees, valid negative net and analytic SHORT. Independently rerun tests at the new unified SHA. No verified fills, real capital, or PAPER authorization.

## Legal and release
All ten external SPOT venue rights for live client data remain UNKNOWN. The synthetic-only QA candidate must not fetch market data for external customers. No merge, deploy, owner release approval, or physical Samsung PASS is asserted.

`SAME-SHA INTEGRATED CI → INDEPENDENT SOURCE REVIEW → OWNER-AUTHORIZED PRIVATE HTTPS QA → SAMSUNG → HUMAN APPROVAL`
`MERGE HOLD · DEPLOY HOLD · CLIENT LIVE DATA HOLD · REAL FUNDS LOCKED`
