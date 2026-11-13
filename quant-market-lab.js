/* Standalone FOMO Quant research module; never writes to main PAPER/scoring state. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const api=window.FomoMarketSources,model=window.FomoQuantProfit;
let quotes=[],result=null,scanning=false;
const money=(x,c)=>Number.isFinite(x)?new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:6}).format(x)+' '+c:'—';
const when=x=>Number.isFinite(x)?new Date(x).toISOString().replace('T',' ').slice(0,19)+' UTC':'UNAVAILABLE';
function cell(row,value){
 const e=document.createElement('td');e.textContent=value;row.append(e);return e;
}
function disableOutcome(message){
 result=null;$('calc-status').textContent='VERIFY · '+message;
 $('calc-status').className='pill unverified';$('net').textContent='—';$('roi').textContent='—';
 $('breakeven').textContent='—';$('breakdown').replaceChildren();
 $('calc-message').textContent=message;$('export').disabled=true;
}
function chosenQuote(){
 const val=$('chosen').value;
 return quotes.find(q=>q.venue===val&&q.asset===$('asset').value&&q.status==='OBSERVED_QUOTE')||null;
}
function sourceSelected(name){
 const q=quotes.find(x=>x.venue===name&&x.status==='OBSERVED_QUOTE');
 if(!q||Date.now()-q.fetchedAt>api.MAX_AGE_MS){disableOutcome('Missing/stale source. Refresh first.');return;}
 $('chosen').value=q.venue;
 const expected=q.ask*1.01;
 $('exit').value=Number(expected.toPrecision(10));
 disableOutcome('Loaded '+q.symbol+' from '+q.venue+'; exit is an editable hypothetical +1% scenario, not a forecast.');
 document.getElementById('calculator').scrollIntoView({behavior:'smooth',block:'start'});
}
function render(){
 const body=$('venues');body.replaceChildren();
 const picker=$('chosen'),before=picker.value;
 picker.replaceChildren();const d=document.createElement('option');d.value='';d.textContent='Select observed source';picker.append(d);
 for(const q of quotes){
  const r=document.createElement('tr');cell(r,q.venue+' · '+q.asset+'/'+q.quoteCurrency);
  cell(r,q.status==='OBSERVED_QUOTE'?money(q.bid,q.quoteCurrency):'—');
  cell(r,q.status==='OBSERVED_QUOTE'?money(q.ask,q.quoteCurrency):'—');
  cell(r,q.status==='OBSERVED_QUOTE'?
    (q.providerAt?when(q.providerAt)+' · '+q.providerTimeKind:'Retrieval '+when(q.fetchedAt)):'No valid quote');
  const e=document.createElement('td'),link=document.createElement('a');
  const pill=document.createElement('span');pill.className='pill '+(q.status==='OBSERVED_QUOTE'?'':'bad');
  pill.textContent=q.status==='OBSERVED_QUOTE'?(q.verification==='PROVIDER_TIME_CHECKED'?'RECEIVED · TIMED':'RECEIVED · RETRIEVAL ONLY'):'VERIFY';
  e.append(pill,document.createTextNode(' '));
  link.href=q.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='API source';
  e.append(link);
  if(q.reason){const note=document.createElement('div');note.className='mini';note.textContent=q.reason;e.append(note);}
  r.append(e);
  const a=document.createElement('td');
  if(q.status==='OBSERVED_QUOTE'){
   const b=document.createElement('button');b.className='secondary';b.textContent='Use quote';
   b.onclick=()=>sourceSelected(q.venue);a.append(b);
   const op=document.createElement('option');op.value=q.venue;op.textContent=q.venue+' · '+q.asset+'/'+q.quoteCurrency;picker.append(op);
  }else a.textContent='NOT ELIGIBLE';
  r.append(a);body.append(r);
 }
 if(quotes.some(q=>q.venue===before&&q.status==='OBSERVED_QUOTE'))picker.value=before;
 const ok=quotes.filter(q=>q.status==='OBSERVED_QUOTE').length;
 $('scan-status').textContent=ok+'/'+api.NAMES.length+' public spot sources returned structurally valid bid/ask in this browser. '+
   'Quoted data is indicative, non-atomic and not executable. Unavailable/blocked remain VERIFY.';
}
async function scan(){
 if(scanning)return;scanning=true;
 $('refresh').disabled=true;disableOutcome('Refreshing source snapshots; prior inputs cannot be carried forward as fresh execution evidence.');
 quotes=[];$('venues').replaceChildren();cell($('venues').insertRow(), 'Fetching '+api.NAMES.length+' configured public sources...');
 $('scan-status').textContent='FETCHING · independently checking '+api.NAMES.length+' public APIs and quote currencies...';
 try{quotes=await api.scan($('asset').value);render();}
 catch(e){$('scan-status').textContent='VERIFY · '+String(e.message||e).slice(0,150);}
 finally{scanning=false;$('refresh').disabled=false;}
}
function kvm(label,value){
 const tr=document.createElement('tr');cell(tr,label);cell(tr,value);$('breakdown').append(tr);
}
function calculate(){
 const q=chosenQuote();
 if(!q||Date.now()-q.fetchedAt<0||Date.now()-q.fetchedAt>api.MAX_AGE_MS){
  disableOutcome('Source absent/stale; refresh and choose a valid venue.');return;
 }
 const x=model.calc({
  source:q,side:$('direction').value,
  notional:$('notional').value,scenarioExitPrice:$('exit').value,
  entryFeeBps:$('fee-in').value,exitFeeBps:$('fee-out').value,
  entrySlippageBps:$('slip-in').value,exitSlippageBps:$('slip-out').value,
  extraCostQuote:$('other').value,nowAt:Date.now()
 });
 if(!Number.isFinite(x.conditionalNetQuote)){
  disableOutcome('VERIFY · incomplete/invalid assumptions. '+x.reasonCodes.join(' · '));return;
 }
 result={schema:'fomo.quant.multivenue.research.v01',scope:'NOT_PAPER_ELIGIBLE',createdAtUtc:new Date().toISOString(),quote:q,scenario:x};
 $('calc-status').textContent='HYPOTHETICAL · NO EXECUTION';
 $('calc-status').className='pill unverified';
 $('net').textContent=money(x.conditionalNetQuote,x.currency);
 $('net').className=x.conditionalNetQuote<0?'negative':'positive';
 $('roi').textContent=x.conditionalRoiPct.toFixed(3)+'%';
 $('roi').className=x.conditionalRoiPct<0?'negative':'positive';
 $('breakeven').textContent=money(x.breakevenExitQuote,x.currency);
 const b=$('breakdown');b.replaceChildren();
 kvm('Observed entry bid / ask',money(q.bid,x.currency)+' / '+money(q.ask,x.currency));
 kvm('Directional entry proxy',money(x.entryFillProxy,x.currency));
 kvm('Hypothetical exit proxy',money(x.exitFillProxy,x.currency));
 kvm('Reference asset quantity',String(x.quantity));
 kvm('Gross quote P/L (hypothetical)',money(x.grossQuote,x.currency));
 kvm('Entry fee (assumed)',money(x.entryFeeQuote,x.currency));
 kvm('Exit fee (assumed)',money(x.exitFeeQuote,x.currency));
 kvm('Other costs (assumed)',money(x.otherCostQuote,x.currency));
 kvm('Source timestamp',when(x.quoteTime));
 kvm('Finance, FX, depth, tax', 'NOT VERIFIED · outside model');
 kvm('Reason codes',x.reasonCodes.join(' · '));
 $('calc-message').textContent='Quote-only sensitivity, not a prediction, trade signal, realized profit, '+
   'or qualifying PAPER checkpoint. Source '+q.venue+' '+q.symbol+'. Account fees, execution, '+
   'market impact, financing and quote conversion remain unverified.';
 $('export').disabled=false;
}
function exportEvidence(){
 if(!result)return;
 const b=new Blob([JSON.stringify(result,null,2)+'\n'],{type:'application/json'});
 const u=URL.createObjectURL(b),a=document.createElement('a');
 a.href=u;a.download='fomo-quant-research-'+$('asset').value.toLowerCase()+'.json';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);
}
$('refresh').onclick=scan;
$('asset').onchange=()=>{quotes=[];result=null;$('chosen').replaceChildren();$('venues').replaceChildren();
 $('scan-status').textContent='Asset changed; refresh sources again.';disableOutcome('Asset changed; quote cleared.');};
$('calculate').onclick=calculate;
$('export').onclick=exportEvidence;
$('chosen').onchange=()=>{const q=chosenQuote();if(q)sourceSelected(q.venue);else disableOutcome('Select source.');};
$('direction').onchange=()=>disableOutcome('Direction changed; rerun hypothetical calculation.');
})();
