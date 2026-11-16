# PUBLIC PAGES MARKET-DATA CONTAINMENT — 2026-11-16

**Purpose:** enable a functional, user-testable, low-risk public GitHub Pages *synthetic-only* Market Sources & Profit Calculator while venue display/redistribution rights and independent release review remain unverified.

## Public behavior
- /index.html remains the existing FOMO Quant Screen; its SIM mode remains available. Main LIVE read-only feeds and their security/readiness claims are **not** authorized by this containment patch.
- /quant-market-lab.html is *always SYNTHETIC_ONLY*: HTML includes a static synthetic marker and a restrictive CSP \`connect-src 'none'\`. The live-market Refresh button is disabled before JavaScript loads; the only enabled quote input is \`Load synthetic scenario\` for BTC, ETH and SOL. An attempt to contact an official exchange host is blocked by CSP.
- All quote records are \`SYNTHETIC_QUOTE\`, with no real provider URL. Fee, notional, slippage and hypothetical LONG/SHORT exercises work. JSON export must include \`scope: NOT_PAPER_ELIGIBLE\`, \`allowedToTrade: false\`, \`financiallyEligiblePaper: false\`, \`verifiedNet: null\` and an explicit synthetic-source reason code.
- The integrated source adapter implementation stays in the repository for controlled independent research, but automatic CI no longer calls third-party public quote APIs. No rights are claimed for client-facing use, commercial redistribution or actual market-data execution.

## Deterministic validation and release gates
- \`node --test tests/quant-multivenue.mjs tests/quant-release-invariants.mjs tests/quant-protected-preview.mjs\` tests model, source fixtures, CSP, files and auth.
- \`python tests/quant-browser-qa.py\` checks main→calculator navigation; protected SIM browser; public static SYNTHETIC-only UI, non-PAPER export, 390px responsive Chrome, asset reset; explicit CSP-denied attempt to official Kraken origin and no actual network request. Chromium localhost is not the hosted GitHub Pages origin nor a physical Samsung.
- \`tests/derivatives-isolation.mjs\` unchanged; expected reviewed-source hash still blocks the full main CI pending independent security review. No fingerprint rebaseline. No live capital, keys or orders.
- Independent Security, Financial and Legal/IP sign-offs for the underlying product remain PENDING. The containment patch is **not** final-demo PASS. Review [Issue #21](https://github.com/proofandsignal/Fomo-Quant-Screen-/issues/21) and [Issue #22](https://github.com/proofandsignal/Fomo-Quant-Screen-/issues/22) before public promotion.
- On successful Pages workflow, verify actual HTTPS main and calculator, browser CSP, Samsung, and explicit owner final approval. Successful GitHub workflow alone is not mobile/browser acceptance.

**Containment-only deployment decision:** restrict the *already public* Market Sources page so the owner can evaluate synthetic UX without publicly exposing unlicensed quote rows. Not an endorsement of PAPER/live funds.
