'use strict';
// Research-only evaluator. No orders, wallets, or venue discovery.
function finite(x){return typeof x==='number'&&Number.isFinite(x)}
function evaluateSide(input,side){
 const x=input||{}, s=side==='SHORT'?'SHORT':'LONG';
 const reasons=[], evidence=x.evidence||{};
 const venue=x.venues?.[s]||{};
 const entry=x.entry,stop=x.stops?.[s],target=x.targets?.[s];
 const geometry=finite(entry)&&finite(stop)&&finite(target)&&entry>0&&(s==='LONG'?stop<entry&&entry<target:target<entry&&entry<stop);
 if(!geometry) reasons.push('INVALID_OR_MISSING_PRICE_GEOMETRY');
 if(x.securityStatus!=='PASS') reasons.push('SECURITY_NOT_PASS');
 if(venue.verified!==true||venue.tradable!==true||(s==='SHORT'&&!['PERPETUAL','BORROW'].includes(venue.instrument))) reasons.push('VENUE_NOT_VERIFIED');
 const costs=x.costs?.[s]||{};
 const keys=['entryFeePct','exitFeePct','spreadPct','entrySlippagePct','exitSlippagePct','fundingBorrowPct','networkUsd','stopSlippagePct'];
 if(!keys.every(k=>finite(costs[k])&&costs[k]>=0)) reasons.push('COSTS_NOT_VERIFIED');
 const limits=[venue.depthCapacityUsd,venue.orderLimitUsd,venue.marginCapacityUsd,x.riskCapacityUsd?.[s]];
 if(s==='SHORT') limits.push(venue.borrowCapacityUsd);
 if(!limits.every(v=>finite(v)&&v>0)) reasons.push('CAPACITY_NOT_VERIFIED');
 const venueReady=venue.verified===true&&venue.tradable===true&&(s!=='SHORT'||['PERPETUAL','BORROW'].includes(venue.instrument));
 const maxUsd=venueReady&&limits.every(v=>finite(v)&&v>0)?Math.min(...limits):null;
 const maxQty=maxUsd!==null&&finite(entry)&&entry>0?maxUsd/entry:null;
 const leverage=venue.leverageVerified===true&&finite(venue.maxLeverage)&&venue.maxLeverage>=1?venue.maxLeverage:null;
 if(leverage===null) reasons.push('LEVERAGE_NOT_VERIFIED');
 let netProfitUsd=null,stopLossUsd=null,rr=null;
 if(geometry&&maxUsd!==null&&keys.every(k=>finite(costs[k])&&costs[k]>=0)){
  const gross=s==='LONG'?(target-entry)/entry:(entry-target)/entry;
  const adverse=s==='LONG'?(entry-stop)/entry:(stop-entry)/entry;
  const common=(costs.entryFeePct+costs.exitFeePct+costs.spreadPct+costs.entrySlippagePct+costs.exitSlippagePct+costs.fundingBorrowPct)/100;
  netProfitUsd=maxUsd*(gross-common)-costs.networkUsd;
  stopLossUsd=maxUsd*(adverse+common+costs.stopSlippagePct/100)+costs.networkUsd;
  rr=stopLossUsd>0?netProfitUsd/stopLossUsd:null;
  if(netProfitUsd<=0) reasons.push('NONPOSITIVE_NET_REWARD');
 }
 const liquidation=venue.liquidationVerified===true&&finite(venue.liquidationPrice)&&venue.liquidationPrice>0&&finite(venue.maintenanceMarginPct)?{price:venue.liquidationPrice,maintenanceMarginPct:venue.maintenanceMarginPct}:null;
 if(venue.leveraged===true&&!liquidation) reasons.push('LIQUIDATION_MODEL_NOT_VERIFIED');
 if(!evidence.asOf||!evidence.source) reasons.push('PROVENANCE_NOT_VERIFIED');
 const confirmedReject=(!geometry&&finite(entry)&&finite(stop)&&finite(target))||reasons.includes('NONPOSITIVE_NET_REWARD');
 const decision=confirmedReject?'REJECT':reasons.length?'WATCH':'ALLOW';
 return {side:s,decision,reasons,maxExecutableUsd:maxUsd,maxQuantity:maxQty,maxLeverage:leverage,netProfitUsd,stopLossUsd,rewardRisk:rr,liquidation,evidence,originalQuantDirection:x.originalQuantDirection||'UNKNOWN',paperEligible:false,executionEnabled:false};
}
function evaluateBoth(input){return {schema:'fomo.capacity-research.v0.1',mode:'RESEARCH_ONLY',long:evaluateSide(input,'LONG'),short:evaluateSide(input,'SHORT'),paperEligible:false,executionEnabled:false}}
module.exports={evaluateSide,evaluateBoth};
