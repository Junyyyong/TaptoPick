const {chromium}=require('playwright');const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const results=[];
try{for(const size of [{width:390,height:844},{width:375,height:667},{width:320,height:568}]){
const page=await browser.newPage({viewport:size,deviceScaleFactor:2,isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.clock.install({time:new Date('2026-09-06T12:00:00Z')});await page.clock.pauseAt(new Date('2026-09-06T12:00:01Z'));
await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.fastForward(12000);await page.locator('#btn-title-tutorial').click();
for(const [mode,taps] of [['unit',9],['montage',1],['memory',4]]){
await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width).map(i=>i.decode()));});
const skip=await page.locator('[data-skip]').boundingBox();assert(skip.x>size.width/2);assert(skip.y<70);
const panel=await page.locator('.visual-practice-panel').boundingBox();assert.equal(panel.x,0);assert.equal(panel.width,size.width);
assert.equal(await page.locator('[data-retry],.visual-practice-arrow').count(),0);
if(mode==='memory'){
assert.equal(await page.locator('.visual-practice-preview').count(),0);
assert.equal(await page.locator('.practice-tile.is-revealed').count(),4);
assert.equal(await page.locator('.practice-tile:enabled').count(),0);
assert.equal(await page.locator('.practice-tile').first().evaluate(e=>getComputedStyle(e).filter),'none');
if(size.width===390)await page.screenshot({path:path.join(__dirname,'memory-preview.png')});
assert.equal(await page.locator('.practice-countdown').textContent(),'3');
await page.clock.fastForward(1000);assert.equal(await page.locator('.practice-countdown').textContent(),'2');
await page.clock.fastForward(1000);assert.equal(await page.locator('.practice-countdown').textContent(),'1');
await page.clock.fastForward(999);assert.equal(await page.locator('.practice-tile.is-revealed').count(),4);
await page.clock.fastForward(1);assert.equal(await page.locator('.practice-tile.is-revealed').count(),0);
}else{const preview=await page.locator('.visual-practice-preview').boundingBox();assert(preview.height>=size.height*.29);}
assert.equal(await page.locator('.help-body').evaluate(e=>e.scrollHeight>e.clientHeight+1),false);
assert.equal(await page.locator('[data-next]').isVisible(),false);
if(size.width===390)await page.screenshot({path:path.join(__dirname,`${mode}.png`)});
for(let i=0;i<taps;i++){
assert.equal(await page.locator('.practice-tile.is-guided').count(),1);assert.equal(await page.locator('.practice-tile:enabled').count(),1);
await page.locator('.practice-tile.is-guided').click();}
assert.equal(await page.locator('.practice-tile.is-guided').count(),0);assert.equal(await page.locator('[data-next]').isVisible(),true);
assert.equal(await page.locator('.practice-status').textContent(),'');
const next=await page.locator('[data-next]').boundingBox();assert(next.y+next.height<=size.height-10);
if(size.width===390&&mode==='memory')await page.screenshot({path:path.join(__dirname,'complete.png')});
await page.locator('[data-next]').click();}
assert.equal(await page.locator('#help-layer').isVisible(),false);
await page.locator('#btn-title-tutorial').click();await page.locator('[data-practice-mode="memory"]').click();await page.locator('[data-practice-mode="unit"]').click();await page.clock.fastForward(2500);assert.equal(await page.locator('.practice-tile.is-guided').count(),1);
await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.practice-tile.is-guided').evaluate(e=>getComputedStyle(e).animationName),'none');
await page.locator('[data-skip]').click();assert.equal(await page.locator('#help-layer').isVisible(),false);
await page.locator('#btn-title-settings').click();assert.equal(await page.locator('.help-head').isVisible(),true);await page.locator('#btn-help-close').click();
assert.deepEqual(errors,[]);results.push({viewport:size,passed:true,errors});await page.close();}
fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(results,null,2)+'\n');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
