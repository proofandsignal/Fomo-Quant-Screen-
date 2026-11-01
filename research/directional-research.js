/* RESEARCH-002: pure, research-only evaluation. No order execution. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.FomoDirectionalResearch=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const DIRECTIONS=["LONG","SHORT","NO TRADE","UNCLEAR"];
function finite(x){return typeof x==="number"&&Number.isFinite(x);}
function identity(x){return x&&x.chain&&x.address?String(x.chain).toLowerCase()+":"+String(x.address).toLowerCase():null;}
function evaluate(input){
  if(!input||!input.t0||!input.followup)throw Error("T0 and followup required");
  const t=input.t0,f=input.followup,d=t.direction;
  if(!DIRECTIONS.includes(d))throw Error("Invalid T0 direction");
  if(!identity(t.token)||identity(t.token)!==identity(f.token))return {status:"NOT_VERIFIED",reason:"TOKEN_IDENTITY_MISMATCH"};
  if(!finite(t.timestamp)||!finite(f.timestamp)||f.timestamp<=t.timestamp)return {status:"NOT_VERIFIED",reason:"INVALID_CHRONOLOGY"};
  if(!finite(t.price)||!finite(f.price)||t.price<=0||f.price<=0)return {status:"NOT_VERIFIED",reason:"MISSING_PRICE"};
  const movePct=(f.price/t.price-1)*100;
  const directionCorrect=d==="LONG"?movePct>0:d==="SHORT"?movePct<0:null;
  const executable=d==="SHORT"?shortFeasibility(input.shortVenue):{status:"NOT_ASSESSED"};
  return {status:"MEASURED",direction:d,movePct,directionCorrect,shortExecution:executable,tradePnL:"NOT_VERIFIED",paperFill:false,security:t.security||"UNKNOWN",t0Timestamp:t.timestamp,followupTimestamp:f.timestamp};
}
function shortFeasibility(v){
  if(!v||v.verified!==true)return {status:"NOT_VERIFIED",reason:"VENUE_EVIDENCE_MISSING"};
  if(v.instrumentAvailable!==true)return {status:"NOT_EXECUTABLE",reason:"NO_SHORT_INSTRUMENT"};
  if(!finite(v.timestamp)||!finite(v.feesPct)||!finite(v.slippagePct)||!finite(v.fundingPct)||!finite(v.borrowPct)||!finite(v.liquidityUsd)||v.liquidityUsd<=0)return {status:"NOT_VERIFIED",reason:"EXECUTION_COST_OR_LIQUIDITY_MISSING"};
  return {status:"FEASIBILITY_REVIEW",estimatedRoundTripCostPct:v.feesPct+v.slippagePct+v.fundingPct+v.borrowPct,reason:"MARGIN_LIQUIDATION_AND_EXECUTION_NOT_VERIFIED"};
}
function dedupeKey(t){return identity(t.token)+":"+(finite(t.timestamp)?t.timestamp:"MISSING_T0");}
function summarize(results){
 const valid=results.filter(x=>x.status==="MEASURED");
 const byDirection={LONG:{count:0,correct:0},SHORT:{count:0,correct:0},"NO TRADE":{count:0,correct:0},UNCLEAR:{count:0,correct:0}};
 for(const r of valid){const b=byDirection[r.direction];b.count++;if(r.directionCorrect===true)b.correct++;}
 return {measured:valid.length,notVerified:results.length-valid.length,byDirection,approvedPaperFills:0,liveCapital:"LOCKED"};
}
return Object.freeze({evaluate,shortFeasibility,dedupeKey,summarize});
});
