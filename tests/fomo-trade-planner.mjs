import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {modelTrade}=require('../premium-demo-engine.js');
const html=fs.readFileSync('index.html','utf8');
const ui=fs.readFileSync('fomo-trade-ui.js','utf8');
const b={mode:'SPOT',notional:1000,entry:100,exit:110,stop:95,
 leverage:1,fomoFeeBps:5,protocolFeeBps:0,slippageRoundTripBps:16,
 fundingCostBps:0,networkCostUsd:0};
test('original FOMO dashboard and PAPER/Planner navigation are preserved',()=>{
 for(const id of ['positionPlannerPanel','ppOut','radar','funnel','tape','bybitShadowPanel',
  'v-research','v-results','v-esdb','v-errors','v-config'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('id="fomoTradePanel"'));
 assert.ok(html.indexOf('id="positionPlannerPanel"')<html.indexOf('id="fomoTradePanel"'));
 assert.ok(html.indexOf('id="fomoTradePanel"')<html.indexOf('id="bybitShadowPanel"'));
 for(const name of ['premium-demo-engine.js','fomo-trade-ui.js','derivatives-shadow.js'])
  assert.ok(html.includes('src="'+name+'"'));
});
test('isolated module cannot fetch markets or write PAPER / credentials',()=>{
 assert.doesNotMatch(ui,/\bfetch\s*\(|XMLHttpRequest|WebSocket|localStorage|indexedDB|Paper\.open|placeOrder|\bPOST\b/i);
 assert.ok(ui.includes('NOT_PAPER_ELIGIBLE')&&ui.includes('NOT_CONNECTED'));
});
test('spot gross, costs, NET are correct and non-tradable',()=>{
 const x=modelTrade(b);
 assert.equal(x.hypotheticalGross,100);
 assert.equal(x.hypotheticalCosts,2.65);
 assert.equal(x.hypotheticalNet,97.35);
 assert.equal(x.verifiedNet,null);
 assert.equal(x.fomoMarketVerified,false);
 assert.equal(x.allowedToTrade,false);
 assert.equal(x.paperEligible,false);
 assert.equal(x.executedOrders,0);
 assert.equal(x.liquidationPrice,null);
});
test('Perps LONG and SHORT directional gross, net, margin and stop',()=>{
 const c={...b,mode:'PERPS_LONG',leverage:2,protocolFeeBps:3,fundingCostBps:4};
 const a=modelTrade(c),z=modelTrade({...c,mode:'PERPS_SHORT',exit:90,stop:105});
 assert.equal(a.hypotheticalGross,100);
 assert.equal(z.hypotheticalGross,100);
 assert.ok(a.hypotheticalNet<100&&z.hypotheticalNet<100);
 assert.ok(z.hypotheticalStopNet<0);
 assert.equal(a.margin,500);
 assert.ok(a.hypotheticalBreakEven>100);
 assert.ok(z.hypotheticalBreakEven<100);
 const higher=modelTrade({...c,leverage:5});
 assert.equal(higher.hypotheticalNet,a.hypotheticalNet);
 assert.equal(higher.margin,200);
});
test('negative hypothetical NET stays negative, never certified',()=>{
 const x=modelTrade({...b,exit:90});
 assert.ok(x.hypotheticalNet<0);
 assert.equal(x.realizedPnL,null);
 assert.equal(x.verifiedNet,null);
});
test('bad inputs or non-FOMO or unsupported Spot-perp combinations fail closed',()=>{
 for(const invalid of [
  {notional:0},{notional:-1},{notional:Infinity},{entry:0},
  {entry:1e-17},{exit:NaN},{stop:105},{fomoFeeBps:-1},
  {networkCostUsd:Infinity},{slippageRoundTripBps:-1},
  {leverage:5},{protocolFeeBps:3},{fundingCostBps:4}
 ])assert.throws(()=>modelTrade({...b,...invalid}),JSON.stringify(invalid));
 assert.throws(()=>modelTrade({...b,mode:'PERPS_SHORT',stop:95}));
 assert.throws(()=>modelTrade({...b,mode:'UNKNOWN'}));
});
