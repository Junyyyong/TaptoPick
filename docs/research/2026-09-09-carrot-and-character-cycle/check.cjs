const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const loaded=page=>page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width).map(i=>i.decode()));});
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const report={method:'Chromium mobile emulation at DPR 2. Seeded randomness and controlled clock, sound/music/haptics muted; not a real-device or user-study measurement.',cases:[]};
  try{
    for(const viewport of [{width:390,height:844},{width:320,height:568}]){
      const page=await browser.newPage({viewport,deviceScaleFactor:2,isMobile:true,hasTouch:true});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(seed=>{
        let state=seed;Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
        localStorage.setItem('taptopick.preferences.v1',JSON.stringify({soundOn:false,musicOn:false,hapticsOn:false}));
      },viewport.width);
      await page.clock.install();
      await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.fastForward(7000);
      await page.locator('#mode-unit').click();await loaded(page);
      assert.equal(await page.locator('#target-character-name').textContent(),'해피 Hapee');
      assert.equal(await page.locator('#picture-board button').count(),49);
      const targets=page.locator('#picture-board button:has(img[src*="/HapeeCarrot/"])');
      assert.equal(await targets.count(),9);
      const geometry=await page.locator('.unit-reveal').boundingBox();assert(Math.abs(geometry.width-geometry.height)<1);
      assert.equal(await page.locator('.unit-reveal--grid .unit-reveal-color').count(),9);
      assert.equal(await page.locator('.unit-reveal-color.is-revealed').count(),0);
      const shot=async name=>{if(viewport.width===390)await page.screenshot({path:path.join(__dirname,`${name}.png`),animations:'disabled'});};
      await shot('unit-gray');
      await page.locator('#picture-board button:not(:has(img[src*="/HapeeCarrot/"]))').first().click({force:true});await page.clock.runFor(400);
      assert.equal(await page.locator('.unit-reveal-color.is-revealed').count(),0);
      for(let i=0;i<9;i++){
        const src=await targets.nth(i).locator('img').getAttribute('src');
        const pieceIndex=Number(src.match(/\/(\d+)\.webp/)[1])-1;
        await targets.nth(i).click({force:true});await page.clock.runFor(300);
        assert(await page.locator(`.unit-reveal-color[data-piece-index="${pieceIndex}"]`).evaluate(el=>el.classList.contains('is-revealed')));
        assert.equal(await page.locator('.unit-reveal-color.is-revealed').count(),i+1);
        if(i===2)await shot('unit-three-pieces');
      }
      await shot('unit-complete');
      await page.locator('#btn-back').click();
      await page.locator('#mode-montage').click();await loaded(page);
      const sequence=[],sides=[];
      for(let i=0;i<28;i++){
        const name=await page.locator('#target-character-name').textContent();sequence.push(name);
        sides.push(Math.sqrt(await page.locator('#picture-board button').count()));
        if(i===0)await shot('montage');
        if(i>=17){
          // Abandon/restart repeatedly: the remaining character bag must survive.
          await page.locator('#btn-back').click();await page.locator('#mode-montage').click();await loaded(page);
          continue;
        }
        const answer=await page.locator('#target-preview img').getAttribute('src');
        const buttons=page.locator('#picture-board button');
        const sources=await buttons.locator('img').evaluateAll(es=>es.map(e=>e.getAttribute('src')));
        assert.equal(sources.filter(src=>src===answer).length,1);
        if(i===0){
          await buttons.nth(sources.findIndex(src=>src!==answer)).click({force:true});await page.clock.runFor(400);
          assert.equal(await page.locator('#target-character-name').textContent(),name);
          await page.locator('#btn-pause').click();await page.locator('#btn-resume').click();
          assert.equal(await page.locator('#target-character-name').textContent(),name);
        }
        await buttons.nth(sources.indexOf(answer)).click({force:true});await page.clock.runFor(1150);await loaded(page);
      }
      for(let start=0;start<28;start+=7){
        assert.equal(new Set(sequence.slice(start,start+7)).size,7);
        if(start)assert.notEqual(sequence[start],sequence[start-1]);
      }
      assert.deepEqual([...new Set(sides.slice(0,18))],[2,3,4,5]);
      assert.deepEqual(errors,[]);
      report.cases.push({viewport,unit:{pieces:9,decoys:40,allRevealed:true,square:true},montageSequence:sequence,boardSides:sides,errors});
      await page.close();
    }
    assert.notDeepEqual(report.cases[0].montageSequence.slice(0,7),report.cases[1].montageSequence.slice(0,7));
    fs.writeFileSync(path.join(__dirname,'checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
