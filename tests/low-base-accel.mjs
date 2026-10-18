import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('function features(t, now) {');
const end=html.indexOf('function baseScores(t, f) {',start);
assert.ok(start>=0&&end>start,'features() code missing');
const code=html.slice(start,end);

const sandbox={
  CFG:{plan:{volMin:2,volMax:30},paper:{size:10,refSize:100}},
  clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
  fomoStats:()=>({b5:0,b15:0,tr15:0,net15:0,last:null}),
  slip:()=>0,
  Math, Object, Number, isFinite
};
vm.createContext(sandbox);
vm.runInContext(code+'\nthis.featuresRef=features;',sandbox);
const features=sandbox.featuresRef;
const now=Date.now();

function token(m){
  return {
    m:{
      created:now-3*60*60*1000,
      price:0.001,
      liq:500000,
      mc:1000000,
      vol:{m5:m.vol5,h1:m.volH1,h24:m.volH1},
      tx:{
        m5:{b:m.tx5b??0,s:m.tx5s??0},
        h1:{b:m.txH1b??0,s:m.txH1s??0},
        h24:{b:m.txH1b??0,s:m.txH1s??0}
      },
      chg:{m5:0,h1:0,h6:0,h24:0}
    },
    hist:[],
    srcLast:{},
    liqPeak:500000
  };
}

// FTR-like sparse base: 1 trade / 1h and ~$1 volume must not look like reliable 12x acceleration.
const sparse=features(token({tx5s:1,txH1s:1,vol5:1.18,volH1:1.18}),now);
assert.equal(sparse.txAccelRaw,12,'preserve raw tx ratio for calibration');
assert.equal(sparse.volAccelRaw,12,'preserve raw volume ratio for calibration');
assert.ok(sparse.txBaseConfidence<0.1,'sparse tx base confidence must be low');
assert.ok(sparse.volBaseConfidence<0.01,'sparse volume base confidence must be very low');
assert.ok(sparse.txAccel<1.2,'sparse tx acceleration must shrink near neutral');
assert.ok(sparse.volAccel<1.01,'sparse volume acceleration must shrink near neutral');
assert.equal(sparse.lowBaseAccel,true,'sparse case must be flagged');

// Real absolute activity should preserve the acceleration signal.
const robust=features(token({tx5b:20,txH1b:120,vol5:2000,volH1:12000}),now);
assert.equal(robust.txBaseConfidence,1);
assert.equal(robust.volBaseConfidence,1);
assert.ok(Math.abs(robust.txAccel-2)<1e-12,'reliable tx acceleration should remain 2x');
assert.ok(Math.abs(robust.volAccel-2)<1e-12,'reliable volume acceleration should remain 2x');
assert.equal(robust.lowBaseAccel,false);

console.log('Low-base acceleration guard regression PASS');
