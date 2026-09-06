const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const results=[];
try{for(const size of [{width:390,height:844},{width:375,height:667},{width:430,height:932}]){
const page=await browser.newPage({viewport:size,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{let s=20260906;Math.random=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};});
await page.clock.install({time:new Date('2026-09-06T12:00:00Z')});await page.clock.pauseAt(new Date('2026-09-06T12:00:01Z'));
await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.fastForward(12000);await page.locator('#mode-montage').click();
await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width).map(i=>i.decode()));});
if(size.width===390)await page.screenshot({path:path.join(__dirname,process.env.BEFORE?'before.png':'after.png')});
if(!process.env.BEFORE){for(let round=0;round<=13;round++){
const board=await page.locator('#picture-board').boundingBox(),status=await page.locator('#montage-status').boundingBox();
assert(status.y>=board.y+board.height);assert(Math.abs(status.x+status.width-board.x-board.width)<2);assert(status.y+status.height<=size.height);
if([0,3,8,13].includes(round))results.push({viewport:size,round,board,status,text:await page.locator('#montage-status').textContent()});
if(round<13){const answer=await page.locator('#target-preview img').getAttribute('src');const sources=await page.locator('.picture-tile img').evaluateAll(es=>es.map(e=>e.getAttribute('src')));await page.locator('.picture-tile').nth(sources.indexOf(answer)).click();await page.clock.runFor(250);}
}
await page.locator('#btn-back').click();for(const mode of ['unit','memory']){await page.locator(`#mode-${mode}`).click();assert.equal(await page.locator('#montage-status').isVisible(),false);await page.locator('#btn-back').click();}}
assert.deepEqual(errors,[]);await page.close();if(process.env.BEFORE)break;
}if(!process.env.BEFORE)fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(results,null,2)+'\n');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
