// Run against a local dev server. BEFORE=1 captures the unmodified pause panel.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.clock.install({time:new Date('2026-09-06T12:00:00Z')});await page.clock.pauseAt(new Date('2026-09-06T12:00:01Z'));
 await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.fastForward(12000);
 for(const mode of ['unit','montage','memory']){
 await page.locator(`#mode-${mode}`).click();await page.clock.runFor(4000);
 await page.locator('#btn-pause').click();
 const clock=await page.locator('#run-clock').textContent();await page.clock.runFor(2000);assert.equal(await page.locator('#run-clock').textContent(),clock);
 if(mode==='unit'){
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:path.join(__dirname,process.env.BEFORE?'before.png':'after.png')});
 }
 if(process.env.BEFORE)break;
 await page.locator('#btn-resume').click();assert.equal(await page.locator('#help-layer').isVisible(),false);
 await page.clock.runFor(1000);
 if(mode==='memory')assert.notEqual(await page.locator('#run-clock').textContent(),clock);
 await page.locator('#btn-pause').click();await page.locator('#btn-pause-menu').click();
 assert.equal(await page.locator('#mode-unit').isVisible(),true);assert.equal(await page.locator('#help-layer').isVisible(),false);
 await page.clock.runFor(2000);assert.equal(await page.locator('#mode-unit').isVisible(),true);
 await page.locator(`#mode-${mode}`).click();await page.clock.runFor(200);
 await page.locator('#btn-pause').click();await page.locator('#btn-help-close').click();
 assert.equal(await page.locator('#help-layer').isVisible(),false);
 await page.locator('#btn-back').click();console.log(`${mode}: pause, resume, menu, restart and close passed`);
 }
 assert.deepEqual(errors,[]);
 if(!process.env.BEFORE)fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify({date:new Date().toISOString(),viewport:{width:390,height:844},deviceScaleFactor:2,modes:['unit','montage','memory'],checks:['pause freezes clock','resume restores play and memory clock','main menu exits without resuming','new game can start','close still resumes'],errors},null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
