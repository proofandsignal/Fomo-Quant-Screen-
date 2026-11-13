/* FOMO Quant Profit Calculator v0.1 — isolated paper-only sensitivity.
 * Prices, fees and fill sizes are assumptions. No orders, no short-borrow claim.
 * Inputs must use a single source with an exact quote currency. No FX conversion.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.FomoQuantProfit=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const BPS=10000;
  function amount(v,positive=false,max=Number.MAX_SAFE_INTEGER){
    if(v===null||v===undefined||v===''||typeof v==='boolean')return null;
    const n=Number(v);
    return Number.isFinite(n)&&(!positive||n>0)&&n>=0&&n<=max?n:null;
  }
  function signedAmount(v,limit){
    if(v===null||v===undefined||v===''||typeof v==='boolean')return null;
    const n=Number(v);
    return Number.isFinite(n)&&Math.abs(n)<=limit?n:null;
  }
  function calc(input){
    const base={status:'VERIFY',eligibility:'RESEARCH_ONLY',allowedToTrade:false,
      financiallyEligiblePaper:false,verifiedNet:null,
      reasonCodes:['SYNTHETIC_EXIT','NO_EXECUTION','NO_ORDERBOOK_DEPTH',
        'NO_ACCOUNT_FEES','NO_BORROW_OR_MARGIN_VERIFICATION','NO_LIVE_CAPITAL']};
    const s=input&&input.source;
    if(!s||s.status!=='OBSERVED_QUOTE'||s.marketType!=='SPOT'||!['USD','USDT'].includes(s.quoteCurrency)||
       !['BTC','ETH','SOL'].includes(s.asset)||!Number.isFinite(s.fetchedAt)||
       !['LONG','SHORT'].includes(input.side))
      return {...base,reasonCodes:[...base.reasonCodes,'SOURCE_OR_DIRECTION_INVALID']};
    if(!Number.isFinite(Number(s.bid))||!Number.isFinite(Number(s.ask))||
       Number(s.bid)<=0||Number(s.ask)<=0||Number(s.bid)>Number(s.ask))
      return {...base,reasonCodes:[...base.reasonCodes,'CROSSED_OR_BAD_SOURCE_QUOTES']};
    // A stale quote must never produce a fresh-looking numeric scenario,
    // even when callers bypass the standalone page's freshness guard.
    const checkNow=input.nowAt===undefined?Date.now():Number(input.nowAt);
    if(!Number.isFinite(checkNow)||checkNow<s.fetchedAt||checkNow-s.fetchedAt>120000)
      return {...base,reasonCodes:[...base.reasonCodes,'SOURCE_STALE']};
    const notional=amount(input.notional,true,1000000);
    const takeExit=amount(input.scenarioExitPrice,true,1000000000);
    const entryFee=amount(input.entryFeeBps,false,1000),exitFee=amount(input.exitFeeBps,false,1000);
    const slipEntry=amount(input.entrySlippageBps,false,1000),slipExit=amount(input.exitSlippageBps,false,1000);
    const other=amount(input.extraCostQuote,false,1000000);
    if([notional,takeExit,entryFee,exitFee,slipEntry,slipExit,other].some(x=>x===null))
      return {...base,reasonCodes:[...base.reasonCodes,'MISSING_PRICE_OR_COST_ASSUMPTION']};
    const isLong=input.side==='LONG';
    const rawEntry=isLong?Number(s.ask):Number(s.bid);
    const effEntry=rawEntry*(1+(isLong?1:-1)*slipEntry/BPS);
    const effExit=takeExit*(1+(isLong?-1:1)*slipExit/BPS);
    if(!(effEntry>0&&effExit>0))return {...base,reasonCodes:[...base.reasonCodes,'NONPOSITIVE_ADJUSTED_FILL']};
    const quantity=notional/effEntry;
    const entryValue=quantity*effEntry,exitValue=quantity*effExit;
    const feeEntry=entryValue*entryFee/BPS,feeExit=exitValue*exitFee/BPS;
    const gross=(isLong?1:-1)*(exitValue-entryValue);
    const net=gross-feeEntry-feeExit-other;
    const breakeven=isLong
      ?(effEntry*(1+entryFee/BPS)+other/quantity)/((1-slipExit/BPS)*(1-exitFee/BPS))
      :(effEntry*(1-entryFee/BPS)-other/quantity)/((1+slipExit/BPS)*(1+exitFee/BPS));
    const reasons=[...base.reasonCodes];
    if(input.side==='SHORT')reasons.push('SPOT_SHORT_IS_DIRECTIONAL_PROXY_ONLY');
    if(s.verification!=='PROVIDER_TIME_CHECKED')reasons.push('RETRIEVAL_TIMESTAMP_ONLY');
    if(s.quoteCurrency==='USDT')reasons.push('USDT_NOT_EQUIVALENT_TO_USD');
    return {...base,source:s.venue,asset:s.asset,currency:s.quoteCurrency,
      side:input.side,quoteTime:s.fetchedAt,sourceUrl:s.sourceUrl,
      entryQuoteRaw:rawEntry,scenarioExitQuoteRaw:takeExit,
      quantity,entryFillProxy:effEntry,exitFillProxy:effExit,
      entryNotionalQuote:entryValue,exitNotionalQuote:exitValue,
      entryFeeQuote:feeEntry,exitFeeQuote:feeExit,otherCostQuote:other,
      grossQuote:gross,conditionalNetQuote:net,conditionalRoiPct:net/notional*100,
      breakevenExitQuote:breakeven>0?breakeven:null,
      reasonCodes:reasons,economicStatus:'VERIFY'};
  }
  return Object.freeze({calc});
});
