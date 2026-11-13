import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

const html=fs.readFileSync('index.html','utf8');
assert.ok(html.includes('maxHoldMin: 1440'),'default PAPER max hold must be 24h');
assert.ok(html.includes("checkpoint:'24h'") || html.includes("key:'24h'"),'24h checkpoint must exist');

const start=html.indexOf('const Planner={');
const end=html.indexOf('/* =====================================================================\n   MAIN CYCLE',start);
assert.ok(start>=0&&end>start,'Planner code missing');
const code=html.slice(start,end);

const now=Date.now();
const key='solana:TEST';
const S={
  sel:key,
  tokens:new Map(),
  planner:{analyst:null,analystExtract:null,analystKey:null,plan:null,latestSnapshot:null,journal:[],observations:[]}
};
const token={
  key,chain:'solana',address:'TEST',symbol:'TEST',
  m:{price:1.1,liq:90000,updated:now,chg:{m5:1,h1:2,h6:3,h24:4}}
};
S.tokens.set(key,token);
let persists=0;

const sandbox={
  S,
  CFG:{paper:{feePct:0.3},gates:{minLiq:40000,minCopy:50},plan:{slMult:2,slMin:6,slMax:25}},
  $:()=>null,
  toast:()=>{},
  persist:()=>{persists++;},
  securityGateOf:()=>({status:'PASS'}),
  qsDirection:()=> 'LONG',
  slip:()=>0.3,
  clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
  Log:{add:()=>{}},
  VERSION:'test',
  TextEncoder,
  crypto:webcrypto,
  isFinite,
  Date,Object,Array,Number,String,Math,JSON,RegExp,console
};
vm.createContext(sandbox);
vm.runInContext(code+'\nthis.PlannerRef=Planner;',sandbox,{timeout:1500});
const P=sandbox.PlannerRef;
P.render=()=>{};

function rec(id,minutesAgo,followUps=[]){
  const lockedAt=new Date(now-minutesAgo*60000).toISOString();
  return {
    original:{
      schema:'fomo.position-snapshot.v0.3',
      testId:id,recordType:'PAPER',lockedAt,
      quant:{market:{liq:100000}},
      positionPlan:{token:{key,chain:'solana',address:'TEST'},execution:{fill:1.0}}
    },
    sha256:'x'.repeat(64),
    followUps
  };
}

// Valid 15m checkpoint: current source timestamp is effectively the target timestamp.
const r15=rec('FOMO-P001',15);
S.planner.journal=[r15];
token.m.updated=now;
P.trackFollowUps();
const cp15=r15.followUps.find(x=>x.checkpoint==='15m');
assert.equal(cp15?.status,'VALIDATED','15m checkpoint should validate with fresh target-time source');
assert.ok(Math.abs(cp15.returnFromFillPct-10)<0.001,'return from modeled fill must be captured');
assert.ok(Math.abs(cp15.liquidityChangePct+10)<1e-9,'liquidity delta must be captured');

// Newly required 5m and 30m windows are verified only at target time.
for (const minute of [5,30]) {
  const record=rec('FOMO-P'+String(minute).padStart(3,'0'),minute);
  S.planner.journal=[record];
  token.m.updated=now;
  P.trackFollowUps();
  assert.equal(record.followUps.find(x=>x.checkpoint===minute+'m')?.status,'VALIDATED',minute+'m target-time evidence');
}

// Future-dated source observations cannot validate a checkpoint.
const future=rec('FOMO-P004',15);
S.planner.journal=[future];
token.m.updated=now+60000;
P.trackFollowUps();
assert.equal(future.followUps.some(x=>x.checkpoint==='15m'&&x.status==='VALIDATED'),false,'future-dated market snapshot must not validate checkpoint');
token.m.updated=now;

// Missed windows must fail closed: no hindsight backfill.
const r70=rec('FOMO-P002',70);
S.planner.journal=[r70];
token.m.updated=now;
P.trackFollowUps();
assert.equal(r70.followUps.find(x=>x.checkpoint==='5m')?.status,'NOT_VERIFIED');
assert.equal(r70.followUps.find(x=>x.checkpoint==='15m')?.status,'NOT_VERIFIED');
assert.equal(r70.followUps.find(x=>x.checkpoint==='30m')?.status,'NOT_VERIFIED');
assert.equal(r70.followUps.find(x=>x.checkpoint==='1h')?.status,'NOT_VERIFIED','late current price must not backfill 1h');

// 24h checkpoint can validate independently after earlier checkpoints already resolved.
const earlier=['15m','1h','3h','6h','12h'].map((checkpoint,i)=>({checkpoint,status:'VALIDATED',observedAt:new Date(now-(100-i)*60000).toISOString()}));
const r24=rec('FOMO-P003',1440,earlier);
S.planner.journal=[r24];
token.m.updated=now;
P.trackFollowUps();
assert.equal(r24.followUps.find(x=>x.checkpoint==='24h')?.status,'VALIDATED','24h checkpoint should validate in its window');
assert.ok(persists>0,'checkpoint changes must persist');

console.log('24H PAPER checkpoint regression PASS');
