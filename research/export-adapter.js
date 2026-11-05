/* Offline research export adapter. No orders, no forecasts, no mutable T0. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.FomoResearchAdapter=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const ok=x=>typeof x==="number"&&Number.isFinite(x);
function parse(exported){
 if(!exported||exported.schema!=="fomo.position-plan-export.v0.3"||exported.recordType!=="OBSERVATION")return {status:"NOT_VERIFIED",reason:"INVALID_EXPORT_SCHEMA"};
 const token=exported.token,market=exported.quant&&exported.quant.market,analyst=exported.analyst,created=Date.parse(exported.planCreatedAt);
 if(!token||!token.chain||!token.address||!market||!ok(market.price)||market.price<=0||!Number.isFinite(created))return {status:"NOT_VERIFIED",reason:"IDENTITY_PRICE_OR_TIMESTAMP_MISSING"};
 const direction=analyst&&analyst.originalQuant&&analyst.originalQuant.direction || exported.positionPlan&&exported.positionPlan.quant&&exported.positionPlan.quant.direction;
 const allowed=["LONG","SHORT","NO TRADE","UNCLEAR"];
 if(!allowed.includes(direction))return {status:"NOT_VERIFIED",reason:"DIRECTION_MISSING"};
 return {status:"OBSERVATION_ONLY",observationId:exported.observationId||null,token:{chain:token.chain,address:token.address},timestamp:created,price:market.price,liquidityUsd:ok(market.liq)?market.liq:null,originalDirection:direction,finalDecision:exported.positionPlan&&exported.positionPlan.decision||exported.quant.decision||"WATCH",security:exported.quant.securityGate&&exported.quant.securityGate.status||"UNKNOWN",paperEligible:false,immutable:false};
}
function scenarioFromExport(exported,side,overrides){
 const r=parse(exported);
 if(r.status!=="OBSERVATION_ONLY")return r;
 if(!["LONG","SHORT"].includes(side))return {status:"NOT_VERIFIED",reason:"INVALID_SIDE"};
 const plan=exported.positionPlan;
 const levels=plan&&plan.targets&&plan.targets.levels;
 if(!Array.isArray(levels)||!levels.length||!plan.risk||!ok(plan.risk.stopPrice))return {status:"NOT_VERIFIED",reason:"PLAN_LEVELS_MISSING"};
 if(side!=="LONG")return {status:"NOT_VERIFIED",reason:"SHORT_PLAN_NOT_PRESENT_IN_EXPORT"};
 const costNames=["feePct","spreadPct","slippagePct","fundingPct","borrowPct"];
 if(!overrides||!costNames.every(k=>ok(overrides[k])&&overrides[k]>=0))return {status:"NOT_VERIFIED",reason:"VERIFIED_COST_INPUTS_REQUIRED"};
 const first=levels[0];
 if(!first||!ok(first.price))return {status:"NOT_VERIFIED",reason:"TARGET_MISSING"};
 return {status:"SCENARIO_INPUT",direction:side,entry:r.price,target:first.price,stop:plan.risk.stopPrice,...Object.fromEntries(costNames.map(k=>[k,overrides[k]])),security:r.security,sourceObservationId:r.observationId,sourceOriginalDirection:r.originalDirection,sourceFinalDecision:r.finalDecision,historicalResearchOnly:true};
}
return Object.freeze({parse,scenarioFromExport});
});
