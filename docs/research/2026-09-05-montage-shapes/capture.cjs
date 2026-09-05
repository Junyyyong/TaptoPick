// Capture the working version on a local dev server, without modifying game state.
// NODE_PATH=<playwright directory> node docs/research/2026-09-05-montage-shapes/capture.cjs
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createHash}=require('node:crypto');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const seen=new Set(),captures=[];fs.mkdirSync(path.join(__dirname,'screenshots'),{recursive:true});
 try {for(let attempt=1;attempt<=80&&seen.size<7;attempt++){
  const seed=Math.imul(attempt,2654435761)>>>0;
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(seed=>{let s=seed;Math.random=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};},seed);
  await page.clock.install({time:new Date('2026-09-05T12:00:00Z')});
  await page.clock.pauseAt(new Date('2026-09-05T12:00:01Z'));
  await page.goto(process.env.RESEARCH_URL||'http://127.0.0.1:5189/',{waitUntil:'networkidle'});
  await page.clock.fastForward(12000);await page.locator('#mode-montage').click();
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width>0).map(i=>i.decode()));});
  const target=await page.locator('#target-preview img').getAttribute('src');
  const id=target.match(/montage\/([^/]+)\//)[1];
  if(!seen.has(id)){
   await page.clock.runFor(100);
   const tiles=await page.locator('.picture-tile img').evaluateAll(es=>es.map(e=>e.getAttribute('src')));
   assert.equal(tiles.length,4);assert.equal(tiles.filter(s=>s===target).length,1);assert.equal(errors.length,0);
   const file=`screenshots/${id}-2x2.png`;await page.screenshot({path:path.join(__dirname,file)});
   captures.push({id,seed,target,tiles,file,sha256:createHash('sha256').update(fs.readFileSync(path.join(__dirname,file))).digest('hex'),errors});seen.add(id);console.log(id);
  }
  await context.close();
 }
 assert.equal(seen.size,7);
 fs.writeFileSync(path.join(__dirname,'manifest.json'),JSON.stringify({capturedAt:new Date().toISOString(),viewport:{width:390,height:844},deviceScaleFactor:2,browser:browser.version(),method:'Working version; seeded RNG and controlled browser clock; actual menu clicks. Not real-device performance measurements.',captures},null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
