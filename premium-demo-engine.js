/* FOMO Premium Demo — deterministic synthetic-only education, never trade authorization. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.FomoPremiumDemo=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const PRESETS=Object.freeze({
   breakout:Object.freeze({name:'Early momentum',asset:'DEMO-A',stage:'EARLY SIGNAL',
     price:102.40,entry:103.00,stop:97.00,target:115.00,
     momentum:78,liquidity:74,concentration:22,quality:71,
     freshness:'SIMULATED',risk:'UNKNOWN',decision:'WATCH',
     signal:'Momentum is rising, but independent token-security evidence is not available.',
     why:'Evidence missing — observation is not permission to enter.'}),
   concentration:Object.freeze({name:'Holder concentration',asset:'DEMO-B',stage:'SECURITY REVIEW',
     price:54.20,entry:55.00,stop:51.00,target:63.00,
     momentum:84,liquidity:65,concentration:68,quality:36,
     freshness:'SIMULATED',risk:'REVIEW',decision:'REVIEW',
     signal:'Synthetic holder concentration exceeds the configured review threshold.',
     why:'Concentration risk — keep PAPER authorization closed.'}),
   chase:Object.freeze({name:'Late chase',asset:'DEMO-C',stage:'TOO LATE',
     price:141.00,entry:118.00,stop:109.00,target:133.00,
     momentum:92,liquidity:57,concentration:31,quality:42,
     freshness:'SIMULATED',risk:'REVIEW',decision:'NO TRADE',
     signal:'A move above the modeled chase limit makes this an unfavorable entry.',
     why:'Entry timing fails — never retroactively turn a missed trade into a fill.'}),
   stale:Object.freeze({name:'Stale evidence',asset:'DEMO-D',stage:'DATA BLOCKED',
     price:88.30,entry:89.00,stop:82.00,target:104.00,
     momentum:63,liquidity:39,concentration:12,quality:19,
     freshness:'STALE FIXTURE',risk:'UNKNOWN',decision:'BLOCKED',
     signal:'The example market snapshot is deliberately stale.',
     why:'Missing freshness — no new entry or PAPER record is authorized.'}),
   perpsLong:Object.freeze({name:'FOMO perp LONG',asset:'DEMO-L',stage:'PERPS RESEARCH',
     price:100,entry:100,stop:94,target:112,tradeMode:'FOMO PERPS',side:'LONG',leverage:3,
     momentum:79,liquidity:67,concentration:18,quality:58,
     freshness:'SIMULATED',risk:'UNKNOWN',decision:'WATCH',
     signal:'Hypothetical momentum case. FOMO perp listing, margin and fees are not verified.',
     why:'LONG availability and collateral requirements in FOMO remain unverified.'}),
   perpsShort:Object.freeze({name:'FOMO perp SHORT',asset:'DEMO-S',stage:'PERPS RESEARCH',
     price:100,entry:100,stop:108,target:88,tradeMode:'FOMO PERPS',side:'SHORT',leverage:2,
     momentum:37,liquidity:64,concentration:27,quality:54,
     freshness:'SIMULATED',risk:'UNKNOWN',decision:'REVIEW',
     signal:'Hypothetical decline scenario. A spot meme token does not imply a FOMO SHORT market.',
     why:'SHORT listing, borrow/funding, liquidation and account eligibility are unknown.'})
 });

 // Shared FOMO-specific what-if model. Pure local function; no execution or PAPER writes.
 function modelTrade(i){
  if(!i||typeof i!=='object'||Array.isArray(i))throw Error('INVALID_INPUT');
  if(!['SPOT','PERPS_LONG','PERPS_SHORT'].includes(i.mode))throw Error('INVALID_FOMO_MODE');
  const perp=i.mode!=='SPOT',direction=i.mode==='PERPS_SHORT'?-1:1;
  const val=(name,min,max)=>{const n=i[name];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error('INVALID_'+name.toUpperCase());return n;};
  const n=val('notional',.01,1e6),entry=val('entry',1e-16,1e12),
   exit=val('exit',1e-16,1e12),stop=val('stop',1e-16,1e12),
   leverage=val('leverage',1,20),fomoFeeBps=val('fomoFeeBps',0,1000),
   protocolFeeBps=val('protocolFeeBps',0,1000),
   slippageRoundTripBps=val('slippageRoundTripBps',0,5000),
   fundingCostBps=val('fundingCostBps',0,1000),
   networkCostUsd=val('networkCostUsd',0,10000);
  if(direction===1&&stop>=entry||direction===-1&&stop<=entry)throw Error('INVALID_STOP_DIRECTION');
  if(!perp&&(leverage!==1||protocolFeeBps!==0||fundingCostBps!==0))throw Error('SPOT_PERP_MIX');
  const qty=n/entry,ev=qty*exit,sv=qty*stop,
   fomoEntry=n*fomoFeeBps/1e4,fomoExit=ev*fomoFeeBps/1e4,
   protoEntry=perp?n*protocolFeeBps/1e4:0,protoExit=perp?ev*protocolFeeBps/1e4:0,
   slip=n*slippageRoundTripBps/1e4,funding=perp?n*fundingCostBps/1e4:0,
   fees=fomoEntry+fomoExit+protoEntry+protoExit,costs=fees+slip+funding+networkCostUsd,
   gross=direction*(ev-n),net=gross-costs,
   stopCost=(n+sv)*(fomoFeeBps+protocolFeeBps)/1e4+slip+funding+networkCostUsd,
   stopNet=direction*(sv-n)-stopCost,
   entryRate=(fomoFeeBps+protocolFeeBps+slippageRoundTripBps)/1e4,
   exitRate=(fomoFeeBps+protocolFeeBps)/1e4,
   breakeven=(n*(direction+entryRate)+funding+networkCostUsd)/(qty*(direction-exitRate)),
   margin=perp?n/leverage:n;
  if(![qty,ev,sv,fees,costs,gross,net,stopNet,breakeven,margin,net/n*100].every(Number.isFinite)||breakeven<=0)throw Error('NONFINITE_FINANCIAL_RESULT');
  const f=x=>Number(x.toFixed(4));
  return Object.freeze({schema:'proofandsignal.fomo.trade-plan.synthetic.v1',
   market:'FOMO',mode:i.mode,side:i.mode==='SPOT'?'BUY_THEN_SELL':i.mode==='PERPS_LONG'?'LONG':'SHORT',
   notional:n,entry,exit,stop,leverage,quantity:Number(qty.toPrecision(12)),
   hypotheticalGross:f(gross),hypotheticalCosts:f(costs),hypotheticalNet:f(net),
   hypotheticalStopNet:f(stopNet),hypotheticalBreakEven:Number(breakeven.toPrecision(12)),
   margin:f(margin),roiNotionalPct:f(net/n*100),
   roiMarginPct:perp?f(net/margin*100):null,
   assumedCosts:Object.freeze({fomoEntryFee:f(fomoEntry),fomoExitFee:f(fomoExit),
    protocolEntryFee:f(protoEntry),protocolExitFee:f(protoExit),slippage:f(slip),
    funding:f(funding),network:f(networkCostUsd)}),
   assumptions:Object.freeze({fomoFeeBps,protocolFeeBps,slippageRoundTripBps,fundingCostBps,networkCostUsd}),
   fomoMarketVerified:false,feesVerified:false,sourceVerified:false,
   liquidationVerified:false,liquidationPrice:null,verificationTier:'HYPOTHETICAL_ONLY',
   verifiedNet:null,realizedPnL:null,paperEligible:false,allowedToTrade:false,executedOrders:0,
   note:'No live FOMO market, authorized execution or realized profit evidence.'});
 }
 function evaluate(name,capital){
   const p=PRESETS[name];
   if(!p)throw Error('Unknown synthetic scenario');
   if(typeof capital!=='number'||!Number.isFinite(capital)||capital<=0||capital>1000000)
     throw Error('Invalid hypothetical notional');
   const mode=p.tradeMode||'FOMO SPOT',side=p.side||'BUY',leverage=p.leverage||1;
   const entry=p.entry,quantity=capital/entry,dir=side==='SHORT'?-1:1;
   const gross=dir*quantity*(p.target-entry);
   const risk=dir*quantity*(entry-p.stop);
   const fomoEntryFee=capital*5/10000, fomoExitFee=quantity*p.target*5/10000;
   const protocolEntryFee=mode==='FOMO PERPS'?capital*3/10000:0;
   const protocolExitFee=mode==='FOMO PERPS'?quantity*p.target*3/10000:0;
   const slippage=capital*16/10000, funding=mode==='FOMO PERPS'?capital*4/10000:0;
   const costs=fomoEntryFee+fomoExitFee+protocolEntryFee+protocolExitFee+slippage+funding;
   const net=gross-costs;
   const isStale=p.freshness!=='SIMULATED';
   return {
     schema:'proofandsignal.fomo.premium.synthetic.v1',scenario:name,
     label:p.name,asset:p.asset,stage:p.stage,decision:p.decision,
     signal:p.signal,why:p.why,price:p.price,entry:p.entry,stop:p.stop,target:p.target,
     quality:p.quality,momentum:p.momentum,liquidity:p.liquidity,
     concentration:p.concentration,security:p.risk,freshness:p.freshness,
     notional:capital,tradeMode:mode,side,leverage,
     assumedMargin:Number((capital/leverage).toFixed(2)),
     assumedFomoFeeBpsPerSide:5,assumedProtocolFeeBpsPerSide:mode==='FOMO PERPS'?3:0,
     assumedSlippageBpsRoundTrip:16,assumedFundingCostBps:mode==='FOMO PERPS'?4:0,
     hypotheticalGross:isStale?null:Number(gross.toFixed(2)),
     hypotheticalCosts:isStale?null:Number(costs.toFixed(2)),
     hypotheticalNet:isStale?null:Number(net.toFixed(2)),
     hypotheticalRisk:isStale?null:Number(risk.toFixed(2)),
     rr:isStale?null:Number((Math.abs(p.target-entry)/Math.abs(entry-p.stop)).toFixed(2)),
     fomoMarketVerified:false,listingStatus:'FOMO_AVAILABILITY_UNVERIFIED',
     liquidationVerified:false,
     inputSources:Object.freeze([
       'FOMO: NOT CONNECTED','CoinGecko: NOT CONNECTED',
       'DEX Screener: NOT CONNECTED','X: NOT CONNECTED'
     ]),
     sourceType:'SYNTHETIC_FIXTURE',
     sourceVerified:false,paperEligible:false,allowedToTrade:false,
     verifiedNet:null,executedOrders:0,
     safety:isStale?'BLOCKED':'RESEARCH_ONLY',
     notes:'All prices, fees, funding and leverage are fictional cost assumptions; no actual FOMO market, live data, market eligibility, liquidation or executed profit is verified.'
   };
 }
 return Object.freeze({evaluate,modelTrade,names:Object.freeze(Object.keys(PRESETS))});
});
