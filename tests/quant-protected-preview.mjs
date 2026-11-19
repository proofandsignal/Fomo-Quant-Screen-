/* Protected Quant preview gates, entirely loopback and synthetic credentials.
 * No deployment or live market endpoint calls.
 */
import test, {beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewServer} from '../preview/quant-protected/server.mjs';

const user='internal_qa', password='example-only-not-live-secret-56-strong';
let server,url;
const authorization='Basic '+Buffer.from(user+':'+password).toString('base64');
const request=async(path,options={})=>fetch(url+path,{...options,redirect:'manual'});

beforeEach(async()=>{
  server=createPreviewServer({username:user,password,allowHttpLocal:true});
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',resolve);
  });
  url='http://127.0.0.1:'+server.address().port;
});
afterEach(async()=>{await new Promise(resolve=>server.close(resolve));});

test('cannot start unprotected, weak or external-client preview',()=>{
 for(const cfg of [{},{username:'qa',password:'weak'},{
  username:'qa',password:'a'.repeat(15)
 }])assert.throws(()=>createPreviewServer(cfg),/requires/);
 assert.throws(()=>createPreviewServer({username:user,password,audience:'public'}),/license-locked/);
 assert.throws(()=>createPreviewServer({username:user,password,audience:'client'}),/license-locked/);
 assert.throws(()=>createPreviewServer({username:user,password,profile:'live'}),/license-locked/);
});
test('denies all public artifact reads without strong credentials',async()=>{
 const paths=['/', '/index.html', '/quant-market-lab.html',
  '/quant-market-sources.js','/quant-profit-calc.js','/quant-market-lab.js',
  '/premium-demo.html','/premium-demo-engine.js','/premium-demo-ui.js'];
 for(const [i,path] of paths.entries()){
  const r=await request(path);
  if(i<8){
    assert.equal(r.status,401,path);
    assert.match(r.headers.get('www-authenticate')||'',/Basic realm=/);
  }else{
    assert.equal(r.status,429,'ninth failed attempt must be throttled');
    assert.equal(r.headers.get('retry-after'),'60');
  }
  assert.doesNotMatch(await r.text(),/FOMO QUANT SCREEN|function calc|No orders/i);
 }
});
test('fails closed on incorrect basic authentication',async()=>{
 const bad='Basic '+Buffer.from(user+':invalid').toString('base64');
 const r=await request('/quant-market-lab.html',{headers:{Authorization:bad}});
 assert.equal(r.status,401);
 const other='Bearer something';
 const r2=await request('/index.html',{headers:{Authorization:other}});
 assert.equal(r2.status,401);
});
test('authenticated client accesses exact same-origin Quant and Calculator assets',async()=>{
 const H={Authorization:authorization};
 for(const path of ['/','/premium-demo.html','/premium-demo-engine.js','/premium-demo-ui.js',
  '/index.html?mode=sim','/quant-market-lab.html',
  '/quant-market-sources.js','/quant-profit-calc.js','/quant-market-lab.js',
  '/derivatives-shadow.js']){
  const r=await request(path,{headers:H});
  assert.equal(r.status,200,path);
  assert.match(r.headers.get('cache-control'),/no-store/);
  assert.equal(r.headers.get('x-frame-options'),'DENY');
  assert.equal(r.headers.get('x-robots-tag'),'noindex, nofollow, noarchive');
  assert.ok((await r.text()).length>70,path);
 }
 const a=await request('/quant-market-lab.html',{headers:H});
 assert.match(a.headers.get('content-security-policy'),/script-src 'self'/);
 assert.match(a.headers.get('content-security-policy'),/connect-src 'none'/);
 assert.equal(a.headers.get('x-quant-preview-profile'),'SYNTHETIC_ONLY');
 assert.match(await a.text(),/name="quant-preview-mode" content="synthetic"/);
 const root=await request('/',{headers:H});
 assert.equal(root.status,200,'private preview root must be Premium English, not legacy index');
 const premiumBody=await root.text();
 assert.match(premiumBody,/<html lang="en">/);
 assert.match(premiumBody,/id="explore-cta"/);
 assert.match(premiumBody,/Created by Proof &amp; Signal/);
 assert.doesNotMatch(premiumBody,/id="quantProfitLauncher"/);
 const premiumCsp=root.headers.get('content-security-policy');
 assert.match(premiumCsp,/connect-src 'none'/);
 assert.match(premiumCsp,/script-src 'self';/);
 assert.doesNotMatch(premiumCsp,/script-src[^;]*unsafe-inline/);
 const premiumJs=await request('/premium-demo-engine.js',{headers:H});
 assert.equal(premiumJs.status,200);
 assert.match(await premiumJs.text(),/SYNTHETIC_FIXTURE/);
 const live=await request('/index.html?mode=live',{headers:H});
 assert.equal(live.status,302);
 assert.match(a.headers.get('content-security-policy'),/form-action 'none'/);
 const main=await request('/index.html?mode=sim',{headers:H});
 assert.match(await main.text(),/id="quantProfitLauncher"/);
 const calc=await request('/quant-market-lab.html',{headers:H});
 assert.match(await calc.text(),/Profit Calculator/);
});
test('protected preview Derivatives navigation points to a served, synthetic Quant panel',async()=>{
 const H={Authorization:authorization};
 const market=await request('/quant-market-lab.html',{headers:H});
 const html=await market.text();
 assert.match(html,/href="\.\/index\.html\?mode=sim#bybitShadowPanel"/);
 assert.doesNotMatch(html,/href="\.\/bybit-shadow-preview\.html"/);
 const main=await request('/index.html?mode=sim',{headers:H});
 assert.equal(main.status,200);
 assert.match(await main.text(),/id="bybitShadowPanel"/);
});

