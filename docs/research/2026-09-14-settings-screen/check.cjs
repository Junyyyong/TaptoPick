const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try {
  for(const [width,height] of [[390,844],[320,568]]) {
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.clock.install();await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.runFor(7000);
   await page.locator('#btn-title-settings').click();
   assert(await page.locator('#screen-settings').isVisible());
   assert.deepEqual(await page.locator('#settings-body .switch-text b').allTextContents(),['Music','Sound','Vibration']);
   assert(!(await page.locator('#screen-title').isVisible()));
   assert(!(await page.locator('#help-layer').isVisible()));
   const box=await page.locator('#screen-settings').boundingBox();assert(box.height>=height-2);
   for(const key of ['music','sound','haptics']) {
    const toggle=page.locator(`[data-setting="${key}"]`);
    const initial=await toggle.getAttribute('aria-checked');await toggle.click();
    assert.equal(await toggle.getAttribute('aria-checked'),String(initial!=='true'));
    assert(await toggle.evaluate(b=>document.activeElement===b));
   }
   const saved=await page.evaluate(()=>localStorage.getItem('taptopick.preferences.v1'));
   await page.screenshot({path:path.join(__dirname,`after-${width}.png`)});
   await page.keyboard.press('Escape');assert(await page.locator('#screen-title').isVisible());
   assert(await page.locator('#btn-title-settings').evaluate(b=>document.activeElement===b));
   await page.locator('#btn-title-settings').click();await page.locator('#btn-settings-back').click();
   await page.reload({waitUntil:'networkidle'});await page.clock.runFor(7000);
   assert.equal(await page.evaluate(()=>localStorage.getItem('taptopick.preferences.v1')),saved);
   await page.locator('#btn-title-settings').click();
   for(const key of ['music','sound','haptics'])assert.equal(await page.locator(`[data-setting="${key}"]`).getAttribute('aria-checked'),'false');
   await page.locator('#btn-settings-back').click();await page.locator('#mode-montage').click();await page.locator('#btn-mode-intro-start').click();await page.locator('#btn-pause').click();
   assert(await page.locator('#help-layer').isVisible());assert(!(await page.locator('#screen-settings').isVisible()));await page.locator('#btn-resume').click();
   assert(!(await page.locator('#help-layer').isVisible()));assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: full-screen settings, all toggles, focus, Escape/back, persistence, pause/resume');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
