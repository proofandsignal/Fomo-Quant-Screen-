const {test}=require("node:test");const assert=require("node:assert/strict");const {assess}=require("./profit-risk.js");
const base={entry:100,feePct:0.2,spreadPct:0.2,slippagePct:0.4,fundingPct:0.1,borrowPct:0.1,security:"UNKNOWN"};
test("LONG net reward and loss include costs",()=>{const x=assess({...base,direction:"LONG",target:108,stop:95});assert.equal(x.status,"SCENARIO_ONLY");assert.ok(Math.abs(x.netRewardPct-7)<1e-9);assert.ok(Math.abs(x.netLossPct-6)<1e-9);assert.equal(x.action,"WATCH");});
test("SHORT net reward and loss include costs",()=>{const x=assess({...base,direction:"SHORT",target:88,stop:106});assert.ok(Math.abs(x.netRewardPct-11)<1e-9);assert.ok(Math.abs(x.netLossPct-7)<1e-9);assert.equal(x.feasibility,"NOT_VERIFIED");});
test("invalid stop rejects",()=>assert.equal(assess({...base,direction:"SHORT",target:88,stop:90}).status,"NOT_VERIFIED"));
test("missing fees rejects",()=>assert.equal(assess({...base,direction:"LONG",target:108,stop:95,feePct:undefined}).status,"NOT_VERIFIED"));
test("missing venue never permits short",()=>assert.equal(assess({...base,direction:"SHORT",target:88,stop:106}).action,"WATCH"));
test("verified venue still needs execution review",()=>assert.equal(assess({...base,direction:"SHORT",target:88,stop:106,shortInstrumentVerified:true}).feasibility,"REQUIRES_EXECUTION_REVIEW"));