test('protected server never publishes source, private files or credential handling',async()=>{
 const H={Authorization:authorization};
 for(const path of ['/README.md','/docs/QUANT_INDEPENDENT_REVIEW_HANDOFF_2026-11-15.md',
   '/.git/config','/.env','/preview/quant-protected/server.mjs','/tests/quant-multivenue.mjs']){
  const r=await request(path,{headers:H});
  assert.equal(r.status,404,path);
 }
 const r=await request('/quant-market-lab.html',{method:'POST',headers:H});
 assert.equal(r.status,405);
});
test('HTTPS mandatory outside explicit loopback QA setting',async()=>{
 const s=createPreviewServer({username:user,password});
 await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));
 try{
  const endpoint='http://127.0.0.1:'+s.address().port+'/index.html';
  const r=await fetch(endpoint,{headers:{Authorization:authorization}});
  assert.equal(r.status,403);
  assert.equal(await r.text(),'HTTPS required\n');
  const spoof=await fetch(endpoint,{headers:{
    Authorization:authorization,'X-Forwarded-Proto':'https'
  }});
  assert.equal(spoof.status,403,'untrusted direct clients cannot spoof HTTPS');
 }finally{await new Promise(resolve=>s.close(resolve));}
});
test('trusted proxy mode rejects invalid Render hostname and loopback X-Forwarded-Proto spoofing',async()=>{
 assert.throws(
   ()=>createPreviewServer({username:user,password,trustProxyHttps:true}),
   /validated RENDER_EXTERNAL_HOSTNAME/
 );
 assert.throws(
   ()=>createPreviewServer({username:user,password,trustProxyHttps:true,renderHostname:'attacker.example'}),
   /validated RENDER_EXTERNAL_HOSTNAME/
 );
 const s=createPreviewServer({username:user,password,trustProxyHttps:true,
  renderHostname:'fomo-qa.onrender.com'});
 await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));
 try{
  const endpoint='http://127.0.0.1:'+s.address().port+'/premium-demo.html';
  const resp=await fetch(endpoint,{headers:{
    Host:'fomo-qa.onrender.com',Authorization:authorization,
    'X-Forwarded-Proto':'https','X-Forwarded-For':'198.51.100.42'
  }});
  assert.equal(resp.status,403,'forged localhost proxy TLS headers cannot enable external access');
 } finally { await new Promise(resolve=>s.close(resolve)); }
});
test('IP header rotation and intermittent correct login cannot reset global failure budget',async()=>{
 const bad='Basic '+Buffer.from(user+':invalid').toString('base64');
 for(let i=0;i<7;i++){
  const wrong=await request('/premium-demo.html',{headers:{
    Authorization:bad,'X-Forwarded-For':'198.51.100.'+(i+1),
    'X-Forwarded-Proto':i%2?'https':'http'
  }});
  assert.equal(wrong.status,401,'wrong password attempt '+i);
  const good=await request('/',{headers:{
    Authorization:authorization,'X-Forwarded-For':'203.0.113.'+(i+1)
  }});
  assert.equal(good.status,200,'prior correct login must not reset accumulated failures');
 }
 const last=await request('/premium-demo.html',{headers:{
    Authorization:bad,'X-Forwarded-For':'198.51.100.99'
 }});
 assert.equal(last.status,401);
 const locked=await request('/',{headers:{
    Authorization:authorization,'X-Forwarded-For':'203.0.113.123'
 }});
 assert.equal(locked.status,429,'eighth failed login triggers per-instance fail-closed lock');
 assert.equal(locked.headers.get('retry-after'),'60');
});
test('health route discloses no service credentials or user data',async()=>{
 const r=await request('/healthz');
 assert.equal(r.status,200);
 assert.equal(await r.text(),'OK\n');
 assert.equal(r.headers.get('cache-control').includes('no-store'),true);
});

test('brute-force throttling denies repeated unknown clients without revealing protected assets',async()=>{
 for(let i=0;i<8;i++){
  const r=await request('/quant-market-lab.html',{
   headers:{Authorization:'Basic '+Buffer.from('attacker:wrong'+i).toString('base64')}
  });
  assert.equal(r.status,401);
 }
 const blocked=await request('/quant-market-lab.html',{headers:{Authorization:authorization}});
 assert.equal(blocked.status,429);
 assert.equal(blocked.headers.get('retry-after'),'60');
 assert.doesNotMatch(await blocked.text(),/Market Sources|Calculator/);
});


test('FOMO original Planner and new addon are exact real assets gated by Basic Auth',async()=>{
 const routes=[
  ['/index.html?mode=sim','index.html'],
  ['/fomo-trade-ui.js','fomo-trade-ui.js'],
  ['/premium-demo-engine.js','premium-demo-engine.js']
 ];
 const {readFileSync}=await import('node:fs');
 for(const [path,name] of routes){
  const denied=await request(path);
  assert.equal(denied.status,401,'must deny original asset without credentials: '+path);
  const approved=await request(path,{headers:{Authorization:authorization}});
  assert.equal(approved.status,200,'must serve real original asset only with credentials: '+path);
  assert.match(approved.headers.get('content-security-policy')||'',/connect-src 'none'/);
  assert.equal(approved.headers.get('x-quant-preview-profile'),'SYNTHETIC_ONLY');
  assert.match(approved.headers.get('cache-control')||'',/no-store/);
  const raw=await approved.text();
  assert.equal(raw,readFileSync(new URL('../'+name,import.meta.url),'utf8'),
   'served byte-for-byte original application source, no stub: '+name);
  if(name==='index.html'){
   assert.match(raw,/id="positionPlannerPanel"/);
   assert.match(raw,/id="fomoTradePanel"/);
   assert.match(raw,/src="fomo-trade-ui\.js"/);
  }
 }
});
