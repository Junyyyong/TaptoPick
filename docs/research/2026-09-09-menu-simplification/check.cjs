// Run with NODE_PATH pointing to Playwright. Start Vite on 5189 first.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const before=process.argv.includes('--before');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const report={revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),before,
    source:before?'Clean working tree at recorded revision':'Working tree after removing menu entries',
    method:'Chromium mobile emulation, not a physical-device screenshot. Music, effects and haptics muted. Controlled clock.',cases:[]};
  try{
    for(const viewport of [{width:390,height:844},{width:320,height:568}]){
      const page=await browser.newPage({viewport,deviceScaleFactor:2,isMobile:true,hasTouch:true});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>localStorage.setItem('taptopick.preferences.v1',JSON.stringify({soundOn:false,musicOn:false,hapticsOn:false})));
      await page.clock.install();
      await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5189/',{waitUntil:'networkidle'});
      await page.clock.fastForward(7000);
      await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width).map(i=>i.decode()));});
      assert.equal(await page.locator('#btn-title-tutorial').count(),before?1:0);
      assert.equal(await page.locator('#btn-title-rules').count(),before?1:0);
      const file=`${before?'before':'after'}-menu-${viewport.width}.png`;
      await page.screenshot({path:path.join(__dirname,file),animations:'disabled'});
      await page.locator('#btn-title-settings').click();
      assert.equal(await page.locator('#help-title').textContent(),'Settings');
      assert.equal(await page.locator('[data-setting]').count(),3);
      await page.locator('#btn-help-close').click();
      for(const mode of ['unit','montage','memory']){
        await page.locator(`#mode-${mode}`).click();
        await page.waitForFunction(()=>document.querySelectorAll('.picture-board button').length>0);
        await page.locator('#btn-pause').click();
        assert.equal(await page.locator('#help-title').textContent(),'Paused');
        await page.locator('#btn-resume').click();
        await page.locator('#btn-back').click();
      }
      assert.deepEqual(errors,[]);
      report.cases.push({viewport,deviceScaleFactor:2,screenshot:file,settingsAndThreeGames:true,errors});
      await page.close();
    }
    fs.writeFileSync(path.join(__dirname,`${before?'before':'after'}-checks.json`),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
