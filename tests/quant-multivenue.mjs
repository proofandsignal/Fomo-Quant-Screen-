import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const adapters=require('../quant-market-sources.js');
const profit=require('../quant-profit-calc.js');
const now=Date.parse('2026-11-13T15:30:00Z');
const cases={
 'Kraken':{error:[],result:{XXBTZUSD:{a:['101'],b:['100']}}},
 'Coinbase Exchange':{trade_id:1234,time:'2026-11-13T15:29:58Z',bid:'100',ask:'101'},
 'Gemini':{last:'100.5',bid:'100',ask:'101'},
 'Bybit':{retCode:0,time:now,result:{category:'spot',list:[{symbol:'BTCUSDT',bid1Price:'100',ask1Price:'101'}]}},
 'OKX':{code:'0',data:[{instType:'SPOT',instId:'BTC-USDT',bidPx:'100',askPx:'101',ts:String(now)}]},
 'KuCoin':{code:'200000',data:{bestBid:'100',bestAsk:'101',time:now}},
 'Gate.io':[{currency_pair:'BTC_USDT',highest_bid:'100',lowest_ask:'101'}],
 'Bitfinex':[100,1,101,1,0,0,100.5,100,102,99],
 'HTX':{status:'ok',ch:'market.btcusdt.detail.merged',ts:now,tick:{bid:[100,1],ask:[101,1]}},
 'Crypto.com Exchange':{method:'public/get-tickers',code:0,result:{data:[{i:'BTC_USDT',b:'100',k:'101',t:now}]}}
};
const result=name=>adapters.normalize(name,'BTC',cases[name],now);
test('six exact source adapters and currencies, valid quote data',()=>{
 assert.equal(adapters.NAMES.length,10);
 for(const name of adapters.NAMES){
  const q=result(name);
  assert.equal(q.status,'OBSERVED_QUOTE',name);
  assert.equal(q.bid,100);assert.equal(q.ask,101);
  assert.equal(q.quoteCurrency,['Kraken','Coinbase Exchange','Gemini','Bitfinex'].includes(name)?'USD':'USDT');
  assert.equal(q.economicStatus,'VERIFY');
  assert.equal(q.asset,'BTC');
  assert.match(q.sourceUrl,/^https:\/\//);
 }
});
test('all three allowlisted assets generate exact exchange pair request',()=>{
 for(const symbol of ['BTC','ETH','SOL']){
  for(const name of adapters.NAMES)assert.ok(adapters.urlFor(name,symbol).includes(symbol)
   || (['Gemini','HTX'].includes(name)&&adapters.urlFor(name,symbol).includes(symbol.toLowerCase())));
 }
 assert.throws(()=>adapters.urlFor('Binance','BTC'));
 assert.throws(()=>adapters.urlFor('Kraken','DOGE'));
});
test('crossed, empty, wrong instrument, stale, future, time-free source rejects',()=>{
 assert.throws(()=>adapters.normalize('Kraken','BTC',{error:[],result:{XXBTZUSD:{a:['99'],b:['100']}}},now));
 assert.throws(()=>adapters.normalize('Bybit','BTC',{retCode:0,time:now,result:{category:'linear',list:[{symbol:'BTCUSDT',bid1Price:'100',ask1Price:'101'}]}},now));
 assert.throws(()=>adapters.normalize('OKX','BTC',{code:'0',data:[{instId:'ETH-USDT',instType:'SPOT',bidPx:'100',askPx:'101',ts:now}]},now));
 assert.throws(()=>adapters.normalize('KuCoin','BTC',{code:'200000',data:{bestBid:'100',bestAsk:'101',time:now-200000}},now));
 assert.throws(()=>adapters.normalize('Coinbase Exchange','BTC',{trade_id:123,time:'2099-11-13T15:29:58Z',bid:'100',ask:'101'},now));
});
test('provider failure never falls back to guessed price',async()=>{
 const q=await adapters.fetchOne('Kraken','BTC',async()=>({ok:false,status:451}),()=>now);
 assert.equal(q.status,'VERIFY');assert.equal(q.bid,null);assert.equal(q.ask,null);
 assert.match(q.reason,/451/);
});
test('concurrent six-adapter scan never invents blocked source quotes',async()=>{
 const snapshots=await adapters.scan('BTC',async(url)=> {
  if(url.includes('bybit'))return {ok:false,status:403};
  const name=adapters.NAMES.find(x=>adapters.urlFor(x,'BTC')===url);
  return {ok:true,json:async()=>cases[name]};
 },()=>now);
 assert.equal(snapshots.length,10);
 assert.equal(snapshots.find(x=>x.venue==='Bybit').status,'VERIFY');
 assert.equal(snapshots.filter(x=>x.status==='OBSERVED_QUOTE').length,9);
});
test('long PnL deducts entry and exit taker fees on actual scenario notional',()=>{
 const x=profit.calc({source:result('Kraken'),side:'LONG',notional:1000,
  scenarioExitPrice:110,entryFeeBps:10,exitFeeBps:10,entrySlippageBps:0,exitSlippageBps:0,extraCostQuote:0,nowAt:now});
 const quantity=1000/101,gross=quantity*(110-101);
 const expected=gross-(1000+quantity*110)*.001;
 assert.ok(Math.abs(x.conditionalNetQuote-expected)<1e-9);
 assert.equal(x.verifiedNet,null);assert.equal(x.allowedToTrade,false);
 assert.equal(x.financiallyEligiblePaper,false);
 assert.equal(x.currency,'USD');
 assert.equal(x.status,'VERIFY');
});
test('LONG adverse slippage and break-even solve are internally consistent',()=>{
 const s=result('Bybit');
 const base={source:s,side:'LONG',notional:500,entryFeeBps:20,exitFeeBps:20,
  entrySlippageBps:10,exitSlippageBps:10,extraCostQuote:1,nowAt:now};
 const x=profit.calc({...base,scenarioExitPrice:112});
 const y=profit.calc({...base,scenarioExitPrice:x.breakevenExitQuote});
 assert.ok(Math.abs(y.conditionalNetQuote)<1e-8);
 assert.equal(x.currency,'USDT');
 assert.ok(x.reasonCodes.includes('USDT_NOT_EQUIVALENT_TO_USD'));
});
test('SHORT is proxy only; no borrowing or real short claim',()=>{
 const s=result('Coinbase Exchange');
 const base={source:s,side:'SHORT',notional:1000,entryFeeBps:10,exitFeeBps:10,
  entrySlippageBps:0,exitSlippageBps:0,extraCostQuote:0,nowAt:now};
 const x=profit.calc({...base,scenarioExitPrice:90});
 assert.ok(x.conditionalNetQuote>0);
 assert.ok(x.reasonCodes.includes('SPOT_SHORT_IS_DIRECTIONAL_PROXY_ONLY'));
 const y=profit.calc({...base,scenarioExitPrice:x.breakevenExitQuote});
 assert.ok(Math.abs(y.conditionalNetQuote)<1e-8);
 assert.equal(x.verifiedNet,null);
});
test('invalid, missing fee or stale market snapshot does not become trading signal',()=>{
 const s=result('Kraken');
 const base={source:s,side:'LONG',notional:1000,scenarioExitPrice:120,
  entryFeeBps:10,exitFeeBps:10,entrySlippageBps:0,exitSlippageBps:0,extraCostQuote:0,nowAt:now};
 for(const mod of [{entryFeeBps:''},{notional:0},{scenarioExitPrice:'NaN'},
                   {exitSlippageBps:-1},{extraCostQuote:Infinity}]){
  const r=profit.calc({...base,...mod});
  assert.equal(r.conditionalNetQuote,undefined);
  assert.equal(r.financiallyEligiblePaper,false);
 }
 const later=profit.calc({...base,nowAt:now+600000});
 assert.ok(later.reasonCodes.includes('SOURCE_STALE'));
 assert.equal(later.allowedToTrade,false);
});


test('Kraken exact pair identity rejects venue-side instrument substitution',()=>{
 for(const asset of ['BTC','ETH','SOL']){
  assert.throws(()=>adapters.normalize('Kraken',asset,{error:[],result:{
   'LTCUSD':{a:['101'],b:['100']}
  }},now),/wrong pair/);
 }
 const eth=adapters.normalize('Kraken','ETH',{error:[],result:{
  XETHZUSD:{a:['101'],b:['100']}
 }},now);
 assert.equal(eth.providerSymbol,'XETHZUSD');
 const sol=adapters.normalize('Kraken','SOL',{error:[],result:{
  SOLUSD:{a:['101'],b:['100']}
 }},now);
 assert.equal(sol.providerSymbol,'SOLUSD');
});
test('required exchange timestamps reject null and nonnumeric values, no fallback to retrieval-only',()=>{
 const bad={
  'Coinbase Exchange':{...cases['Coinbase Exchange'],time:'bad'},
  'Bybit':{...cases.Bybit,time:undefined},
  'OKX':{...cases.OKX,data:[{...cases.OKX.data[0],ts:'oops'}]},
  'KuCoin':{...cases.KuCoin,data:{...cases.KuCoin.data,time:null}},
  'HTX':{...cases.HTX,ts:undefined},
  'Crypto.com Exchange':{...cases['Crypto.com Exchange'],
    result:{data:[{...cases['Crypto.com Exchange'].result.data[0],t:undefined}]}}
 };
 for(const [name,payload] of Object.entries(bad))
  assert.throws(()=>adapters.normalize(name,'BTC',payload,now),/timestamp/,name);
});
test('source adapter forbids customer credentials and non-GET calls even on error paths',async()=>{
 const opts=[];
 const req=async(url,options)=>{opts.push({url,options});return {ok:false,status:451};};
 const result=await adapters.scan('BTC',req,()=>now);
 assert.equal(result.length,10);
 assert.equal(opts.length,10);
 for(const {url,options} of opts){
  assert.match(url,/^https:\/\//);
  assert.equal(options.method,'GET');
  assert.equal(options.credentials,'omit');
  assert.equal(options.cache,'no-store');
  assert.equal(options.mode,'cors');
 }
 assert.equal(result.filter(x=>x.status==='OBSERVED_QUOTE').length,0);
});
test('pure calculator stale input, negative/huge input and tampered quotes remain VERIFY',()=>{
 const live=result('Kraken');
 const base={source:live,side:'LONG',notional:1000,scenarioExitPrice:120,
  entryFeeBps:10,exitFeeBps:10,entrySlippageBps:0,exitSlippageBps:0,
  extraCostQuote:0,nowAt:now};
 for(const bad of [
  {nowAt:now+120001},{nowAt:now-1},{source:{...live,bid:102,ask:101}},
  {source:{...live,marketType:'PERP'}},{source:{...live,quoteCurrency:'EUR'}},
  {entryFeeBps:1001},{exitSlippageBps:1001},{notional:1000001},
  {scenarioExitPrice:Infinity},{extraCostQuote:-1}
 ]){
  const out=profit.calc({...base,...bad});
  assert.equal(out.conditionalNetQuote,undefined,JSON.stringify(bad));
  assert.equal(out.allowedToTrade,false);
  assert.equal(out.financiallyEligiblePaper,false);
  assert.equal(out.verifiedNet,null);
 }
});
