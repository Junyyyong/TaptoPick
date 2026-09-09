const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const base=process.env.BASE_URL || 'http://127.0.0.1:5189/';
const loaded=page=>page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width).map(i=>i.decode()));});
async function open(browser,viewport){
  const page=await browser.newPage({viewport,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await page.addInitScript(()=>{
    let state=927;Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
    localStorage.setItem('taptopick.preferences.v1',JSON.stringify({soundOn:false,musicOn:false,hapticsOn:false}));
  });
  await page.clock.install();await page.goto(base,{waitUntil:'networkidle'});await page.clock.fastForward(7000);await loaded(page);return page;
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const report={method:'Chromium mobile emulation, DPR 2; controlled clock and randomness; audio/haptics muted. Not a physical-device test.',cases:[]};
  try{
    for(const viewport of [{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
      const page=await open(browser,viewport);const errors=[];page.on('pageerror',e=>errors.push(e.message));
      assert.deepEqual(await page.locator('.mode-desc').allTextContents(),['Find every puzzle piece.','Find the matching face.','Flip cards. Match pairs.']);
      if(viewport.width===390)await page.screenshot({path:path.join(__dirname,'menu.png'),animations:'disabled'});
      const cases=[];
      for(const mode of ['unit','montage','memory']){
        const initialBoard=await page.locator('#picture-board').innerHTML();
        await page.locator(`#mode-${mode}`).click();
        assert(await page.locator('#screen-mode-intro').isVisible());
        assert(!await page.locator('#screen-game').isVisible());
        assert.equal(await page.evaluate(()=>document.activeElement.id),'btn-mode-intro-start');
        await page.clock.runFor(12000);
        assert.equal(await page.locator('#picture-board').innerHTML(),initialBoard);
        const layout=await page.evaluate(()=>{
          const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
          return {title:rect('mode-intro-title'),mark:rect('mode-intro-mark'),note:rect('mode-intro-note'),start:rect('btn-mode-intro-start'),titleSize:getComputedStyle(document.getElementById('mode-intro-title')).fontSize,overflow:document.documentElement.scrollWidth>innerWidth};
        });
        assert.equal(layout.titleSize,'26px');assert(!layout.overflow);
        assert.equal(layout.mark.width,viewport.height<=620?100:140);
        assert(layout.start.width<=260 && layout.start.height>=48);
        assert(layout.title.bottom<=layout.mark.y && layout.mark.bottom<=layout.note.y && layout.note.bottom<=layout.start.y);
        if(viewport.width===390)await page.screenshot({path:path.join(__dirname,`intro-${mode}.png`),animations:'disabled'});
        await page.keyboard.press('Escape');assert(await page.locator('#screen-title').isVisible());
        assert.equal(await page.evaluate(()=>document.activeElement.id),`mode-${mode}`);
        await page.locator(`#mode-${mode}`).click();await page.locator('#btn-mode-intro-back').click();
        await page.locator(`#mode-${mode}`).click();
        await page.locator('#btn-mode-intro-start').evaluate(button=>{button.click();button.click();});
        await loaded(page);
        assert(await page.locator('#screen-game').isVisible());assert(!await page.locator('#screen-mode-intro').isVisible());
        assert.equal(await page.evaluate(()=>document.activeElement.id),'screen-game');
        assert.equal(await page.locator('#picture-board button').count(),mode==='unit'?49:mode==='montage'?4:16);
        if(mode==='memory'){
          assert.match(await page.locator('#run-clock').textContent(),/LOOK/);
          await page.clock.runFor(3200);assert.match(await page.locator('#run-clock').textContent(),/00:59/);
        }
        await page.locator('#btn-pause').click();const clock=await page.locator('#run-clock').textContent();await page.clock.runFor(3000);
        assert.equal(await page.locator('#run-clock').textContent(),clock);await page.locator('#btn-resume').click();
        await page.locator('#btn-back').click();cases.push({mode,layout,waitBeforeStartMs:12000,backEscapeDoubleStartPause:true});
      }
      if(viewport.width===390){
        await page.locator('#mode-unit').click();await page.locator('#btn-mode-intro-start').click();await loaded(page);
        const wrong=page.locator('#picture-board button:not(:has(img[src*="/HapeeCarrot/"]))').first();
        for(let i=0;i<5;i++){await wrong.click({force:true});await page.clock.runFor(500);}
        await page.clock.runFor(1200);await page.locator('#btn-cheer-continue').click({force:true});
        await page.locator('#btn-again').click();assert(await page.locator('#screen-mode-intro').isVisible());
        assert.equal(await page.locator('#mode-intro-title').textContent(),'PICTURE PIECES');
        await page.clock.runFor(12000);assert(!await page.locator('#screen-game').isVisible());
        await page.locator('#btn-mode-intro-start').click();
        assert.equal(await page.locator('.life-heart.is-empty').count(),0);
        assert.equal(await page.locator('.unit-reveal-color.is-revealed').count(),0);
        report.replayRequiresStart=true;
      }
      assert.deepEqual(errors,[]);report.cases.push({viewport,modes:cases,errors});await page.close();
    }
    // Compare the same random seed with/without cancelled intros: cancellation must consume zero characters.
    const sequences=[];
    for(const cancel of [false,true]){
      const page=await open(browser,{width:390,height:844});const sequence=[];
      for(let i=0;i<14;i++){
        if(cancel)for(let j=0;j<(i%3)+1;j++){await page.locator('#mode-montage').click();await page.locator('#btn-mode-intro-back').click();}
        await page.locator('#mode-montage').click();await page.locator('#btn-mode-intro-start').click();await loaded(page);
        sequence.push(await page.locator('#target-character-name').textContent());await page.locator('#btn-back').click();
      }
      sequences.push(sequence);await page.close();
    }
    assert.deepEqual(sequences[0],sequences[1]);
    assert.equal(new Set(sequences[0].slice(0,7)).size,7);assert.equal(new Set(sequences[0].slice(7)).size,7);
    report.cancelledIntroCharacterSequences=sequences;
    fs.writeFileSync(path.join(__dirname,'checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
