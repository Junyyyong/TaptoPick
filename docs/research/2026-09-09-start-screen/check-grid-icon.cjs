const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>localStorage.setItem('taptopick.preferences.v1',JSON.stringify({soundOn:false,musicOn:false,hapticsOn:false})));
    await page.clock.install();await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.fastForward(7000);
    await page.locator('#mode-unit').click();
    const svg=page.locator('#mode-intro-mark svg');
    assert.equal(await svg.locator('rect').count(),1);
    assert.equal(await svg.locator('rect').getAttribute('width'),'36');
    assert.equal(await svg.locator('path').getAttribute('d'),'M18 6v36M30 6v36M6 18h36M6 30h36');
    assert.equal(await svg.getAttribute('stroke-width'),'2.4');
    const plate=await page.locator('#mode-intro-mark').boundingBox();assert.equal(plate.width,140);assert.equal(plate.height,140);
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:path.join(__dirname,'intro-unit-grid.png'),animations:'disabled'});
    await page.locator('#btn-mode-intro-start').click();assert.equal(await page.locator('#picture-board button').count(),49);
    assert.deepEqual(errors,[]);console.log('PASS: one 3×3 grid, unchanged stroke and plate, START opens 49 tiles, no browser errors.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
