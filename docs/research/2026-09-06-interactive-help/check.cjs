const {chromium}=require('playwright');const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const results=[];
try{for(const size of [{width:390,height:844},{width:375,height:667}]){
 const page=await browser.newPage({viewport:size,deviceScaleFactor:2,isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-09-06T12:00:00Z')});await page.clock.pauseAt(new Date('2026-09-06T12:00:01Z'));
 await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.fastForward(12000);
 await page.locator('#btn-title-tutorial').click();
 const sources=()=>page.locator('.practice-tile img').evaluateAll(es=>es.map(e=>e.getAttribute('src')));
 const shot=async(name)=>{await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width).map(i=>i.decode()));document.querySelector('#help-body').scrollTop=0;});if(size.width===390)await page.screenshot({path:path.join(__dirname,name+'.png')});};
 await shot('unit');let srcs=await sources();
 await page.locator('.practice-tile').nth(srcs.findIndex(s=>!s.includes('/Tepee/'))).click();assert.match(await page.locator('.practice-status').textContent(),/Not this piece/);
 for(let i=0;i<srcs.length;i++)if(srcs[i].includes('/Tepee/'))await page.locator('.practice-tile').nth(i).click();
 assert.match(await page.locator('.practice-status').textContent(),/complete/);await page.locator('[data-next]').click();
 await shot('montage');srcs=await sources();await page.locator('.practice-tile').nth(srcs.findIndex(s=>s.includes('variation'))).click();
 await page.locator('.practice-tile').nth(srcs.findIndex(s=>s.includes('answer'))).click();assert.match(await page.locator('.practice-status').textContent(),/complete/);
 await page.locator('[data-retry]').click();assert.equal(await page.locator('[data-next]').isDisabled(),true);
 await page.locator('[data-practice-mode="memory"]').click();await shot('memory');srcs=await sources();
 const first=0,other=srcs.findIndex(s=>s!==srcs[0]);await page.locator('.practice-tile').nth(first).click();await page.locator('.practice-tile').nth(other).click();
 assert.equal(await page.locator('.practice-tile.is-revealed').count(),2);await page.clock.runFor(700);assert.equal(await page.locator('.practice-tile.is-revealed').count(),0);
 const groups=new Map();srcs.forEach((s,i)=>groups.set(s,[...(groups.get(s)||[]),i]));for(const indices of groups.values())for(const i of indices)await page.locator('.practice-tile').nth(i).click();
 assert.match(await page.locator('.practice-status').textContent(),/complete/);await shot('memory-complete');await page.locator('[data-next]').click();assert.equal(await page.locator('#help-layer').isVisible(),false);
 // Leave a mismatch pending, then change practice: the old timeout must not update the new one.
 await page.locator('#btn-title-tutorial').click();await page.locator('[data-practice-mode="memory"]').click();srcs=await sources();await page.locator('.practice-tile').nth(0).click();await page.locator('.practice-tile').nth(srcs.findIndex(s=>s!==srcs[0])).click();
 await page.locator('[data-practice-mode="unit"]').click();const text=await page.locator('.practice-status').textContent();await page.clock.runFor(800);assert.equal(await page.locator('.practice-status').textContent(),text);
 for(const mode of ['unit','montage','memory']){
 await page.locator(`[data-practice-mode="${mode}"]`).click();await page.locator('[data-play]').click();assert.equal(await page.locator('#help-layer').isVisible(),false);assert.equal(await page.locator('#screen-game').isVisible(),true);
 await page.locator('#btn-back').click();await page.locator('#btn-title-tutorial').click();assert.equal(await page.locator('[data-next]').isDisabled(),true);
 }
 await page.locator('#btn-help-close').click();await page.clock.runFor(1000);assert.equal(await page.locator('#help-layer').isVisible(),false);
 assert.deepEqual(errors,[]);results.push({viewport:size,passed:true,errors});await page.close();
}fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(results,null,2)+'\n');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
