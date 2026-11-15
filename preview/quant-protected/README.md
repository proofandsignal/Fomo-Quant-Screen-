# Quant + Profit Calculator — Protected Preview Runbook (NOT DEPLOYED)

**Status (15 Nov 2026): DRAFT BUILD READY, INDEPENDENT SECURITY/FINANCIAL/LEGAL/IP REVIEW PENDING, HTTPS HOLD.**

This runbook prepares a no-paid-API, one-origin preview for the **entire** Quant and Profit Calculator bundle. It does not grant permission to deploy, publish data, or share provider API outputs outside authorized internal research.

## What is prepared

- `preview/quant-protected/server.mjs` (Node 22, no dependencies, read-only file server)
- `tests/quant-protected-preview.mjs` (unauthenticated 401, invalid authentication, brute-force rate limiting, 404 private docs/secret files, same-origin main/calculator, narrow CSP, HTTPS required outside localhost QA)
- `tests/quant-browser-qa.py` (Chromium loopback Basic Auth and main→lab navigation with **mocked** exchange inputs; never a substitute for deployed HTTPS browser QA)
- No external client mode allowed. `QUANT_PREVIEW_AUDIENCE=client` or `public` intentionally **refuses to start**; enabling external usage requires a reviewed code change + venue-by-venue data permissions.
- Basic Auth restricts access. For a live private deployment, independent Security must additionally assess TLS termination, provider legal rights, hosting/IP limitations, log privacy, authentication rate limits, HTTP headers and any need for a stronger identity-access layer.

## Pre-deploy required approvals (all currently incomplete)

- [ ] **Independent Security reviewer** signs exact commit, examines authentication and trust of proxy `X-Forwarded-Proto`, allowed static file map and CSP, credential transport, rate limits and hosting threat model.
- [ ] **Independent Financial reviewer** signs calculator scenario semantics, maths and no-realized-profit disclaimers.
- [ ] **Independent Legal/IP reviewer** confirms API market-data rights, jurisdiction and source attribution. [Market data rights issue #22](https://github.com/proofandsignal/Fomo-Quant-Screen-/issues/22) currently flags Coinbase/OKX and all other venues not independently reviewed. An external reviewer using the live source display could itself be third-party redistribution; confirm permissions *before sharing credentials*.
- [ ] **Explicit owner permission** for creating an isolated protected preview **after** reviewer signoff. Current release control says DEPLOY HOLD. Do not create a service without closing this gate.
- [ ] The selected protected service must use `My Workspace`, have Auto-Deploy OFF, run only this branch/immutable commit, remain free plan unless explicitly approved, not change `main`/GitHub Pages/production or auto-merge.
- [ ] Identify permitted users for this restricted preview and an acceptable access-control method; Basic Auth alone requires reviewer acceptance.

## Proposed Render settings (reference only, NOT APPLIED)

| Field | Intended setting |
|---|---|
| Workspace | My Workspace |
| Type | private QA Node web service |
| Repository | `proofandsignal/Fomo-Quant-Screen-` |
| Branch | `build/multivenue-profit-calculator-v01` |
| Build | `node --check preview/quant-protected/server.mjs && node --test tests/quant-protected-preview.mjs` |
| Start | `node preview/quant-protected/server.mjs` |
| Node | 22 |
| Auto-Deploy | OFF |
| Plan | FREE target, subject to availability |
| Auth | `QUANT_PREVIEW_USER`, `QUANT_PREVIEW_PASSWORD` secret environment variables (password ≥16 chars) |
| Audience | `QUANT_PREVIEW_AUDIENCE=internal` only; external modes fail closed |
| Health | `/healthz` returns only `OK` |
| Local-only override | `QUANT_PREVIEW_ALLOW_HTTP_LOCALHOST=1` **never on a deployed service** |

**NEVER** store passwords in GitHub, ChatGPT messages, tests or a public URL. Generate new production credentials directly in the secure hosting dashboard after approval.

## Exact scope served — authenticated GET/HEAD only

`/`, `/index.html`, `/quant-market-lab.html`, `/quant-market-sources.js`, `/quant-profit-calc.js`, `/quant-market-lab.js`, `/derivatives-shadow.js`.

`README.md`, `docs/`, `.git/`, `.env`, `tests/`, `preview/` remain inaccessible. Server sends `no-store`, `X-Robots-Tag: noindex`, `X-Frame-Options: DENY`, `nosniff` and a strict Market Lab CSP. Hosted HTTPS response needs independent browser verification; reported `x-forwarded-proto` must be trusted from hosting only, not client-supplied.

`/healthz` is unauthenticated to allow provider health checks; it returns no product artifacts.

## Local QA only

```sh
# Use synthetic one-off local test credentials only, NOT real preview credentials:
QUANT_PREVIEW_USER=qa-only \
QUANT_PREVIEW_PASSWORD=example-local-password-not-for-hosting \
QUANT_PREVIEW_ALLOW_HTTP_LOCALHOST=1 \
node preview/quant-protected/server.mjs
```

Do not use the localhost HTTP override in a hosted environment.

## Evidence to collect AFTER (and only after) authorized protected deploy

1. Exact published SHA, frozen service settings, Auto-Deploy OFF, status and user list.
2. Anonymous browser `GET /` returns 401; authenticated route returns Quant main and Market Lab under the same HTTPS origin. `/docs` and source code return 404.
3. Check source rows separately for **each** venue on deployed origin; previously 7/10 local Chromium worked, which does not guarantee the same on HTTPS, in Burgas or on Samsung.
4. Browser functional QA: navigation, fees/slippage, invalid assumptions, stale quote, paper locks, JSON export, error text and mobile responsiveness.
5. **Actual Samsung**: user personally tests and reports PASS/FAIL, real device/browser version, UTC timestamp.
6. **Human approval**: user explicitly approves before any public client-facing promotion. Even then, venue data permissions and real-funds gate require separate approval.

**Release remains HOLD.** Automated tests demonstrate readiness of the *candidate server*, not independent certification, protected deployment or legal approval.

`BUILD + LOCAL AUTH QA → INDEPENDENT REVIEW + VENUE RIGHTS → PROTECTED HTTPS → DEPLOYED BROWSER QA → SAMSUNG → HUMAN APPROVAL`

`MERGE HOLD · DEPLOY HOLD · NO REAL FUNDS`
