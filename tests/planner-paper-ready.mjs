import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('const Planner={');
const end=html.indexOf('/* =====================================================================\n   MAIN CYCLE',start);
assert.ok(start>=0&&end>start,'Planner code missing');
const code=html.slice(start,end);

const controls={
  ppCapital:{value:'10'},
  ppRisk:{value:'1'},
  ppBuffer:{value:'0.05'},
  ppAnalystFile:{value:''},
  ppRecordId:{value:''}
};
const S={
  sel:'solana:ABC123',
  tokens:new Map(),
  planner:{analyst:null,analystExtract:null,analystKey:null,plan:null,latestSnapshot:null,journal:[],observations:[]}
};
const token={
  key:'solana:ABC123', chain:'solana', address:'ABC123', symbol:'TEST',
  decision:'ALLOW PAPER', entryState:'IN ZONE',
  m:{price:0.001,liq:100000,mc:500000},
  f:{volUnit:3},
  s:{radar:82,copy:75,risk:40,ess:70},
  securityGate:{status:'PASS'},
  reasons:[]
};
S.tokens.set(token.key,token);

const downloads=[];
const sandbox={
  S,
  CFG:{
    gates:{minLiq:40000,minCopy:50},
    paper:{feePct:0.3},
    plan:{slMult:2,slMin:6,slMax:25}
  },
  securityGateOf:t=>t.securityGate||{status:'UNKNOWN'},
  qsDirection:t=>'LONG',
  slip:(size,liq)=>0.5,
  clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
  $:sel=>controls[sel.replace('#','')]||null,
  toast:()=>{},
  Log:{add:()=>{}},
  persist:()=>{},
  download:(name,body)=>downloads.push({name,body}),
  VERSION:'0.3.3-test',
  TextEncoder,
  crypto:webcrypto,
  isFinite,
  Date,
  Object,
  Array,
  Number,
  String,
  Math,
  JSON,
  RegExp,
  console
};
vm.createContext(sandbox);
vm.runInContext(code+'\nthis.PlannerRef=Planner;',sandbox,{timeout:1500});
const P=sandbox.PlannerRef;
P.render=()=>{};

const analyst={
  source:'FOMO Analyst Agent',
  analysis:{
    contract:'ABC123',
    direction:'LONG',
    confidence:72,
    decision:'ALLOW PAPER'
  }
};
const ax=P.extract(analyst);
assert.equal(ax.contract,'ABC123','Analyst contract extraction');
assert.equal(ax.direction,'LONG','Analyst direction extraction');
assert.equal(ax.confidence,72,'Analyst confidence extraction');
assert.equal(ax.decision,'ALLOW PAPER','Analyst decision extraction');
S.planner.analyst=analyst;
S.planner.analystExtract=ax;
S.planner.analystKey=token.key;


// Fail-closed negative regression: unknown security, invalid entry and weak Analyst approval.
token.securityGate={status:'UNKNOWN'};
assert.notEqual(P.gate(token).status,'ALLOW PAPER','UNKNOWN security must not authorize PAPER');
token.securityGate={status:'PASS'};
token.entryState='OUT OF ZONE';
assert.notEqual(P.gate(token).status,'ALLOW PAPER','out-of-zone entry must not authorize PAPER');
token.entryState='IN ZONE';
S.planner.analystExtract={...ax,decision:'WATCH'};
assert.notEqual(P.gate(token).status,'ALLOW PAPER','Analyst LONG without explicit ALLOW PAPER must not authorize PAPER');
S.planner.analystExtract=ax;
token.decision='WATCH';
assert.notEqual(P.gate(token).status,'ALLOW PAPER','Quant WATCH must not authorize PAPER');
token.decision='ALLOW PAPER';

assert.equal(P.gate(token).status,'ALLOW PAPER','valid Quant + Analyst must pass gate');
P.build();
let plan=S.planner.plan;
assert.equal(plan.decision,'ALLOW PAPER','valid setup should build ALLOW PAPER plan');
assert.equal(plan.capitalUsd,10);
assert.equal(plan.maxNetLossUsd,1);
assert.equal(plan.maxHoldHours,24);
assert.ok(Math.abs(plan.risk.stopPct-7.9)<1e-9,'0.5% in/out slip + fees + buffer => 7.9% stop');
assert.ok(plan.risk.netLossUsd<=1.0000001,'modeled net loss must not exceed $1');
assert.deepEqual(Array.from(plan.targets.levels,x=>x.pct),[15,30,50],'quality tier target ladder');
assert.equal(plan.targets.runnerFrac,0.2);

S.planner.analystExtract={...ax,direction:'SHORT'};
assert.equal(P.gate(token).status,'REJECT','direction conflict must reject');

S.planner.analystExtract=ax;
const originalSlip=sandbox.slip;
sandbox.slip=()=>5;
P.build();
plan=S.planner.plan;
assert.equal(plan.decision,'REJECT','execution cost that consumes risk budget must reject');
assert.ok(plan.gate.reasons.includes('risk budget too small for structural stop'));

sandbox.slip=originalSlip;
S.planner.analyst=null;
S.planner.analystExtract=null;
S.planner.analystKey=null;
assert.equal(P.gate(token).status,'WATCH','missing Analyst must not become ALLOW PAPER');
P.build();
assert.equal(S.planner.plan.decision,'WATCH','missing Analyst preview should remain WATCH');
P.exportCurrent();
assert.equal(downloads.length,1,'WATCH plan must export evidence JSON');
const watchExport=JSON.parse(downloads[0].body);
assert.equal(watchExport.status,'UNLOCKED_PLAN_EVIDENCE');
assert.equal(watchExport.immutable,false);
assert.equal(watchExport.positionPlan.decision,'WATCH');
assert.equal(watchExport.observationId,'FOMO-OBS-001','WATCH evidence gets observation ID');
assert.equal(watchExport.recordType,'OBSERVATION');
assert.equal(S.planner.observations.length,1,'observation journal stores export');
P.exportCurrent();
assert.equal(S.planner.observations.length,1,'repeat export must not duplicate observation record');

S.planner.plan={token:{key:token.key},decision:'WATCH'};
await P.lock();
assert.equal(S.planner.journal.length,0,'WATCH snapshot must not lock');

sandbox.slip=originalSlip;
S.planner.analyst=analyst;
S.planner.analystExtract=ax;
S.planner.analystKey=token.key;
P.build();
await P.lock();
assert.equal(S.planner.journal.length,1,'ALLOW PAPER snapshot should lock');
assert.equal(S.planner.journal[0].original.testId,'FOMO-P001','locked PAPER gets canonical FOMO-Pxxx ID');
assert.equal(S.planner.journal[0].original.recordType,'PAPER');
assert.equal(S.planner.journal[0].sha256.length,64,'snapshot requires SHA-256');
assert.equal(S.planner.journal[0].original.positionPlan.capitalUsd,10);
assert.equal(S.planner.journal[0].original.positionPlan.maxNetLossUsd,1);
await P.lock();
assert.equal(S.planner.journal.length,1,'repeat lock must not create duplicate PAPER record');
controls.ppRecordId.value='FOMO-P001';
assert.throws(()=>P.resolveRecordId('paper'),/Duplicate RECORD ID/,'duplicate manual ID must be blocked');
controls.ppRecordId.value='';

console.log('FOMO Position Planner PAPER-READY regression PASS');
