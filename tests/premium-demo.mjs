import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const engine=require('../premium-demo-engine.js');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('premium-demo.html');
const ui=read('premium-demo-ui.js');
test('premium Demo Contract: English + brand + top-left owned logo + real Explore',()=>{
 assert.match(html,/<html lang="en">/);
 assert.match(html,/Created by Proof &amp; Signal/);
 assert.match(html,/aria-label="FOMO Quant geometric radar logo"/);
 assert.match(html,/Thematic cover showing abstract quant signal waves/);
 assert.match(html,/href="#experience" id="explore-cta"/);
 assert.match(html,/id="experience"/);
 assert.match(html,/id="framework"/);
 assert.match(html,/href="\.\/quant-market-lab\.html"/);
 for(const id of ['signal','decision','risk-status','entry','net','paper-gate','export-fixture']) assert.match(html,new RegExp('id="'+id+'"'));
});
test('premium Demo Contract: no network, no external fonts/scripts and no live data',()=>{
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/script-src 'self'/);
 assert.doesNotMatch(html,/<script[^>]*src="https?:/);
 assert.doesNotMatch(ui,/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\blocalStorage\s*\.\s*setItem/);
 assert.match(html,/SYNTHETIC MODE/);
 assert.match(html,/NO REAL ORDERS OR FUNDS/);
});
test('every case remains research-only and financially unverified',()=>{
 assert.equal(engine.names.length,4);
 for(const name of engine.names){
  const v=engine.evaluate(name,1000);
  assert.equal(v.sourceType,'SYNTHETIC_FIXTURE');
  assert.equal(v.sourceVerified,false);
  assert.equal(v.paperEligible,false);
  assert.equal(v.allowedToTrade,false);
  assert.equal(v.verifiedNet,null);
  assert.equal(v.executedOrders,0);
  assert.ok(['WATCH','REVIEW','NO TRADE','BLOCKED'].includes(v.decision));
 }
});
test('late chase and stale data cannot show a fake approved entry',()=>{
 assert.equal(engine.evaluate('chase',1000).decision,'NO TRADE');
 const stale=engine.evaluate('stale',1000);
 assert.equal(stale.decision,'BLOCKED');
 assert.equal(stale.hypotheticalNet,null);
 assert.equal(stale.rr,null);
});
test('model is deterministic, cost-aware and rejects bad values',()=>{
 const a=engine.evaluate('breakout',1000),b=engine.evaluate('breakout',1000);
 assert.deepEqual(a,b);
 assert.equal(a.rr,2);
 assert.ok(Number.isFinite(a.hypotheticalNet));
 assert.ok(a.hypotheticalNet<a.notional*(a.target/a.entry-1));
 for(const bad of [0,-1,NaN,Infinity,1000001,'1000',null])assert.throws(()=>engine.evaluate('breakout',bad));
 assert.throws(()=>engine.evaluate('__bad',1000));
});
