/* Quant release invariant smoke: same-origin UI bundle and read-only isolation.
 * Checks DRAFT code. Not an independent security/legal review.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const read=name=>readFileSync(resolve(root,name),'utf8');
const main=read('index.html');
const lab=read('quant-market-lab.html');
const ui=read('quant-market-lab.js');
const sources=read('quant-market-sources.js');
const calc=read('quant-profit-calc.js');
const boundary=[ui,sources,calc].join('\n');

test('atomic release: main header + planner both link to same-origin calculator',()=>{
 assert.match(main,/id="quantProfitLauncher"[^>]*href="\.\/quant-market-lab\.html"/);
 assert.match(main,/id="quantProfitFromPlanner"[^>]*href="\.\/quant-market-lab\.html"/);
 for(const id of ['quantProfitLauncher','quantProfitFromPlanner'])
   assert.match(main,new RegExp('id="'+id+'"[^>]*data-research-only="true"'));
 assert.match(lab,/<a[^>]*class="brand"[^>]*href="\.\/index\.html"/);
 for(const src of ['quant-market-sources.js','quant-profit-calc.js','quant-market-lab.js'])
   assert.match(lab,new RegExp('<script src="\\./'+src.replaceAll('.','\\.')+'"><\\/script>'));
});
test('standalone market module has no public order/admin APIs or state writes',()=>{
 for(const forbidden of [
  /\blocalStorage\s*\.\s*setItem\s*\(/,
  /\bsessionStorage\s*\.\s*setItem\s*\(/,
  /\bnavigator\s*\.\s*sendBeacon\s*\(/,
  /\bXMLHttpRequest\s*\(/,
  /\bWebSocket\s*\(/,
  /\bWebTransport\s*\(/,
  /\bfetch\s*\(\s*['"]https?:\/\/[^'"]*\/(?:private|order|withdraw)/,
  /\b(?:eval|Function)\s*\(/
 ])assert.doesNotMatch(boundary,forbidden);
 assert.match(sources,/method:'GET'/);
 assert.match(sources,/credentials:'omit'/);
 assert.match(sources,/mode:'cors'/);
 assert.doesNotMatch(lab,/<iframe\b/i);
});
test('calculator cannot claim financial pass or qualified PAPER count',()=>{
 assert.match(calc,/financiallyEligiblePaper:false/);
 assert.match(calc,/allowedToTrade:false/);
 assert.match(calc,/verifiedNet:null/);
 assert.match(calc,/economicStatus:'VERIFY'/);
 assert.match(lab,/No orders/);
 assert.match(lab,/PAPER qualification/);
});
test('web page never auto-loads market sources before explicit button activation',()=>{
 assert.match(ui,/\$\('refresh'\)\.onclick=scan/);
 assert.doesNotMatch(ui,/\bscan\s*\(\s*\)\s*;/);
});
test('source origin list is restricted to https allowlisted exchange endpoints',()=>{
 const urls=[...sources.matchAll(/return '(https:\/\/[^']+)'/g)].map(x=>x[1]);
 assert.equal(urls.length,10,'Expected exactly ten hardcoded official API URLs');
 for(const url of urls)assert.ok(url.startsWith('https://')&&!/\/(?:private|orders|withdraw)/i.test(url));
});


test('public Pages calculator is unmistakably synthetic-only and no-exchange-egress',()=>{
 assert.match(lab,/<meta name="quant-preview-mode" content="synthetic">/);
 assert.match(lab,/<button id="refresh" disabled/);
 assert.match(lab,/<button id="load-synthetic" class="secondary">Load synthetic scenario<\/button>/);
 assert.match(lab,/Live exchange quotes are disabled/);
 assert.match(ui,/if\(syntheticPreview\)\{disableOutcome\('Protected synthetic profile blocks exchange API requests\.'\);return;\}/);
 assert.match(ui,/syntheticPreview\?q\.status==='SYNTHETIC_QUOTE'/);
 assert.match(ui,/function loadSynthetic\(\)/);
});
test('public Pages CSP denies exchange connections, unapproved scripts, embeds and forms',()=>{
 const tag=lab.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
 assert.ok(tag,'Calculator page must have an enforcing Content-Security-Policy');
 const csp=tag[1];
 for(const clause of ["default-src 'none'","script-src 'self'","object-src 'none'",
    "frame-src 'none'","form-action 'none'","base-uri 'none'","connect-src 'none'"])
   assert.ok(csp.includes(clause),'CSP missing '+clause);
 assert.doesNotMatch(csp,/script-src[^;]*unsafe-inline|unsafe-eval/);
 assert.doesNotMatch(csp,/connect-src[^;]*https:|connect-src[^;]*\*/);
});
