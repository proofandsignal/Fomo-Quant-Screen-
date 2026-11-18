# FOMO Quant — Asset Provenance & IP Gate Review
**Prepared:** 2026-11-18 · **Integration candidate:** PR #24 + PR #25 (final SHA must be verified by the independent reviewer).
**Classification:** Developer-maintained source inventory; NOT external legal or IP sign-off.

## Files and apparent provenance

| File / feature | Observed source in repo | Third-party asset dependence | Status |
|---|---|---|---|
| `premium-demo.html` — top-left radar emblem | Hand-authored inline SVG geometry in repository source (rings, pointer, nodes) | No external image CDN, attribution link or binary image in this file | **SOURCE PRESENT / OWNERSHIP NOT INDEPENDENTLY PROVEN** |
| `premium-demo.html` — Quant thematic cover | Inline SVG paths, gradient and CSS geometry in source | No stock photo or third-party image identified in this file | **SOURCE PRESENT / OWNERSHIP NOT INDEPENDENTLY PROVEN** |
| `premium-demo.html` — typography | CSS system font stack; `Inter` token is a *local-family preference* and not a font bundle | No `@font-face`, remote font stylesheet or downloaded font asset identified in this file | **NO BUNDLED FONT LICENSING CLAIM** |
| `premium-demo-engine.js` & `premium-demo-ui.js` | Local code and synthetic fixtures | No external image imports, external fetch, third-party browser script or market API used by this premium experience | **CODE REVIEW REQUIRED** |
| `quant-market-lab.html` — premium header logo, cover | Inline SVG/CSS, same-origin scripts | No external `img` or web font imported by page; `connect-src 'none'` | **STATIC PROVENANCE REVIEW / NO 3P DISPLAY RIGHTS CLAIM** |
| `quant-market-sources.js` (repository adapter) | External market-provider endpoints implemented for controlled internal source study | Venue data display/redistribution permissions are **not** established | **LICENSE REVIEW OPEN (Issue #22)** |
| Brand wording `Created by Proof & Signal` | Visible in premium header/footer | No trademark registry or chain-of-title documentation independently inspected | **OWNER BRAND ATTESTATION PENDING** |

## Restrictions for the candidate

1. Client-facing premium page `premium-demo.html` is **English, synthetic-only** with `connect-src 'none'`; no real exchange quote, realized trade or security claim.
2. The calculator `quant-market-lab.html` remains **synthetic-only**, no public venue egress, exports `NOT_PAPER_ELIGIBLE`.
3. `index.html` is a separate legacy internal research screen; it may contain live read-only research integrations and Bulgarian labels. This IP register **does not certify** that page as a cleared English client demo.
4. Reviewer must inspect the original vectors/brand and verify asset authorship or acceptable license evidence, and confirm icon/library/font use for the **entire** rendered scope, not merely these inspected files.
5. No deployment, merge, public promotion, real orders, or real-money access authorized by this inventory.

## Independent reviewer outcome requested

- **Source file + exact SHA** inspected, asset inventory and possible third-party usage
- Brand/logo ownership evidence or authorized use declaration
- Applicable open-source licenses, market-data redistribution rights for each claimed venue
- **PASS / REVIEW / BLOCKED** per IP and Legal; link primary proof; identify reviewer and date
- Separate **Security** assessment of final combined commit and release of any hard-coded fingerprint constraints

`IP/LEGAL = REVIEW · INTEGRATED CI PENDING · PROTECTED HTTPS NOT VERIFIED · PHYSICAL SAMSUNG PENDING · HUMAN APPROVAL HOLD`
