/**
 * Protected single-origin Quant + Market Sources + Profit Calculator preview.
 * Prepared for review only. Not deployed, merged, or authorized for public use.
 * All market API calls are browser-origin read-only; no account credentials.
 * Keep Auto Deploy OFF and provide secret credentials via the hosting environment.
 */
import { createServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const files=Object.freeze({
  '/':'index.html',
  '/index.html':'index.html',
  '/quant-market-lab.html':'quant-market-lab.html',
  '/quant-market-sources.js':'quant-market-sources.js',
  '/quant-profit-calc.js':'quant-profit-calc.js',
  '/quant-market-lab.js':'quant-market-lab.js',
  '/derivatives-shadow.js':'derivatives-shadow.js'
});
const type=p=>p.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8';
const CORS_ALLOWED=[
  'https://api.kraken.com',
  'https://api.exchange.coinbase.com',
  'https://api.gemini.com',
  'https://api.bybit.com',
  'https://www.okx.com',
  'https://api.kucoin.com',
  'https://api.gateio.ws',
  'https://api-pub.bitfinex.com',
  'https://api.huobi.pro',
  'https://api.crypto.com'
];
const CALC_CSP=[
  "default-src 'none'","script-src 'self'","style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:","font-src 'self'",
  'connect-src '+CORS_ALLOWED.join(' '),
  "object-src 'none'","frame-src 'none'","base-uri 'none'",
  "form-action 'none'","upgrade-insecure-requests"
].join('; ');

function hash(input){return createHash('sha256').update(input).digest();}
function same(x,y){return timingSafeEqual(hash(x),hash(y));}
function isLocalAddress(addr){return addr==='127.0.0.1'||addr==='::1'||addr==='::ffff:127.0.0.1';}
function finish(res,status,text,headers={}){
  res.writeHead(status,{
    'Cache-Control':'no-store, private, max-age=0',
    'Pragma':'no-cache',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'X-Frame-Options':'DENY',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
    'X-Robots-Tag':'noindex, nofollow, noarchive',
    'Cross-Origin-Resource-Policy':'same-origin',
    'Cross-Origin-Opener-Policy':'same-origin',
    ...headers
  });
  if(res.req?.method==='HEAD'){res.end();return;}
  res.end(text);
}
function parseCredentials(header){
  if(typeof header!=='string'||header.length>500||!header.startsWith('Basic '))return null;
  const base64=header.slice(6);
  if(!/^[a-zA-Z0-9+/]+={0,2}$/.test(base64))return null;
  const value=Buffer.from(base64,'base64').toString('utf8');
  const separator=value.indexOf(':');
  return separator>=1?{user:value.slice(0,separator),password:value.slice(separator+1)}:null;
}
export function createPreviewServer({username,password,allowHttpLocal=false}={}){
  if(typeof username!=='string'||username.length<3||typeof password!=='string'||password.length<16)
    throw Error('Protected preview requires QUANT_PREVIEW_USER and a strong QUANT_PREVIEW_PASSWORD (>=16 chars)');
  const expectedUser=username,expectedPass=password;
  const failed=new Map();
  return createServer(async(req,res)=>{
    const local=allowHttpLocal && isLocalAddress(req.socket.remoteAddress);
    const secure=req.socket.encrypted||req.headers['x-forwarded-proto']==='https';
    if(!secure&&!local){finish(res,403,'HTTPS required\n');return;}
    if(secure)res.setHeader('Strict-Transport-Security','max-age=31536000');
    const url=new URL(req.url||'/', 'https://quant-preview.invalid');
    if(req.method!=='GET'&&req.method!=='HEAD'){
      finish(res,405,'Method not allowed\n',{'Allow':'GET, HEAD'});return;
    }
    if(url.pathname==='/healthz'){
      finish(res,200,'OK\n',{'Content-Type':'text/plain; charset=utf-8'});return;
    }
    const ip=String(req.socket.remoteAddress||'unknown');
    const now=Date.now(),tracked=failed.get(ip);
    if(tracked&&tracked.until>now&&tracked.count>=8){
      finish(res,429,'Too many attempts\n',{'Retry-After':'60'});return;
    }
    const c=parseCredentials(req.headers.authorization);
    const ok=c&&same(c.user,expectedUser)&&same(c.password,expectedPass);
    if(!ok){
      const fresh=!tracked||tracked.until<now;
      failed.set(ip,{count:fresh?1:tracked.count+1,until:now+60000});
      if(failed.size>1000)failed.clear();
      finish(res,401,'Authentication required\n',
        {'WWW-Authenticate':'Basic realm="Quant Private QA", charset="UTF-8"'});return;
    }
    failed.delete(ip);
    const path=files[url.pathname];
    if(!path){finish(res,404,'Not found\n');return;}
    try{
      const bytes=await readFile(resolve(ROOT,path));
      const headers={'Content-Type':type(path)};
      if(url.pathname==='/quant-market-lab.html')headers['Content-Security-Policy']=CALC_CSP;
      finish(res,200,bytes,headers);
    }catch(e){
      finish(res,503,'Preview asset unavailable\n');
    }
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const server=createPreviewServer({
    username:process.env.QUANT_PREVIEW_USER,
    password:process.env.QUANT_PREVIEW_PASSWORD,
    allowHttpLocal:process.env.QUANT_PREVIEW_ALLOW_HTTP_LOCALHOST==='1'
  });
  const port=Number(process.env.PORT||10000);
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
  server.listen(port,'0.0.0.0',()=>{
    // Never print credentials or source code.
    process.stdout.write('Protected Quant Preview listening, RELEASE HOLD\n');
  });
}
