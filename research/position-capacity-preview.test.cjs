'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'position-capacity-preview.html'),'utf8');
const m=html.match(/<script>\s*([\s\S]*?)<\/script>/);
function setup(){
 assert.ok(m,'expected a standalone inline script');
 const elems={},handlers={};const inputs={size:'100',target:'12',stop:'6',fee:'.3',slip:'.5',funding:'.2'};
 function element(id){return elems[id]??(elems[id]={id,value:inputs[id]||'',textContent:'',innerHTML:'',dataset:{},addEventListener:(ev,fn)=>{handlers[id+':'+ev]=fn},setAttribute(k,v){this[k]=v}})}
 const buttons=['0DAY','PUSSY','José'].map(id=>({dataset:{id},addEventListener(ev,fn){handlers[id+':'+ev]=fn},setAttribute(k,v){this[k]=v}}));
 const document={getElementById:element,querySelectorAll:selector=>selector==='[data-id]'?buttons:[],createElement:tag=>({click(){},set href(v){},set download(v){}})};
 const ctx=vm.createContext({document,console,Number,String,Object,Math,Date,JSON,Error,Array,Blob,URL,setTimeout});
 new vm.Script(m[1],{filename:'position-capacity-preview.html'}).runInContext(ctx);
 return {ctx,element,handlers,buttons};
}
test('standalone premium UI bootstraps three observations and both directions',()=>{const x=setup();assert.match(x.element('record-id').textContent,/R048.*OBS-039/);assert.match(x.element('long-card').innerHTML,/NOT VERIFIED/);assert.match(x.element('short-card').innerHTML,/short availability unverified/);assert.match(x.element('liq-chart').innerHTML,/PUSSY/);assert.match(x.element('slip-chart').innerHTML,/José/)});
test('observation switch preserves original SHORT as research, not executed',()=>{const x=setup();x.handlers['PUSSY:click']();assert.match(x.element('record-info').textContent,/Original Quant SHORT/);assert.match(x.element('decision').innerHTML,/WATCH/);assert.match(x.element('short-card').innerHTML,/NOT VERIFIED/)});
test('synthetic scenario knobs recalculate costs and net but never executable capacity',()=>{const x=setup();const before=x.element('scenario-long').innerHTML;x.element('size').value='200';x.handlers['size:input']();const after=x.element('scenario-long').innerHTML;assert.notEqual(after,before);assert.match(after,/Hypothetical NET/);assert.match(after,/NOT VERIFIED/);assert.match(x.element('waterfall').innerHTML,/Funding \/ borrow/)});
test('unsupported export is rejected',()=>{const x=setup();const normalize=vm.runInContext('normalizeExport',x.ctx);assert.throws(()=>normalize({schema:'random'}),/Unsupported/);assert.throws(()=>normalize({schema:'fomo.position-plan-export.v0.3',recordType:'OBSERVATION',observationId:'X',token:{},quant:{market:{price:-1,liq:10},features:{slipRef:1}}}),/Invalid/)});
test('supported observation import retains unknown research status and no extra gate',()=>{const x=setup();const normalize=vm.runInContext('normalizeExport',x.ctx);const d=normalize({schema:'fomo.position-plan-export.v0.3',recordType:'OBSERVATION',observationId:'FOMO-OBS-051',exportedAt:'2026-11-09T05:00:00Z',token:{symbol:'<img onerror=alert(1)>',address:'MINT',pair:'POOL',dex:'raydium'},quant:{market:{price:1,liq:200,chg:{h1:2,h24:5}},features:{slipRef:1}},analyst:{originalQuant:{direction:'SHORT'}}});assert.equal(d.rid,'UNASSIGNED IMPORT');assert.equal(d.watch,'WATCH');assert.equal(d.original,'SHORT')});
test('no network fetches or trading API and mobile breakpoint exists',()=>{assert.doesNotMatch(html,/\bfetch\s*\(|\bWebSocket\s*\(|\beth_requestAccounts\b|\bcreateOrder\s*\(/);assert.match(html,/@media\(max-width:790px\)/);assert.match(html,/Claim source ≠ verification source/);assert.match(html,/PAPER 0\/50/);assert.match(html,/LIVE LOCKED/)});
