const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const records=[];
try{for(const size of [{width:390,height:844},{width:375,height:667},{width:430,height:932}]){
const page=await browser.newPage({viewport:size,deviceScaleFactor:2,isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{let s=20260906;Math.random=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};});
await page.clock.install({time:new Date('2026-09-06T12:00:00Z')});await page.clock.pauseAt(new Date('2026-09-06T12:00:01Z'));
await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.fastForward(12000);
for(const mode of ['unit','montage']){
await page.locator(`#mode-${mode}`).click();const names=[];
for(let round=0;round<(mode==='montage'?7:1);round++){
await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width).map(i=>i.decode()));});
const label=page.locator('#target-character-name');const text=await label.textContent();assert.match(text,/[가-힣]+ [A-Za-z]+/);names.push(text);
const name=await label.boundingBox(),preview=await page.locator('#target-preview').boundingBox(),board=await page.locator('#picture-board').boundingBox();
assert(name.y+name.height<=preview.y+1);assert(name.x>=0&&name.x+name.width<=size.width);assert(board.y+board.height<=size.height);
if(mode==='montage'){const status=await page.locator('#montage-status').boundingBox();assert(status.y>=board.y+board.height);assert(status.y+status.height<=size.height);}
if(size.width===390&&round===0)await page.screenshot({path:path.join(__dirname,`${mode}-after.png`)});
if(mode==='montage'&&round<6){const answer=await page.locator('#target-preview img').getAttribute('src');const srcs=await page.locator('.picture-tile img').evaluateAll(es=>es.map(e=>e.getAttribute('src')));await page.locator('.picture-tile').nth(srcs.indexOf(answer)).click();await page.clock.runFor(250);}
}
if(mode==='montage')assert.equal(new Set(names).size,7);records.push({viewport:size,mode,names});await page.locator('#btn-back').click();
}
await page.locator('#mode-memory').click();assert.equal(await page.locator('#target-character-name').isVisible(),false);assert.deepEqual(errors,[]);await page.close();
}fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(records,null,2)+'\n');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
