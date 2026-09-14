const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try {
  for(const reducedMotion of ['no-preference','reduce']) {
   const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>localStorage.setItem('taptopick.preferences.v1',JSON.stringify({soundOn:false,musicOn:false,hapticsOn:false})));
   await page.clock.install();await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.runFor(7000);
   await page.locator('#mode-montage').click();await page.locator('#btn-mode-intro-start').click();
   await page.locator('.montage-target-image').evaluate(i=>i.decode());
   if(reducedMotion==='no-preference')await page.screenshot({path:path.join(__dirname,'before.png')});
   await page.evaluate(()=>{
    const answer=document.querySelector('.montage-target-image').src;
    [...document.querySelectorAll('.picture-tile')].find(b=>b.querySelector('img').src!==answer).click();
   });
   assert.equal(await page.locator('.is-answer-hint').count(),1);
   assert.equal(await page.locator('.life-heart.is-empty').count(),1);
   assert(await page.locator('.is-answer-hint').evaluate(b=>b.querySelector('img').src===document.querySelector('.montage-target-image').src));
   const animation=await page.locator('.is-answer-hint').evaluate(b=>getComputedStyle(b).animationName);
   assert.equal(animation,reducedMotion==='reduce'?'montage-answer-still':'montage-answer-glow');
   // Sample the animation peak deterministically for the research image.
   await page.locator('.is-answer-hint').evaluate(b=>{for(const a of b.getAnimations()){a.pause();a.currentTime=550;}});
   await page.clock.runFor(600);
   if(reducedMotion==='no-preference')await page.screenshot({path:path.join(__dirname,'after.png')});
   // Finish the visual animation: it must clean up without accepting the answer.
   await page.evaluate(()=>{const b=document.querySelector('.is-answer-hint');if(b)for(const a of b.getAnimations())a.finish();});
   await page.clock.runFor(100);
   await page.waitForFunction(()=>!document.querySelector('.is-answer-hint'));
   assert.equal(await page.locator('.picture-tile.is-found').count(),0);
   await page.evaluate(()=>{
    const answer=document.querySelector('.montage-target-image').src;
    const buttons=[...document.querySelectorAll('.picture-tile')];
    buttons.find(b=>b.querySelector('img').src!==answer).click();
    buttons.find(b=>b.querySelector('img').src===answer).click();
   });
   assert.equal(await page.locator('.is-answer-hint').count(),0);
   await page.clock.runFor(300);
   assert.equal(await page.locator('.is-answer-hint').count(),0);
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: exact answer only, heart loss, three-pulse / reduced-motion style, expiry, correct pick and next-round cleanup');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
