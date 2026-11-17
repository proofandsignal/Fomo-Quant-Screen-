import fs from 'node:fs';
import assert from 'node:assert/strict';

// FOMO-DERIVATIVES-001 — behaviour-based isolation guard.
// The former fixed hash of the entire inline application blocked all reviewed
// UI/security changes, regardless of behaviour. No whole-file fingerprint is
// used. Source-level financial and PAPER gates must continue to execute in CI.
const html = fs.readFileSync('index.html', 'utf8');
const adapter = fs.readFileSync('derivatives-shadow.js', 'utf8');
const workflow = fs.readFileSync('.github/workflows/ci.yml', 'utf8');

const scripts = [...html.matchAll(/<script(?![^>]*\\bsrc=)[^>]*>([\\s\\S]*?)<\\/script>/gi)].map(m => m[1]);
assert.equal(scripts.length, 1, 'one original inline FOMO application script');

for (const [name, pattern] of [
  ['Birdeye source-evidence normalizer', /\\bfunction\\s+birdeyeSecurityEvidence\\s*\\(/],
  ['fail-closed Security Gate', /\\bfunction\\s+securityGateOf\\s*\\(/],
  ['decision direction', /\\bfunction\\s+qsDirection\\s*\\(/],
  ['PAPER engine', /\\bconst\\s+Paper\\s*=\\s*\\{/]
]) {
  assert.match(scripts[0], pattern, name + ' must remain in the application');
}

// The semantic security checks, not a brittle exact-source fingerprint, are
// mandatory CI checks. Regression fixtures execute real extracted app logic,
// including both rejected and accepted PAPER paths.
const requiredChecks = [
  'tests/planner-smoke.mjs',
  'tests/planner-paper-ready.mjs',
  'tests/birdeye-security-contract.mjs',
  'tests/paper-live-entry-gate.mjs',
  'tests/low-base-accel.mjs',
  'tests/paper-24h-checkpoints.mjs',
  'tests/derivatives-shadow.mjs',
  'tests/derivatives-isolation.mjs'
];
for (const file of requiredChecks) {
  assert.ok(fs.existsSync(file), 'required gate missing: ' + file);
  const occurrences = workflow.split('node ' + file).length - 1;
  assert.equal(occurrences, 1, 'required gate must be called exactly once in main CI: ' + file);
}

assert.equal((html.match(/src="derivatives-shadow\\.js"/g) || []).length, 1,
  'load independent read-only module exactly once');
for (const id of ['bybitShadowPanel','bybitShadowSymbol','bybitShadowRefresh','bybitShadowExport','bybitShadowStatus','bybitShadowOutput']) {
  assert.ok(html.includes('id="' + id + '"'), 'missing isolated UI element: ' + id);
}
assert.ok(adapter.includes('isolated read-only reference markets') && adapter.includes("mode: 'SHADOW'"),
  'derivatives reference must be research-only');
assert.doesNotMatch(adapter, /\\b(?:localStorage|sessionStorage|indexedDB)\\b/i,
  'derivatives reference must not write PAPER persistence');
assert.doesNotMatch(adapter, /\\/v5\\/(?:order|position)\\b/i,
  'derivatives reference must not use private order or position APIs');
assert.doesNotMatch(adapter, /\\bmethod\\s*:\\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i,
  'derivatives reference must not contain mutation requests');

new Function(scripts[0]);
new Function(adapter);
console.log('Derivatives isolation PASS — semantic PAPER/Security checks required, no whole-app fingerprint');
