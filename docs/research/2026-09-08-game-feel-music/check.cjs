const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const url = process.env.PICK_TEST_URL || 'http://127.0.0.1:5189';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const report=[];
 try {
  for(const viewport of [{width:390,height:844},{width:375,height:667},{width:320,height:568}]) {
   const page=await browser.newPage({viewport,deviceScaleFactor:2,isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    let seed=20260908;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    window.__loops=[];
    const Native=window.AudioContext;
    if(Native)window.AudioContext=class extends Native {
     createBufferSource(){const s=super.createBufferSource(),start=s.start.bind(s),stop=s.stop.bind(s),r={live:false};
      s.start=(...args)=>{if(s.loop){r.live=true;window.__loops.push(r);}return start(...args);};
      s.stop=(...args)=>{r.live=false;return stop(...args);};return s;}
    };
   });
   await page.clock.install({time:new Date('2026-09-08T03:00:00Z')});
   await page.clock.pauseAt(new Date('2026-09-08T03:00:01Z'));
   await page.goto(url,{waitUntil:'networkidle'});await page.clock.fastForward(7000);
   const loaded=()=>page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width).map(i=>i.decode()));});
   const shot=async name=>{await loaded();if(viewport.width===390)await page.screenshot({path:path.join(__dirname,`${name}.png`)});};
   const loopCount=()=>page.evaluate(()=>window.__loops.filter(r=>r.live).length);
   const result=async()=>{
    await page.clock.runFor(1200);await page.locator('#btn-cheer-continue').click();
    assert(await page.locator('#result-layer').isVisible());assert.equal(await loopCount(),0);
    const button=await page.locator('#btn-again').boundingBox();assert(button.y+button.height<=viewport.height);
   };
   const unitTargets=async()=>{
    const alt=await page.locator('#target-preview .unit-reveal').getAttribute('aria-label');
    const names={Tapee:'tapee',Tepee:'tepee',Hooopee:'hoo',Hapee:'ha',Zapee:'ja',Bbogles:'bb',PinoPan:'pino'};
    return names[alt.split(' ')[0]];
   };
   const solveMontage=async(delay=230)=>{
    const target=await page.locator('#target-preview img').getAttribute('src');
    const candidates=await page.locator('#picture-board .picture-tile img').evaluateAll(es=>es.map(e=>e.getAttribute('src')));
    await page.locator('#picture-board .picture-tile').nth(candidates.indexOf(target)).click({force:true});await page.clock.runFor(delay);await loaded();
   };
   await page.locator('#mode-unit').click();await loaded();
   await page.waitForFunction(()=>window.__loops.some(r=>r.live));assert.equal(await loopCount(),1);
   const id=await unitTargets(),targets=page.locator(`.picture-tile[aria-label="${id} picture piece"]`),count=await targets.count();
   await targets.first().click();assert(await targets.first().evaluate(e=>e.classList.contains('is-pick-hit')));await page.clock.runFor(100);await shot('after-unit-pick');
   await page.locator('#btn-pause').click();assert.equal(await loopCount(),0);
   await page.locator('#btn-pause-music').click();assert.equal(await page.locator('#btn-pause-music').getAttribute('aria-pressed'),'false');
   await page.locator('#btn-pause-music').click();assert.equal(await loopCount(),0);
   await page.clock.fastForward(5000);await page.locator('#btn-resume').click();
   await page.waitForFunction(()=>window.__loops.filter(r=>r.live).length===1);
   for(let i=1;i<count;i++)await targets.nth(i).click({force:true});
   assert(await page.locator('#screen-game').evaluate(e=>e.classList.contains('is-complete-moment')));
   assert.equal(await loopCount(),0);await page.clock.runFor(400);await shot('after-unit-complete');await result();await shot('after-unit-result');
   assert.match(await page.locator('#result-detail').textContent(),/1,500 points/);
   assert.equal(await page.locator('#result-kicker').textContent(),'NEW BEST');
   await page.locator('#btn-result-menu').click();await page.locator('#mode-unit').click();await loaded();
   const failId=await unitTargets();const wrong=page.locator(`.picture-tile:not([aria-label="${failId} picture piece"])`).first();
   for(let i=0;i<5;i++)await wrong.click({force:true});
   assert.equal(await page.locator('#cheer-word').textContent(),'TRY AGAIN');await result();assert.equal(await page.locator('#result-title').textContent(),'GAME OVER');
   await page.locator('#btn-result-menu').click();await page.locator('#mode-montage').click();await loaded();
   await solveMontage();await solveMontage();await solveMontage(300);await shot('after-montage-stage');
   assert.match(await page.locator('#pick-moment').textContent(),/STAGE CLEAR/);await page.clock.runFor(850);await loaded();
   const bad=page.locator('.picture-tile').filter({has:page.locator('img[src*="variation"]')}).first();
   for(let i=0;i<5;i++)await bad.click({force:true});await result();await shot('after-montage-result');
   assert.equal(await page.locator('.result-primary').textContent(),'3');
   await page.locator('#btn-result-menu').click();await page.locator('#mode-memory').click();await loaded();await page.clock.runFor(3100);
   const solveStage=async()=>{
    const srcs=await page.locator('.memory-card:not(.is-free) img').evaluateAll(es=>es.map(e=>e.getAttribute('src')));
    const groups=new Map();srcs.forEach((src,i)=>groups.set(src,[...(groups.get(src)||[]),i]));
    for(const indexes of groups.values())for(let i=0;i<indexes.length;i+=2){
     await page.locator('.memory-card:not(.is-free)').nth(indexes[i]).click({force:true});
     await page.locator('.memory-card:not(.is-free)').nth(indexes[i+1]).click({force:true});
     await page.clock.runFor(350);
    }
   };
   await solveStage();await shot('after-memory-stage');await page.clock.runFor(800);await loaded();
   assert.match(await page.locator('.memory-stage-label').textContent(),/STAGE 2/);
   await page.clock.runFor(3100);await page.locator('#btn-pause').click();const time=await page.locator('#run-clock').textContent();
   await page.clock.fastForward(10000);assert.equal(await page.locator('#run-clock').textContent(),time);
   await page.locator('#btn-resume').click();await page.clock.fastForward(61000);await result();await shot('after-memory-result');
   assert.equal(await page.locator('.result-primary').textContent(),'1/4');
   await page.locator('#btn-again').click();assert.match(await page.locator('.memory-stage-label').textContent(),/STAGE 1/);
   await page.locator('#btn-back').click();assert.equal(await loopCount(),0);
   await page.locator('#btn-title-settings').click();await shot('after-settings');
   await page.locator('[data-setting="music"]').click();assert.equal(await page.locator('[data-setting="music"] [role="switch"]').getAttribute('aria-checked'),'false');
   await page.locator('#btn-help-close').click();await page.locator('#mode-unit').click();await loaded();assert.equal(await loopCount(),0);
   await page.locator('#btn-back').click();await page.reload({waitUntil:'networkidle'});await page.clock.fastForward(7000);await page.locator('#btn-title-settings').click();
   assert.equal(await page.locator('[data-setting="music"] [role="switch"]').getAttribute('aria-checked'),'false');
   assert(await page.evaluate(()=>!!localStorage.getItem('taptopick.records.v1')));
   await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#btn-help-close').click();await page.locator('#mode-unit').click();await loaded();
   const reduced=await unitTargets();await page.locator(`.picture-tile[aria-label="${reduced} picture piece"]`).first().click();
   assert.equal(await page.locator('.is-pick-hit').first().evaluate(e=>getComputedStyle(e).animationName),'none');
   assert.deepEqual(errors,[]);report.push({viewport,deviceScaleFactor:2,passed:true,errors});await page.close();
  }
  fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(report,null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
