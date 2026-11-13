/* Exchange source verification, no orders, no keys.
 * GitHub runner network tests HTTP access/schema, NOT browser CORS or location.
 * Unavailable venues are distinct VERIFY, never backfilled from other APIs.
 */
import {createRequire} from 'node:module';
import {writeFileSync,mkdirSync} from 'node:fs';
const require=createRequire(import.meta.url);
const source=require('../quant-market-sources.js');
const at=new Date().toISOString();
const env={schema:'fomo.quant.source-coverage.v01',capturedAtUtc:at,
  mode:'READ_ONLY_PUBLIC_SPOT_NO_TRADING',venueCountConfigured:source.NAMES.length,
  region:'github_actions_runner',browserCorsVerified:false,
  accountLevelVerified:false,executableDepthVerified:false,
  userJurisdictionVerified:false,usdUsdtParityVerified:false,
  paperEligible:false,liveCapitalAuthorized:false,assets:{}};
const runner=async()=>{
 for(const asset of ['BTC','ETH','SOL']){
  const rows=await source.scan(asset);
  env.assets[asset]=rows.map(x=>({
   name:x.venue,market:x.symbol||asset+'/'+x.quoteCurrency,
   status:x.status,sourceUrl:x.sourceUrl,
   bid:x.status==='OBSERVED_QUOTE'?x.bid:null,
   ask:x.status==='OBSERVED_QUOTE'?x.ask:null,
   retrievedAtUtc:x.fetchedAt?new Date(x.fetchedAt).toISOString():null,
   providerAtUtc:x.providerAt?new Date(x.providerAt).toISOString():null,
   evidenceLevel:x.verification||'VERIFY',
   error:x.reason||null
  }));
 }
 env.observedByAsset=Object.fromEntries(Object.entries(env.assets).map(([asset,rows])=>
   [asset,rows.filter(x=>x.status==='OBSERVED_QUOTE').length]));
 const output=JSON.stringify(env,null,2)+'\n';
 mkdirSync('/tmp/fomo-quant-six-venues',{recursive:true});
 writeFileSync('/tmp/fomo-quant-six-venues/source-coverage.json',output);
 console.log('FOMO_MULTIVENUE_LIVE_EVIDENCE '+JSON.stringify(env));
 console.log('LIVE_SOURCE_OBSERVED_COUNTS '+JSON.stringify(env.observedByAsset)+
  ' (GitHub runner only; browser QA and account fee/depth gates VERIFY)');
};
runner().catch(e=>{console.error('SOURCE_QA_UNAVAILABLE',String(e));process.exitCode=1;});
