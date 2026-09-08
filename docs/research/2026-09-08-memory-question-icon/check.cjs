/** Run against the local Vite server with NODE_PATH pointing to Playwright. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const loaded = page => page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].filter(i => i.getBoundingClientRect().width).map(i => i.decode()));
});
const inspect = page => page.locator('.memory-card').evaluateAll(cards => cards.map(card => {
  const rect = card.getBoundingClientRect();
  const back = card.querySelector('.memory-back');
  const icon = back?.querySelector('svg');
  const r = icon?.getBoundingClientRect();
  return {width:rect.width,height:rect.height,free:card.classList.contains('is-free'),
    backText:back?.textContent,opacity:back ? getComputedStyle(back).opacity : null,
    label:card.getAttribute('aria-label'),icon:icon ? {width:r.width,height:r.height,
      centered:Math.abs(r.x+r.width/2-rect.x-rect.width/2)<1 && Math.abs(r.y+r.height/2-rect.y-rect.height/2)<1,
      decorative:icon.getAttribute('aria-hidden')==='true' && icon.getAttribute('focusable')==='false',
      vectorOnly:icon.querySelectorAll('path').length===1 && icon.querySelectorAll('circle').length===1 && !icon.querySelector('text,image,use')} : null};
}));
(async () => {
  const browser = await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const report = {capturedAt:new Date().toISOString(),browserVersion:browser.version(),
    method:'Chromium mobile emulation, DPR 2, seeded random and controlled clock. Real UI interactions; not a physical-device or user-study measurement.',cases:[]};
  try {
    await Promise.all([{width:390,height:844},{width:375,height:667},{width:320,height:568}].map(async viewport => {
      const page = await browser.newPage({viewport,deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US'});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(() => {
        let state=20260908;
        Math.random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};
        localStorage.setItem('taptopick.preferences.v1',JSON.stringify({soundOn:false,musicOn:false,hapticsOn:false}));
      });
      await page.clock.install({time:new Date('2026-09-08T12:00:00Z')});
      await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5189/',{waitUntil:'networkidle'});
      await page.clock.fastForward(7000);
      await page.locator('#mode-memory').click();await loaded(page);
      const stages=[];
      for (let stage=0;stage<4;stage++) {
        const preview=await inspect(page);
        assert(preview.filter(c=>!c.free).every(c=>c.opacity==='0'));
        await page.clock.runFor(3100);
        const cards=await inspect(page);
        assert.equal(cards.length,(stage+4)**2);
        for (const c of cards) {
          assert(Math.abs(c.width-c.height)<1);
          if(c.free) {assert.equal(c.icon,null);continue;}
          assert.equal(c.backText,'');assert.equal(c.opacity,'1');
          assert(c.icon.decorative && c.icon.vectorOnly && c.icon.centered);
          assert(c.icon.width>0 && c.icon.width<=52 && c.icon.width<c.width);
          assert(Math.abs(c.icon.width-Math.min((c.width-2)*.58,52))<1);
          assert.equal(c.label,'Face-down picture card');
        }
        assert(cards.every((c,i)=>Math.abs(c.width-preview[i].width)<1 && Math.abs(c.height-preview[i].height)<1));
        const shot=viewport.width===390 && (stage===0 || stage===3) ? `after-memory-${stage+4}x${stage+4}.png` : null;
        if(shot) await page.screenshot({path:path.join(__dirname,shot),animations:'disabled'});
        stages.push({size:stage+4,card:cards[0],cardCount:cards.length,freeCount:cards.filter(c=>c.free).length,screenshot:shot});
        if(stage===3) break;
        const srcs=await page.locator('.memory-card:not(.is-free) img').evaluateAll(es=>es.map(i=>i.getAttribute('src')));
        const groups=new Map();srcs.forEach((src,i)=>groups.set(src,[...(groups.get(src)||[]),i]));
        // First open two different faces and immediately retry after a mismatch.
        const first=[...groups.values()][0][0],other=[...groups.values()][1][0];
        await page.locator('.memory-card:not(.is-free)').nth(first).click({force:true});
        await page.locator('.memory-card:not(.is-free)').nth(other).click({force:true});
        await page.clock.runFor(500);
        const mismatch=await inspect(page);
        assert(mismatch.every((c,i)=>Math.abs(c.width-cards[i].width)<1 && Math.abs(c.height-cards[i].height)<1));
        for(const indexes of groups.values())for(let i=0;i<indexes.length;i+=2) {
          await page.locator('.memory-card:not(.is-free)').nth(indexes[i]).click({force:true});
          await page.locator('.memory-card:not(.is-free)').nth(indexes[i+1]).click({force:true});
          await page.clock.runFor(400);
        }
        await page.clock.runFor(900);await loaded(page);
      }
      await page.locator('#btn-pause').click();await page.locator('#btn-pause-menu').click();
      await page.locator('#btn-title-tutorial').click();await loaded(page);
      assert.equal(await page.locator('.practice-question').count(),0);
      await page.locator('[data-practice-mode="montage"]').click();await loaded(page);
      assert.equal(await page.locator('.practice-question').count(),0);
      await page.locator('[data-practice-mode="memory"]').click();await loaded(page);
      await page.clock.runFor(3100);
      assert.equal(await page.locator('.practice-question svg.memory-question-icon').count(),4);
      assert.equal(await page.locator('.practice-question:visible').count(),4);
      if(viewport.width===390)await page.screenshot({path:path.join(__dirname,'after-tutorial.png'),animations:'disabled'});
      // The guide deliberately pulses forever, so bypass the automation stability wait.
      for(let i=0;i<4;i++) {await page.locator('.practice-tile.is-guided').click({force:true});await page.clock.runFor(400);}
      assert.equal(await page.locator('.practice-question:visible').count(),0);
      assert.deepEqual(errors,[]);
      report.cases.push({viewport,deviceScaleFactor:2,stages,tutorialCompleted:true,errors});
      console.log(`Passed ${viewport.width}×${viewport.height}: four board sizes and tutorial.`);
      await page.close();
    }));
    fs.writeFileSync(path.join(__dirname,'checks.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
