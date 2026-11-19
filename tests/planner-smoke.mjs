import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
const required=[
  'id="positionPlannerPanel"',
  'id="ppAnalystFile"',
  'POSITION + CALCULATOR',
  'Risk Gate veto',
  'SHA-256',
  'PAPER ONLY',
  "0.3.3-position-planner-integration-rc1"
];
for(const x of required){if(!html.includes(x))throw new Error('Missing planner marker: '+x);}
const scripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
if(!scripts.length)throw new Error('No script found');
for(const js of scripts)new Function(js);
if((html.match(/<\/body>/g)||[]).length!==1)throw new Error('Unexpected body count');
if((html.match(/<\/script>/g)||[]).length!==4)throw new Error('Unexpected script count');
for(const marker of ['id="bybitShadowPanel"','src="derivatives-shadow.js"','id="bybitShadowRefresh"','id="bybitShadowExport"'])if(!html.includes(marker))throw new Error('Missing Bybit integration marker: '+marker);
console.log('Planner smoke PASS');

await import('./planner-paper-ready.mjs');
