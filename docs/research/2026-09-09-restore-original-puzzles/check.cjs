const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const folders=['Bb','Ha','Hoo','Ja','Pino','Tapee','Tepee','HapeeCarrot','HapeeCarrot02','TapeeBack','TepeeBack','HooopeeBack'];
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const report={method:'Mobile Chromium emulation, controlled clock and seeded random; the next random draw before START selects each of the 12 artworks for coverage.',cases:[]};
  try{
    for(const [width,height] of [[390,844],[320,568]]){
      const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{let state=79;Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};localStorage.setItem('taptopick.preferences.v1',JSON.stringify({soundOn:false,musicOn:false,hapticsOn:false}));});
      await page.clock.install();await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.fastForward(7000);
      for(let index=0;index<folders.length;index++){
        const folder=folders[index];
        await page.locator('#mode-unit').click();
        await page.evaluate(index=>{const random=Math.random;Math.random=()=>{Math.random=random;return(index+.5)/12;};},index);
        await page.locator('#btn-mode-intro-start').click();
        await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width).map(i=>i.decode()));});
        assert((await page.locator('.unit-reveal-base').getAttribute('src')).includes(`/${folder}.webp`));
        assert.equal(await page.locator('#picture-board button').count(),49);
        const targets=page.locator(`#picture-board button:has(img[src*="/${folder}/"])`);
        const count=await targets.count();assert([9,12].includes(count));
        assert.equal(await page.locator('.unit-reveal-color').count(),count);
        const box=await page.locator('.unit-reveal').boundingBox();
        assert(Math.abs(box.width/box.height-(count===12?.75:1))<.01);
        await page.locator(`#picture-board button:not(:has(img[src*="/${folder}/"]))`).first().click({force:true});
        assert.equal(await page.locator('.unit-reveal-color.is-revealed').count(),0);
        for(let i=0;i<3;i++){await targets.nth(i).click({force:true});await page.clock.runFor(400);}
        assert.equal(await page.locator('.unit-reveal-color.is-revealed').count(),3);
        if(width===390&&['Ha','Tapee','HapeeCarrot'].includes(folder))await page.screenshot({path:path.join(__dirname,`${folder}.png`),animations:'disabled'});
        for(let i=3;i<count;i++){await targets.nth(i).click({force:true});await page.clock.runFor(50);}
        assert.equal(await page.locator('.unit-reveal-color.is-revealed').count(),count);
        report.cases.push({width,height,folder,targets:count,decoys:49-count,allPiecesRevealed:true,box});
        await page.locator('#btn-back').click({force:true});
      }
      assert.deepEqual(errors,[]);await page.close();
    }
    fs.writeFileSync(path.join(__dirname,'checks.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
