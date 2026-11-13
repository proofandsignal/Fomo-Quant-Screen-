/* FOMO Quant Market Sources v0.1 — public spot bid/ask, read only.
 * Seven provider adapters with one availability fallback. Configured is NOT live verified.
 * USD and USDT are separate quote units: never convert or rank across them.
 * One symbol per source per explicit on-demand fetch; no API keys or orders.
 */
(function(root,factory){
  const moduleValue=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=moduleValue;
  if(root)root.FomoMarketSources=moduleValue;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const ALLOWED=['BTC','ETH','SOL'];
  const NAMES=['Kraken','Coinbase Exchange','Gemini','Bybit','OKX','KuCoin','Gate.io'];
  const MAX_AGE_MS=120000;
  const FRESH_EPS_MS=30000;
  const currencies={Kraken:'USD','Coinbase Exchange':'USD',Gemini:'USD',Bybit:'USDT',OKX:'USDT',KuCoin:'USDT','Gate.io':'USDT'};
  function positive(x){ if(x===null||x===undefined||x==='')return null; const n=Number(x);return Number.isFinite(n)&&n>0?n:null; }
  function timestamp(x){
    if(typeof x==='string' && x.trim() && !/^\d+$/.test(x)) { const d=Date.parse(x); return Number.isFinite(d)?d:null; }
    const n=Number(x);
    return Number.isFinite(n)&&n>1577836800000?n:null;
  }
  function urlFor(name,asset){
    if(!ALLOWED.includes(asset)||!NAMES.includes(name))throw Error('Unapproved asset/venue');
    const usdt=asset+'USDT',usd=asset+'USD';
    switch(name){
      case 'Kraken':return 'https://api.kraken.com/0/public/Ticker?pair='+usd;
      case 'Coinbase Exchange':return 'https://api.exchange.coinbase.com/products/'+asset+'-USD/ticker';
      case 'Gemini':return 'https://api.gemini.com/v1/pubticker/'+usd.toLowerCase();
      case 'Bybit':return 'https://api.bybit.com/v5/market/tickers?category=spot&symbol='+usdt;
      case 'OKX':return 'https://www.okx.com/api/v5/market/ticker?instId='+asset+'-USDT';
      case 'KuCoin':return 'https://api.kucoin.com/api/v1/market/orderbook/level1?symbol='+asset+'-USDT';
      case 'Gate.io':return 'https://api.gateio.ws/api/v4/spot/tickers?currency_pair='+asset+'_USDT';
    }
  }
  function normalize(name,asset,payload,receivedAt){
    if(!NAMES.includes(name)||!ALLOWED.includes(asset))throw Error('Unknown source identity');
    const symbol=asset+'/'+currencies[name], fetched=timestamp(receivedAt);
    if(fetched===null)throw Error('No valid receipt timestamp');
    let bid,ask,providerAt=null,providerTimeKind='UNAVAILABLE',rawSymbol='';
    switch(name){
      case 'Kraken':{
        if(!payload||!Array.isArray(payload.error)||payload.error.length!==0||!payload.result||
           Object.keys(payload.result).length!==1)throw Error('Kraken ticker/pair schema unverified');
        const t=Object.values(payload.result)[0];
        bid=t&&t.b&&t.b[0];ask=t&&t.a&&t.a[0];
        rawSymbol=asset+'USD';break;
      }
      case 'Coinbase Exchange':{
        if(!payload||!payload.trade_id||!payload.time)throw Error('Coinbase trade identifier or time missing');
        bid=payload.bid;ask=payload.ask;providerAt=timestamp(payload.time);
        providerTimeKind='LAST_TRADE_TIME_NOT_BOOK';rawSymbol=asset+'-USD';break;
      }
      case 'Gemini':{
        if(!payload||!payload.bid||!payload.ask||!payload.last)throw Error('Gemini bid/ask/last missing');
        bid=payload.bid;ask=payload.ask;rawSymbol=asset.toLowerCase()+'usd';break;
      }
      case 'Bybit':{
        if(!payload||payload.retCode!==0||!payload.result||payload.result.category!=='spot'||
           !Array.isArray(payload.result.list))throw Error('Bybit spot schema invalid');
        const t=payload.result.list.filter(x=>x.symbol===asset+'USDT');
        if(t.length!==1)throw Error('Bybit exact symbol mismatch');
        bid=t[0].bid1Price;ask=t[0].ask1Price;providerAt=timestamp(payload.time);
        providerTimeKind='PROVIDER_RESPONSE_TIME';rawSymbol=asset+'USDT';break;
      }
      case 'OKX':{
        if(!payload||String(payload.code)!=='0'||!Array.isArray(payload.data))throw Error('OKX schema invalid');
        const rows=payload.data.filter(x=>x.instId===asset+'-USDT'&&x.instType==='SPOT');
        if(rows.length!==1)throw Error('OKX exact spot symbol mismatch');
        bid=rows[0].bidPx;ask=rows[0].askPx;providerAt=timestamp(rows[0].ts);
        providerTimeKind='TICKER_TIMESTAMP';rawSymbol=asset+'-USDT';break;
      }
      case 'KuCoin':{
        if(!payload||payload.code!=='200000'||!payload.data)throw Error('KuCoin schema invalid');
        bid=payload.data.bestBid;ask=payload.data.bestAsk;providerAt=timestamp(payload.data.time);
        providerTimeKind='QUOTE_TIMESTAMP';rawSymbol=asset+'-USDT';break;
      }
      case 'Gate.io':{
        if(!Array.isArray(payload))throw Error('Gate spot ticker schema invalid');
        const rows=payload.filter(x=>x&&x.currency_pair===asset+'_USDT');
        if(rows.length!==1)throw Error('Gate exact symbol mismatch');
        bid=rows[0].highest_bid;ask=rows[0].lowest_ask;
        rawSymbol=asset+'_USDT';break;
      }
    }
    bid=positive(bid);ask=positive(ask);
    if(!bid||!ask||bid>ask)throw Error('Missing/crossed/invalid bid-ask');
    if(providerAt!==null&&(providerAt>fetched+FRESH_EPS_MS||fetched-providerAt>MAX_AGE_MS))
      throw Error('Provider timestamp stale or in future');
    return Object.freeze({
      venue:name,asset,marketType:'SPOT',quoteCurrency:currencies[name],symbol,providerSymbol:rawSymbol,
      bid,ask,fetchedAt:fetched,providerAt,
      providerTimeKind,verification:providerAt?'PROVIDER_TIME_CHECKED':'RETRIEVAL_ONLY',
      sourceUrl:urlFor(name,asset),status:'OBSERVED_QUOTE',economicStatus:'VERIFY',
      note:'Top-of-book public indicative quote, not matched order, execution depth or realized PnL'
    });
  }
  async function fetchOne(name,asset,requestImpl=fetch,nowImpl=Date.now){
    const url=urlFor(name,asset),at=nowImpl();
    let timer,ctrl;
    try{
      if(typeof AbortController!=='undefined'){ctrl=new AbortController();timer=setTimeout(()=>ctrl.abort(),8500);}
      const res=await requestImpl(url,{method:'GET',mode:'cors',cache:'no-store',credentials:'omit',
                                    ...(ctrl?{signal:ctrl.signal}:{})});
      if(!res.ok)throw Error('HTTP '+res.status);
      const body=await res.json();
      return normalize(name,asset,body,nowImpl());
    }catch(e){
      return {venue:name,asset,quoteCurrency:currencies[name],sourceUrl:url,
              status:'VERIFY',economicStatus:'VERIFY',bid:null,ask:null,fetchedAt:at,
              reason:String(e&&e.message||e).slice(0,160)};
    }finally{if(timer)clearTimeout(timer);}
  }
  async function scan(asset,requestImpl,nowImpl){
    if(!ALLOWED.includes(asset))throw Error('Unapproved asset');
    return Promise.all(NAMES.map(name=>fetchOne(name,asset,requestImpl,nowImpl)));
  }
  return Object.freeze({NAMES,ALLOWED,MAX_AGE_MS,urlFor,normalize,fetchOne,scan});
});
