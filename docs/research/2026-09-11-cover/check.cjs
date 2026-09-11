const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const before=process.argv.includes('--before');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const cases=[];
  try{
    for(const [width,height] of [[390,844],[320,568]]){
      const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>localStorage.setItem('taptopick.preferences.v1',JSON.stringify({soundOn:false,musicOn:false,hapticsOn:false})));
      await page.clock.install();await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.runFor(2000);
      const cover=page.locator('#product-cover');assert(await cover.isVisible());await cover.evaluate(img=>img.decode());
      const display=await cover.evaluate(img=>({src:img.getAttribute('src'),natural:[img.naturalWidth,img.naturalHeight],fit:getComputedStyle(img).objectFit,position:getComputedStyle(img).objectPosition,box:img.getBoundingClientRect().toJSON()}));
      assert.deepEqual(display.natural,[1440,2841]);
      assert(display.src.includes(before?'taptopick-cover.webp':'taptopick-cover-0911-01.webp'));
      if(width===390)await page.screenshot({path:path.join(__dirname,`${before?'before':'after'}.png`)});
      await page.clock.runFor(5000);assert(!(await cover.isVisible()));assert(await page.locator('#mode-unit').isVisible());
      assert.deepEqual(errors,[]);cases.push({width,height,display,menuReached:true,errors});await page.close();
    }
    fs.writeFileSync(path.join(__dirname,`${before?'before':'after'}-checks.json`),JSON.stringify(cases,null,2)+'\n');console.log(cases);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
