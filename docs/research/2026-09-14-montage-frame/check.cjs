const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const checks=[];
 try {
  for(const [width,height] of [[390,844],[320,568]]) {
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>localStorage.setItem('taptopick.preferences.v1',JSON.stringify({soundOn:false,musicOn:false,hapticsOn:false})));
   await page.clock.install();await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.runFor(7000);
   await page.locator('#mode-montage').click();await page.locator('#btn-mode-intro-start').click();
   const img=page.locator('.montage-target-image');await img.evaluate(i=>i.decode());await page.evaluate(()=>document.fonts.ready);
   const display=await img.evaluate(i=>({box:i.getBoundingClientRect().toJSON(),outline:getComputedStyle(i).outline,offset:getComputedStyle(i).outlineOffset,natural:[i.naturalWidth,i.naturalHeight]}));
   assert.equal(display.box.width,display.box.height);assert(display.outline.includes('1px'));assert.equal(display.offset,'-1px');
   assert(display.box.bottom<(await page.locator('.picture-board').boundingBox()).y);
   if(width===390){
    await page.screenshot({path:path.join(__dirname,'after.png')});
    // Reconstruct the previous CSS on the same character for an exact comparison.
    await img.evaluate(i=>{i.style.width='100%';i.style.outline='none';});
    await page.screenshot({path:path.join(__dirname,'before.png')});
   }
   assert.deepEqual(errors,[]);checks.push({width,height,display,errors});await page.close();
  }
  fs.writeFileSync(path.join(__dirname,'checks.json'),JSON.stringify(checks,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
