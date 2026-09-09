const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const before=process.argv.includes('--before');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{let state=79;Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};localStorage.setItem('taptopick.preferences.v1',JSON.stringify({soundOn:false,musicOn:false,hapticsOn:false}));});
    await page.clock.install();await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.fastForward(7000);
    await page.locator('#mode-memory').click();await page.locator('#btn-mode-intro-start').click();
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width).map(i=>i.decode()));});
    await page.clock.runFor(3100);
    const cards=page.locator('.memory-card:not(.is-free)');
    const srcs=await cards.locator('img').evaluateAll(es=>es.map(i=>i.getAttribute('src')));
    const pair=[0,srcs.findIndex((src,i)=>i>0&&src===srcs[0])];assert(pair[1]>0);
    const box=await cards.nth(0).boundingBox();
    await cards.nth(pair[0]).click({force:true});await cards.nth(pair[1]).click({force:true});
    assert.equal(await page.locator('.memory-card.is-matched').count(),2);
    // Freeze both correct-match animations at their 70% glow keyframe for a fair comparison.
    await page.locator('.is-pick-hit').evaluateAll(es=>es.forEach(e=>e.getAnimations().forEach(a=>{if(a.animationName==='pick-hit'){a.pause();a.currentTime=154;}})));
    const glow=await cards.nth(0).evaluate(e=>({gradient:getComputedStyle(e,'::before').backgroundImage,shadow:getComputedStyle(e).boxShadow,animation:getComputedStyle(e).animationDuration}));
    assert.equal(glow.animation,'0.22s');
    if(!before){assert(glow.gradient.includes('0.5'));assert(glow.shadow.includes('0.22'));}
    await page.screenshot({path:path.join(__dirname,`${before?'before':'after'}.png`)});
    await page.locator('.is-pick-hit').evaluateAll(es=>es.forEach(e=>e.getAnimations().forEach(a=>a.finish())));
    await page.clock.runFor(400);
    assert.deepEqual(await cards.nth(0).boundingBox(),box);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await cards.nth(0).evaluate(e=>getComputedStyle(e).animationName),'none');
    assert.deepEqual(errors,[]);
    const report={before,method:'390×844 CSS pixels, DPR 2 mobile Chromium emulation; real pair clicks, seeded random; match CSS animation paused at 154ms (70%).',pair,glow,matchedCards:2,geometryUnchanged:true,reducedMotionHonored:true,errors};
    fs.writeFileSync(path.join(__dirname,`${before?'before':'after'}-checks.json`),JSON.stringify(report,null,2)+'\n');console.log(report);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
