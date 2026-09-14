const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try {
  for(const [width,height] of [[390,844],[390,667],[320,568]]) {
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2});
   await page.addInitScript(()=>localStorage.setItem('taptopick.preferences.v1',JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false})));
   await page.clock.install();await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.runFor(7000);
   await page.evaluate(()=>document.fonts.ready);
   const settings=page.locator('#btn-title-settings'),music=page.locator('#btn-title-music');
   const before=await settings.boundingBox();
   // Force the normally blocked-autoplay-only cue visible for layout inspection.
   await music.evaluate(b=>b.classList.remove('hidden'));
   assert.deepEqual(await settings.boundingBox(),before);
   const cue=await music.boundingBox();console.log({width,height,before,cue});assert(cue.y>=before.y+before.height);assert(cue.y+cue.height<=height);
   assert.equal(await music.locator('svg').count(),1);
   assert.deepEqual(await page.locator('.mode-name').allTextContents(),['PUZZLE','MONTAGE','MEMORY']);
   if(height===844)await page.screenshot({path:path.join(__dirname,'after.png')});
   await page.close();
  }
  console.log('PASS: speaker cue below Settings, no layout shift, mobile viewport fit');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
