/* RESEARCH-002: scenario math only; no orders, no forecasts, no gate overrides. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.FomoProfitRisk=factory();})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const finite=x=>typeof x==="number"&&Number.isFinite(x);
function assess(s){
 if(!s||!["LONG","SHORT"].includes(s.direction))return {status:"NOT_VERIFIED",reason:"INVALID_DIRECTION"};
 const keys=["entry","target","stop","feePct","spreadPct","slippagePct","fundingPct","borrowPct"];
 if(keys.some(k=>!finite(s[k]))||s.entry<=0||s.target<=0||s.stop<=0||keys.slice(3).some(k=>s[k]<0))return {status:"NOT_VERIFIED",reason:"MISSING_OR_INVALID_INPUT"};
 if(s.direction==="LONG"&&!(s.target>s.entry&&s.stop<s.entry)||s.direction==="SHORT"&&!(s.target<s.entry&&s.stop>s.entry))return {status:"NOT_VERIFIED",reason:"INVALID_TARGET_STOP"};
 const costs=s.feePct+s.spreadPct+s.slippagePct+s.fundingPct+s.borrowPct;
 const grossRewardPct=(s.direction==="LONG"?(s.target/s.entry-1):(1-s.target/s.entry))*100;
 const grossLossPct=(s.direction==="LONG"?(1-s.stop/s.entry):(s.stop/s.entry-1))*100;
 const netRewardPct=grossRewardPct-costs,netLossPct=grossLossPct+costs;
 const feasibility=s.direction==="SHORT"?(s.shortInstrumentVerified===true?"REQUIRES_EXECUTION_REVIEW":"NOT_VERIFIED"):"REQUIRES_EXECUTION_REVIEW";
 return {status:"SCENARIO_ONLY",direction:s.direction,grossRewardPct,netRewardPct,netLossPct,netRewardRisk:netLossPct>0?netRewardPct/netLossPct:null,breakEvenWinRate:netRewardPct>0?netLossPct/(netLossPct+netRewardPct):null,feasibility,security:s.security||"UNKNOWN",action:"WATCH",paperFill:false,expectedProfit:"NOT_VERIFIED",note:"Break-even win rate assumes two fixed outcomes and is not a forecast."};
}
return Object.freeze({assess});
});
