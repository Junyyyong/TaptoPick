const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{let captured=false;for(let attempt=1;attempt<=8&&!captured;attempt++){
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(seed=>{let s=seed;Math.random=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};},Math.imul(attempt,2654435761)>>>0);
await page.clock.install({time:new Date('2026-09-06T12:00:00Z')});await page.clock.pauseAt(new Date('2026-09-06T12:00:01Z'));
await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.fastForward(12000);await page.locator('#mode-montage').click();
for(let round=0;round<18;round++){
const target=await page.locator('#target-preview img').getAttribute('src');const tiles=await page.locator('.picture-tile img').evaluateAll(es=>es.map(e=>e.getAttribute('src')));
if(tiles.some(s=>s.includes('/haepi/variation-11.webp'))){await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width).map(i=>i.decode()));});await page.screenshot({path:path.join(__dirname,'mobile-after.png')});assert.deepEqual(errors,[]);fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify({attempt,round,target,tiles,errors,viewport:{width:390,height:844},deviceScaleFactor:2},null,2)+'\n');captured=true;break;}
if(round<17){await page.locator('.picture-tile').nth(tiles.indexOf(target)).click();await page.clock.runFor(250);}
}await page.close();}assert(captured,'No board containing green variant captured');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
