const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const before=process.argv.includes('--before');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const report={before,method:'Chromium mobile emulation, DPR 2, controlled clock; actual mode buttons and START.',cases:[]};
  try{
    for(const [width,height] of [[390,844],[320,568]]){
      const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>localStorage.setItem('taptopick.preferences.v1',JSON.stringify({soundOn:false,musicOn:false,hapticsOn:false})));
      await page.clock.install();await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.fastForward(7000);
      for(const mode of ['unit','montage','memory']){
        await page.locator(`#mode-${mode}`).click();
        await page.evaluate(()=>document.fonts.ready);
        const svg=page.locator('#screen-mode-intro svg').last();
        const box=await svg.boundingBox();assert(box.width>0&&box.x>=0&&box.x+box.width<=width);
        assert.equal(await svg.getAttribute('aria-hidden'),'true');
        if(width===390)await page.screenshot({path:path.join(__dirname,`${before?'before':'after'}-${mode}.png`),animations:'disabled'});
        await page.locator('#btn-mode-intro-start').click();
        assert.equal(await page.locator('#picture-board button').count(),mode==='unit'?49:mode==='montage'?4:16);
        report.cases.push({width,height,mode,box});
        await page.locator('#btn-back').click();
      }
      assert.deepEqual(errors,[]);await page.close();
    }
    fs.writeFileSync(path.join(__dirname,`${before?'before':'after'}-checks.json`),JSON.stringify(report,null,2)+'\n');console.log(report);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
