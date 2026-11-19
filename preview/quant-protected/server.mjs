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
  '/':'premium-demo.html',
  '/premium-demo.html':'premium-demo.html',
  '/premium-demo-engine.js':'premium-demo-engine.js',
  '/premium-demo-ui.js':'premium-demo-ui.js',
  '/fomo-trade-ui.js':'fomo-trade-ui.js',
  '/index.html':'index.html',
  '/quant-market-lab.html':'quant-market-lab.html',
  '/quant-market-sources.js':'quant-market-sources.js',
  '/quant-profit-calc.js':'quant-profit-calc.js',
  '/quant-market-lab.js':'quant-market-lab.js',
  '/derivatives-shadow.js':'derivatives-shadow.js'
});
const type=p=>p.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8';
const SYNTHETIC_CSP=[
  "default-src 'none'","script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:","img-src 'self' data:",
  "connect-src 'none'","object-src 'none'","frame-src 'none'",
  "base-uri 'none'","form-action 'none'","upgrade-insecure-requests"
].join('; ');
const PREMIUM_CSP=SYNTHETIC_CSP.replace("script-src 'self' 'unsafe-inline'","script-src 'self'").replace(
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com","style-src 'self' 'unsafe-inline'");
// Premium pages and scripts never import remote fonts or market APIs.

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
export function createPreviewServer({username,password,allowHttpLocal=false,trustProxyHttps=false,renderHostname=null,audience='internal',profile='synthetic'}={}){
  // Proxy trust is restricted to Render's known onrender.com hostname AND a
  // non-loopback upstream connection. Source identity is still Render-edge
  // dependent and MUST be checked on the actual hosted origin before release.
  if(trustProxyHttps &&
     (typeof renderHostname!=='string'||!/^[a-z0-9][a-z0-9.-]*\.onrender\.com$/.test(renderHostname)))
    throw Error('Trusted HTTPS proxy requires validated RENDER_EXTERNAL_HOSTNAME');
  if(audience!=='internal'||profile!=='synthetic')throw Error('External/live market-data preview is license-locked');
  if(typeof username!=='string'||username.length<3||typeof password!=='string'||password.length<16)
    throw Error('Protected preview requires QUANT_PREVIEW_USER and a strong QUANT_PREVIEW_PASSWORD (>=16 chars)');
  const expectedUser=username,expectedPass=password;
  // One low-traffic internal QA instance. A SINGLE per-process failure budget
  // prevents any X-Forwarded-For/IP rotation bypass. It intentionally does not
  // read untrusted forwarded IPs. Multi-instance/global edge protection still
  // requires an external shared rate-limit store or identity edge.
  const MAX_FAILED_LOGINS=8, AUTH_WINDOW_MS=60_000;
  let authWindow={count:0,until:0};
  return createServer(async(req,res)=>{
    const local=allowHttpLocal && isLocalAddress(req.socket.remoteAddress);
    // Never trust X-Forwarded-Proto from an arbitrary direct client.
    // Only enable this behind the verified Render TLS-terminating edge.
    const proxiedHttps=trustProxyHttps&&!isLocalAddress(req.socket.remoteAddress) &&
      req.headers.host===renderHostname && req.headers['x-forwarded-proto']==='https';
    const secure=Boolean(req.socket.encrypted)||proxiedHttps;
    if(!secure&&!local){finish(res,403,'HTTPS required\n');return;}
    if(secure)res.setHeader('Strict-Transport-Security','max-age=31536000');
    const url=new URL(req.url||'/', 'https://quant-preview.invalid');
    if(req.method!=='GET'&&req.method!=='HEAD'){
      finish(res,405,'Method not allowed\n',{'Allow':'GET, HEAD'});return;
    }
    if(url.pathname==='/healthz'){
      finish(res,200,'OK\n',{'Content-Type':'text/plain; charset=utf-8'});return;
    }
    const now=Date.now();
    if(now>=authWindow.until)authWindow={count:0,until:now+AUTH_WINDOW_MS};
    if(authWindow.count>=MAX_FAILED_LOGINS){
      finish(res,429,'Too many attempts\n',{'Retry-After':'60'});return;
    }
    const c=parseCredentials(req.headers.authorization);
    const ok=c&&same(c.user,expectedUser)&&same(c.password,expectedPass);
    if(!ok){
      authWindow.count+=1;
      finish(res,401,'Authentication required\n',
        {'WWW-Authenticate':'Basic realm="Quant Private QA", charset="UTF-8"'});return;
    }
    // A successful request must NOT reset failed-attempt pressure. Only the
    // fixed time window resets it, even across forged forwarded-IP headers.
    const path=files[url.pathname];
    if(!path){finish(res,404,'Not found\n');return;}
    if(path==='index.html'&&url.searchParams.get('mode')!=='sim'){
      finish(res,302,'Synthetic mode required\n',{'Location':'/index.html?mode=sim'});return;
    }
    try{
      let bytes=await readFile(resolve(ROOT,path));
      const premiumAsset=path.startsWith('premium-demo');
      const headers={'Content-Type':type(path),'Content-Security-Policy':premiumAsset?PREMIUM_CSP:SYNTHETIC_CSP,
                     'X-Quant-Preview-Profile':'SYNTHETIC_ONLY'};
      if(path==='quant-market-lab.html'){
        const html=bytes.toString('utf8');
        if(!html.includes('</head>'))throw Error('Missing market-lab head');
        bytes=html.includes('name="quant-preview-mode"')?html:html.replace('</head>','<meta name="quant-preview-mode" content="synthetic">\n</head>');
      }
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
    allowHttpLocal:process.env.QUANT_PREVIEW_ALLOW_HTTP_LOCALHOST==='1',
    audience:process.env.QUANT_PREVIEW_AUDIENCE||'internal',
    profile:process.env.QUANT_PREVIEW_PROFILE||'synthetic',
    trustProxyHttps:process.env.RENDER_SERVICE_TYPE==='web' &&
      Boolean(process.env.RENDER_SERVICE_ID&&process.env.RENDER_EXTERNAL_HOSTNAME),
    renderHostname:process.env.RENDER_EXTERNAL_HOSTNAME||null
  });
  const port=Number(process.env.PORT||10000);
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
  server.listen(port,'0.0.0.0',()=>{
    // Never print credentials or source code.
    process.stdout.write('Protected Quant Preview listening, RELEASE HOLD\n');
  });
}
