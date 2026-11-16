import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=fs.readFileSync('index.html','utf8');
const begin=html.indexOf('function birdeyeSecurityEvidence(d,t,ts=Date.now()){');
const end=html.indexOf('\nfunction download(',begin);
assert.ok(begin>=0&&end>begin,'exact-source Birdeye normalizer and gate are required');
const ctx={Date,Number,Object,String,Math,RegExp};
vm.createContext(ctx);
vm.runInContext(html.slice(begin,end),ctx,{timeout:1500});
const {birdeyeSecurityEvidence:normalize,securityGateOf:gate}=ctx;
const token={chain:'solana',address:'ABC123'};
const now=Date.now();
const base={
  freezeable:null,freezeAuthority:null,ownerAddress:null,
  top10HolderPercent:0.10,mutableMetadata:false,transferFeeEnable:false
};
function status(raw, ts=now, tok=token){
  const t={...tok,sec:normalize(raw,tok,ts)};
  return {state:gate(t).status, evidence:t.sec};
}
assert.equal(status(base).state,'PASS','documented explicit null authorities can be inactive when all other required fields are observed');
assert.equal(status({...base,freezeable:false}).state,'PASS','explicit false freeze flag');
assert.equal(status({...base,freezeable:true}).state,'FAIL','active freeze flag');
assert.equal(status({...base,freezeAuthority:'11111111111111111111111111111111'}).state,'FAIL','active freeze authority address');
assert.equal(status({...base,ownerAddress:'11111111111111111111111111111111'}).state,'FAIL','active mint authority address');
assert.equal(status({...base,top10HolderPercent:0.45}).state,'REVIEW','fraction must normalize to 45%');
assert.equal(status({...base,transferFeeEnable:true}).state,'REVIEW','Token-2022 transfer-fee signal');
assert.equal(status({...base,mutableMetadata:true}).state,'REVIEW','mutable metadata');
for(const [name,raw] of [
  ['absent freezeAuthority',({...base,freezeAuthority:undefined})],
  ['wrong freezeAuthority',({...base,freezeAuthority:123})],
  ['absent ownerAddress',({...base,ownerAddress:undefined})],
  ['absent transfer fee',({...base,transferFeeEnable:undefined})],
  ['unknown transfer fee',({...base,transferFeeEnable:null})],
  ['unknown metadata',({...base,mutableMetadata:null})],
  ['missing concentration',({...base,top10HolderPercent:undefined})],
  ['invalid concentration > 1',({...base,top10HolderPercent:1.1})],
  ['invalid negative concentration',({...base,top10HolderPercent:-0.3})],
  ['string concentration',({...base,top10HolderPercent:'0.1'})]
]){
  if(name.startsWith('absent ')){const key={'absent freezeAuthority':'freezeAuthority','absent ownerAddress':'ownerAddress','absent transfer fee':'transferFeeEnable'}[name];delete raw[key];}
  assert.equal(status(raw).state,'UNKNOWN',name+' must fail closed');
}
assert.equal(status(base,now-16*60000).state,'UNKNOWN','stale retrieval');
assert.equal(status(base,now+60000).state,'UNKNOWN','future retrieval');
assert.equal(status(base,now,{chain:'ethereum',address:'ABC123'}).state,'UNKNOWN','unreviewed other chain');
let mismatched={...token,sec:normalize(base,token,now),address:'WRONG'};
assert.equal(gate(mismatched).status,'UNKNOWN','token identity mismatch');
assert.equal(status(base).evidence.top10,10,'fraction 0.1 becomes 10%');
console.log('Birdeye exact-source security contract regression PASS');
