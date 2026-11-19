/* FOMO Quant original Planner adapter: research-only local what-if. */
(function(){
 'use strict';
 const model=window.FomoPremiumDemo,el=id=>document.getElementById(id);
 if(!model||typeof model.modelTrade!=='function'||!el('fomoTradePanel'))return;
 const keys=['notional','entry','exit','stop','leverage','fomoFeeBps',
  'protocolFeeBps','slippageRoundTripBps','fundingCostBps','networkCostUsd'];
 const id=k=>'fomoTrade'+k[0].toUpperCase()+k.slice(1);
 const modeOf={breakout:'SPOT',concentration:'SPOT',chase:'SPOT',
  stale:'SPOT',perpsLong:'PERPS_LONG',perpsShort:'PERPS_SHORT'};
 const fmt=n=>Number.isFinite(n)?n.toLocaleString('en-US',
  {minimumFractionDigits:2,maximumFractionDigits:4}):'—';
 let last=null,ref=null;
 function clear(){
  last=null;el('fomoTradeExport').disabled=true;
  for(const k of ['Gross','Costs','Net','StopNet','BreakEven','Margin','Roi'])
   el('fomoTrade'+k).textContent='—';
 }
 function render(){
  clear();
  try{
   const p={mode:el('fomoTradeMode').value};
   if(el('fomoTradeScenario').value==='stale')throw Error('STALE_SOURCE_NO_HYPOTHETICAL_NET');
   for(const k of keys){
    const raw=el(id(k)).value;
    if(raw.trim()==='')throw Error('MISSING_'+k.toUpperCase());
    p[k]=Number(raw);
   }
   const r=model.modelTrade(p);
   last={...r,scenario:el('fomoTradeScenario').value,radarReference:ref,
    sourceStatus:{FOMO:'NOT_CONNECTED',CoinGecko:'NOT_CONNECTED',
     DEXScreener:'NOT_CONNECTED',X:'NOT_CONNECTED'},
    scope:'NOT_PAPER_ELIGIBLE',humanApproval:false,independentlyVerified:false};
   for(const [k,n] of Object.entries({Gross:r.hypotheticalGross,
    Costs:r.hypotheticalCosts,Net:r.hypotheticalNet,
    StopNet:r.hypotheticalStopNet,BreakEven:r.hypotheticalBreakEven,
    Margin:r.margin}))el('fomoTrade'+k).textContent='$'+fmt(n);
   el('fomoTradeRoi').textContent=fmt(r.roiNotionalPct)+'%';
   el('fomoTradeExport').disabled=false;
   el('fomoTradeStatus').textContent='HYPOTHETICAL ONLY · FOMO MARKET UNVERIFIED · NO PAPER / NO ORDERS';
  }catch(e){el('fomoTradeStatus').textContent='BLOCKED INPUT · '+String(e.message||e);}
 }
 function loadScenario(){
  const n=el('fomoTradeScenario').value,v=model.evaluate(n,1000),mode=modeOf[n];
  ref=null;el('fomoTradeSelected').textContent=v.asset+' · SYNTHETIC FIXTURE';
  el('fomoTradeMode').value=mode;
  const p={notional:1000,entry:v.entry,exit:v.target,stop:v.stop,
   leverage:v.leverage||1,fomoFeeBps:5,protocolFeeBps:mode==='SPOT'?0:3,
   slippageRoundTripBps:16,fundingCostBps:mode==='SPOT'?0:4,networkCostUsd:0};
  for(const [k,n] of Object.entries(p))el(id(k)).value=String(n);
  render();
 }
 function changeMode(){
  const mode=el('fomoTradeMode').value,perp=mode!=='SPOT';
  el('fomoTradeLeverage').value=perp?'2':'1';
  el('fomoTradeProtocolFeeBps').value=perp?'3':'0';
  el('fomoTradeFundingCostBps').value=perp?'4':'0';
  const entry=Number(el('fomoTradeEntry').value);
  if(entry>0&&Number.isFinite(entry)){
   el('fomoTradeExit').value=String(Number((entry*(mode==='PERPS_SHORT'?.88:1.12)).toPrecision(10)));
   el('fomoTradeStop').value=String(Number((entry*(mode==='PERPS_SHORT'?1.08:.94)).toPrecision(10)));
  }
  render();
 }
 el('fomoTradeScenario').addEventListener('change',loadScenario);
 el('fomoTradeMode').addEventListener('change',changeMode);
 for(const k of keys)el(id(k)).addEventListener('input',render);
 el('fomoTradeUseSelected').addEventListener('click',()=>{
  const get=window.FOMO_QS_RESEARCH_SNAPSHOT;
  if(typeof get!=='function')return;
  const x=get();
  if(!x||!x.symbol||!(x.referencePrice>0)){
   el('fomoTradeStatus').textContent='Select a RADAR token with a source price first';
   return;
  }
  ref={...x,source:'RADAR_REFERENCE_ONLY',fomoMarketVerified:false};
  el('fomoTradeSelected').textContent=x.symbol+' · RADAR REFERENCE · NOT FOMO LISTING';
  el('fomoTradeEntry').value=String(x.referencePrice);
  changeMode();
 });
 el('fomoTradeExport').addEventListener('click',()=>{
  if(!last)return;
  const data={...last,exportedAtUtc:new Date().toISOString()};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],
   {type:'application/json'}));
  const a=document.createElement('a');a.href=url;
  a.download='fomo-hypothetical-trade.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 loadScenario();
})();