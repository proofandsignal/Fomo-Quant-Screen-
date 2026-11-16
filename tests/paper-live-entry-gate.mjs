import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=fs.readFileSync('index.html','utf8');
const securityStart=html.indexOf('function birdeyeSecurityEvidence(d,t,ts=Date.now()){');
const securityEnd=html.indexOf('\nfunction download(',securityStart);
const paperStart=html.indexOf('const Paper = {');
const paperEnd=html.indexOf('\nfunction paperStats(',paperStart);
assert.ok(securityStart>=0&&securityEnd>securityStart&&paperStart>=0&&paperEnd>paperStart,'exact-source security and Paper modules required');
const now=Date.now();
const source={
  freezeable:null,freezeAuthority:null,ownerAddress:null,
  top10HolderPercent:0.1,mutableMetadata:false,transferFeeEnable:false
};
const token={
  key:'solana:ABC123',chain:'solana',address:'ABC123',symbol:'TEST',
  decision:'ALLOW PAPER',entryState:'IN ZONE',lastTradedLock:null,
  m:{price:1,liq:100000,mc:500000,updated:now},
  f:{volUnit:3},s:{radar:80,ess:70,pq:70,copy:60,risk:30},
  t:{firstDetected:now-5000},sources:{dex:true},
  plan:{sl:.9,tp:[1.1,1.2,1.3],mid:1,entryLow:.95,entryHigh:1.02,chase:1.1,p0:1,lock:'plan-test'}
};
const paper={open:[],closed:[]};
const logs=[];
const ctx={
  Date,Number,Object,String,Math,RegExp,JSON,
  CFG:{mode:'live',paper:{size:5,auto:true,maxOpen:5,tpFrac:[.4,.3,.3],feePct:.3,timeStopMin:20,timeStopR:.3,liqStopPct:15,maxHoldMin:1440}},
  S:{paper,tokens:new Map([[token.key,token]])},
  Clock:{now:()=>now},
  Log:{add:(...args)=>logs.push(args)},
  Tape:{add:()=>{}},
  F:{px:x=>String(x)},
  uid:()=> 'synthetic-paper-id',
  fnv1a:()=> 'synthetic-hash',
  slip:()=>.3,edgeOf:()=>({edge:'GOOD',runDet:10,move:2}),
  makePlan:t=>t.plan
};
vm.createContext(ctx);
vm.runInContext(html.slice(securityStart,securityEnd),ctx,{timeout:1500});
vm.runInContext(html.slice(paperStart,paperEnd)+'\nthis.ExactPaper=Paper;',ctx,{timeout:1500});
const P=ctx.ExactPaper;
token.sec=ctx.birdeyeSecurityEvidence(source,token,now);
assert.equal(ctx.securityGateOf(token).status,'PASS','explicitly observed Solana security fixture');
assert.ok(P.open(token,'auto'),'fresh verified live paper candidate must still be representable');
assert.equal(paper.open.length,1);
paper.open.length=0;
token.lastTradedLock=null;
for(const [name,change] of [
  ['unknown transfer fee',{sec:ctx.birdeyeSecurityEvidence({...source,transferFeeEnable:null},token,now)}],
  ['missing security',{sec:null}],
  ['stale security',{sec:ctx.birdeyeSecurityEvidence(source,token,now-16*60000)}],
  ['active mint',{sec:ctx.birdeyeSecurityEvidence({...source,ownerAddress:'11111111111111111111111111111111'},token,now)}],
  ['stale market',{m:{...token.m,updated:now-125000}}],
  ['future market',{m:{...token.m,updated:now+10000}}],
  ['no entry zone',{entryState:'ABOVE ZONE'}],
  ['cached Quant WATCH',{decision:'WATCH'}]
]){
  const original={sec:token.sec,m:token.m,entryState:token.entryState,decision:token.decision};
  Object.assign(token,change);
  assert.equal(P.open(token,'auto'),null,name+' must fail closed on direct open');
  assert.equal(P.open(token,'manual'),null,name+' must fail closed on manual open');
  assert.equal(paper.open.length,0,name+' cannot create position');
  Object.assign(token,original);
}
assert.ok(logs.length>=8,'rejections must be logged');
ctx.CFG.mode='sim';
token.sec=null;
assert.ok(P.open(token,'auto'),'synthetic SIM preview should remain usable (not live sample)');
assert.equal(paper.open.length,1);
console.log('PAPER live entry exact-source fail-closed regression PASS; SIM preview preserved');
