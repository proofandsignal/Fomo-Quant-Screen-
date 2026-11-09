'use strict';
// POSITION-CAPACITY-001 v0.2 — read-only research. No API calls, custody or execution.
// All inputs are externally asserted; venue existence is NEVER inferred from DEX price changes.
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const nonnegative=x=>finite(x)&&x>=0;
const positive=x=>finite(x)&&x>0;
const C=['entryFeePct','exitFeePct','spreadPct','entrySlippagePct','exitSlippagePct','fundingBorrowPct','networkUsd','stopSlippagePct'];
const validity=(stamp,now,ttl)=>{const a=Date.parse(stamp||''),b=Date.parse(now||'');return Number.isFinite(a)&&Number.isFinite(b)&&a<=b&&b-a<=ttl*60000};
function evaluateSide(input,side){
 const x=input||{},s=side==='SHORT'?'SHORT':'LONG',v=x.venues?.[s]||{},c=x.costs?.[s]||{},e=x.evidence||{};
 const entry=x.entry,stop=x.stops?.[s],target=x.targets?.[s];
 const reasons=[],add=(r)=>{if(!reasons.includes(r))reasons.push(r)};
 const geometry=positive(entry)&&positive(stop)&&positive(target)&&(s==='LONG'?stop<entry&&entry<target:target<entry&&entry<stop);
 if(!geometry)add('INVALID_OR_MISSING_PRICE_GEOMETRY');
 const hardGeometry=positive(entry)&&positive(stop)&&positive(target)&&!geometry;
 if(x.securityStatus!=='PASS')add('SECURITY_NOT_PASS');
 const mode=e.mode==='VERIFIED'?'VERIFIED':'SYNTHETIC';
 if(mode!=='VERIFIED')add('SCENARIO_ONLY');
 const freshness=positive(x.freshnessMinutes)?Math.min(x.freshnessMinutes,60):10;
 const now=x.evaluatedAt||new Date().toISOString();
 if(!e.source||!validity(e.asOf,now,freshness))add('PROVENANCE_STALE_OR_MISSING');
 const venueKind=String(v.instrument||'').toUpperCase();
 const allowed=s==='SHORT'?['PERPETUAL','BORROW']:['SPOT','MARGIN','PERPETUAL'];
 const instrumentVerified=v.verified===true&&v.tradable===true&&allowed.includes(venueKind)&&typeof v.instrumentSymbol==='string'&&v.instrumentSymbol.length>1&&typeof v.source==='string'&&v.source.length>0&&validity(v.asOf,now,freshness)&&
   (s!=='SHORT'||(venueKind==='PERPETUAL'?v.perpetualTradable===true:v.borrowAvailable===true));
 if(!instrumentVerified)add(s==='SHORT'?'SHORT_INSTRUMENT_NOT_VERIFIED':'LONG_INSTRUMENT_NOT_VERIFIED');
 const costsVerified=C.every(k=>nonnegative(c[k]));
 if(!costsVerified)add('COSTS_NOT_VERIFIED');
 const depthVerified=v.depthVerified===true&&positive(v.depthCapacityUsd)&&typeof v.depthSource==='string'&&v.depthSource.length>0&&validity(v.depthAsOf,now,freshness);
 if(!depthVerified)add('ORDER_BOOK_DEPTH_NOT_VERIFIED');
 const marginVerified=positive(v.orderLimitUsd)&&positive(v.marginCapacityUsd);
 if(!marginVerified)add('VENUE_LIMITS_NOT_VERIFIED');
 const borrowVerified=s!=='SHORT'||(positive(v.borrowCapacityUsd)&&v.inventoryVerified===true&&validity(v.inventoryAsOf,now,freshness));
 if(!borrowVerified)add('SHORT_BORROW_OR_OPEN_INTEREST_NOT_VERIFIED');
 const leverage=instrumentVerified&&v.leverageVerified===true&&positive(v.maxLeverage)&&typeof v.leverageSource==='string'&&validity(v.leverageAsOf,now,freshness)?v.maxLeverage:null;
 if(leverage===null)add('LEVERAGE_NOT_VERIFIED');
 const leveraged=v.leveraged===true||leverage!==null&&leverage>1;
 const liquidation=leveraged&&v.liquidationVerified===true&&positive(v.liquidationPrice)&&nonnegative(v.maintenanceMarginPct)&&nonnegative(v.liquidationFeePct)&&typeof v.liquidationSource==='string'&&validity(v.liquidationAsOf,now,freshness)?
 {price:v.liquidationPrice,maintenanceMarginPct:v.maintenanceMarginPct,liquidationFeePct:v.liquidationFeePct,source:v.liquidationSource}:null;
 if(leveraged&&!liquidation)add('LIQUIDATION_MODEL_NOT_VERIFIED');
 if(liquidation&&geometry&&((s==='LONG'&&stop<=liquidation.price)||(s==='SHORT'&&stop>=liquidation.price)))add('STOP_BEYOND_LIQUIDATION');
 const grossRate=geometry?(s==='LONG'?(target-entry)/entry:(entry-target)/entry):null;
 const stopRate=geometry?(s==='LONG'?(entry-stop)/entry:(stop-entry)/entry):null;
 const costRate=costsVerified?(c.entryFeePct+c.exitFeePct+c.spreadPct+c.entrySlippagePct+c.exitSlippagePct+c.fundingBorrowPct)/100:null;
 const stopCostRate=costsVerified?costRate+c.stopSlippagePct/100:null;
 const riskBudget=x.riskBudgetUsd?.[s];
 const budgetVerified=positive(riskBudget)&&geometry&&costsVerified&&riskBudget>c.networkUsd;
 if(!budgetVerified)add('STOP_BASED_RISK_BUDGET_NOT_VERIFIED');
 const riskNotional=budgetVerified?(riskBudget-c.networkUsd)/(stopRate+stopCostRate):null;
 const capRequirements=instrumentVerified&&depthVerified&&marginVerified&&borrowVerified&&budgetVerified;
 const caps=capRequirements?[v.depthCapacityUsd,v.orderLimitUsd,v.marginCapacityUsd,riskNotional,...(s==='SHORT'?[v.borrowCapacityUsd]:[])]:[];
 const maxUsd=capRequirements&&caps.every(positive)?Math.min(...caps):null;
 const maxQty=maxUsd!==null&&positive(entry)?maxUsd/entry:null;
 let netProfitUsd=null,stopLossUsd=null,rr=null,waterfall=null;
 if(maxUsd!==null&&geometry&&costsVerified){
  const grossUsd=maxUsd*grossRate;
  const components={entryFee:maxUsd*c.entryFeePct/100,exitFee:maxUsd*c.exitFeePct/100,spread:maxUsd*c.spreadPct/100,entrySlippage:maxUsd*c.entrySlippagePct/100,exitSlippage:maxUsd*c.exitSlippagePct/100,fundingBorrow:maxUsd*c.fundingBorrowPct/100,network:c.networkUsd};
  const totalCostUsd=Object.values(components).reduce((a,b)=>a+b,0);
  netProfitUsd=grossUsd-totalCostUsd;
  stopLossUsd=maxUsd*(stopRate+stopCostRate)+c.networkUsd;
  rr=stopLossUsd>0?netProfitUsd/stopLossUsd:null;
  waterfall={grossUsd,costs:components,totalCostUsd,netProfitUsd};
  if(netProfitUsd<=0)add('NONPOSITIVE_NET_REWARD');
  if(stopLossUsd>riskBudget+1e-8)add('RISK_BUDGET_EXCEEDED');
 }
 if(x.humanReviewed!==true)add('HUMAN_REVIEW_REQUIRED');
 const reject=hardGeometry||reasons.some(r=>['STOP_BEYOND_LIQUIDATION','NONPOSITIVE_NET_REWARD','RISK_BUDGET_EXCEEDED'].includes(r));
 const decision=reject?'REJECT':reasons.length?'WATCH':'ALLOW';
 return {side:s,decision,reasons,scenarioOnly:mode!=='VERIFIED',maxExecutableUsd:maxUsd,maxQuantity:maxQty,maxLeverage:leverage,netProfitUsd,stopLossUsd,rewardRisk:rr,costWaterfall:waterfall,liquidation,evidence:e,originalQuantDirection:x.originalQuantDirection||'UNKNOWN',paperEligible:false,executionEnabled:false};
}
function evaluateBoth(input){return {schema:'fomo.capacity-research.v0.2',mode:'RESEARCH_ONLY',long:evaluateSide(input,'LONG'),short:evaluateSide(input,'SHORT'),paperEligible:false,executionEnabled:false}}
if(typeof module!=='undefined'&&module.exports)module.exports={evaluateSide,evaluateBoth};
if(typeof window!=='undefined')window.FomoCapacityResearch={evaluateSide,evaluateBoth};
