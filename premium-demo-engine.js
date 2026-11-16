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
     why:'Missing freshness — no new entry or PAPER record is authorized.'})
 });
 function evaluate(name,capital){
   const p=PRESETS[name];
   if(!p)throw Error('Unknown synthetic scenario');
   if(typeof capital!=='number'||!Number.isFinite(capital)||capital<=0||capital>1000000)
     throw Error('Invalid hypothetical notional');
   const entry=p.entry,quantity=capital/entry,fees=capital*.0012+(quantity*p.target)*.0012;
   const gross=quantity*(p.target-entry);
   const net=gross-fees-capital*.0016;
   const risk=quantity*(entry-p.stop);
   const isStale=p.freshness!=='SIMULATED';
   return {
     schema:'proofandsignal.fomo.premium.synthetic.v1',scenario:name,
     label:p.name,asset:p.asset,stage:p.stage,decision:p.decision,
     signal:p.signal,why:p.why,price:p.price,entry:p.entry,stop:p.stop,target:p.target,
     quality:p.quality,momentum:p.momentum,liquidity:p.liquidity,
     concentration:p.concentration,security:p.risk,freshness:p.freshness,
     notional:capital,
     hypotheticalNet:isStale?null:Number(net.toFixed(2)),
     hypotheticalRisk:isStale?null:Number(risk.toFixed(2)),
     rr:isStale?null:Number(((p.target-entry)/(entry-p.stop)).toFixed(2)),
     sourceType:'SYNTHETIC_FIXTURE',
     sourceVerified:false,paperEligible:false,allowedToTrade:false,
     verifiedNet:null,executedOrders:0,
     safety:isStale?'BLOCKED':'RESEARCH_ONLY',
     notes:'Generated locally. Not market data, a security audit, a trade recommendation, or a verified profit.'
   };
 }
 return Object.freeze({evaluate,names:Object.freeze(Object.keys(PRESETS))});
});
