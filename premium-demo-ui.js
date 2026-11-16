/* Premium read-only demo: all UI state local, all source data synthetic. */
(function(){
 'use strict';
 const engine=window.FomoPremiumDemo;
 const $=id=>document.getElementById(id);
 const fmt=(n,prefix='')=>Number.isFinite(n)?prefix+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
 let selected='breakout',capital=1000,latest=null;
 function content(id,text){$(id).textContent=text;}
 function render(){
   const data=engine.evaluate(selected,capital);latest=data;
   for(const btn of document.querySelectorAll('[data-scenario]')){
      const active=btn.dataset.scenario===selected;
      btn.setAttribute('aria-pressed',String(active));
      btn.classList.toggle('is-active',active);
   }
   content('active-scenario',data.label);
   content('asset',data.asset);
   content('decision',data.decision);
   $('decision').dataset.status=data.decision;
   content('stage',data.stage);
   content('signal',data.signal);
   content('why',data.why);
   content('momentum',String(data.momentum));
   content('liquidity',String(data.liquidity));
   content('quality',String(data.quality));
   for(const m of ['momentum','liquidity','quality'])$(m+'-bar').style.width=data[m]+'%';
   content('holder-concentration',data.concentration+'%');
   content('risk-status',data.security);
   $('risk-status').dataset.status=data.security;
   content('freshness',data.freshness);
   content('entry',fmt(data.entry,'$'));
   content('stop',fmt(data.stop,'$'));
   content('target',fmt(data.target,'$'));
   content('net',fmt(data.hypotheticalNet,'$'));
   content('rr',data.rr===null?'—':data.rr+'x');
   content('capital-display',fmt(capital,'$'));
   content('paper-gate','LOCKED · NOT ELIGIBLE');
   content('evidence-source','LOCAL SYNTHETIC FIXTURE');
   $('net').setAttribute('aria-label','Hypothetical net only, not verified profit');
 }
 for(const button of document.querySelectorAll('[data-scenario]')){
   button.addEventListener('click',()=>{selected=button.dataset.scenario;render();});
 }
 $('notional').addEventListener('change',()=>{capital=Number($('notional').value);render();});
 $('export-fixture').addEventListener('click',()=>{
   const data={...latest,exportedAtUtc:new Date().toISOString(),
     scope:'NOT_PAPER_ELIGIBLE',humanApproval:false};
   const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'});
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');
   a.href=url;a.download='fomo-quant-synthetic-evidence.json';a.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 render();
})();
