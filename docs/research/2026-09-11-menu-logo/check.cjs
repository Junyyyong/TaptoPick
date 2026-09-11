const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const before=process.argv.includes('--before');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const cases=[];
  try {
    for(const [width,height] of [[390,844],[320,568]]) {
      const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>localStorage.setItem('taptopick.preferences.v1',JSON.stringify({soundOn:false,musicOn:false,hapticsOn:false})));
      await page.clock.install();await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.runFor(7000);
      const logo=page.locator('#brand-mark');assert(await logo.isVisible());
      await page.evaluate(async()=>{await document.fonts.ready;await document.querySelector('#brand-mark').decode();});
      const display=await logo.evaluate(img=>({src:img.getAttribute('src'),natural:[img.naturalWidth,img.naturalHeight],box:img.getBoundingClientRect().toJSON()}));
      assert(display.src.includes(before?'TAPtoPICK-logo-01.webp':'TAPtoTEST-logo-0911-01.webp'));
      assert(Math.abs(display.box.width/display.box.height-display.natural[0]/display.natural[1])<0.001);
      assert(display.box.x>=0 && display.box.right<=width && display.box.y>=0);
      assert(display.box.bottom< (await page.locator('#mode-unit').boundingBox()).y);
      if(width===390)await page.screenshot({path:path.join(__dirname,`${before?'before':'after'}.png`)});
      await page.locator('#mode-unit').click();assert(await page.locator('#btn-mode-intro-start').isVisible());
      assert.deepEqual(errors,[]);cases.push({width,height,display,startScreenReached:true,errors});await page.close();
    }
    fs.writeFileSync(path.join(__dirname,`${before?'before':'after'}-checks.json`),JSON.stringify(cases,null,2)+'\n');console.log(cases);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
