const {chromium}=require('playwright');
const sharp=require('sharp');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const folders=['HapeeCarrot','HapeeCarrot02','TapeeBack','TepeeBack','HooopeeBack'];
(async()=>{
  const pixelChecks=[];
  for(const folder of folders){
    const preview=await sharp(`optimized/unit/${folder}.webp`).removeAlpha().raw().toBuffer();
    const joined=await sharp({create:{width:960,height:960,channels:3,background:'#fff'}}).composite(Array.from({length:9},(_,i)=>({input:`optimized/${folder}/${i+1}.webp`,left:i%3*320,top:Math.floor(i/3)*320}))).removeAlpha().raw().toBuffer();
    assert(preview.equals(joined));pixelChecks.push({folder,exactPixelReconstruction:true});
  }
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const report={method:'Mobile Chromium emulation, DPR 2; controlled clock and seeded random. The next random draw before START selects each artwork for coverage; no gameplay state is modified.',pixelChecks,cases:[]};
  try{
    for(const [width,height] of [[390,844],[320,568]]){
      const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{let state=79;Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};localStorage.setItem('taptopick.preferences.v1',JSON.stringify({soundOn:false,musicOn:false,hapticsOn:false}));});
      await page.clock.install();await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.fastForward(7000);
      assert.deepEqual(await page.locator('.mode-name').allTextContents(),['Puzzle','Montage','Memory']);
      if(width===390)await page.screenshot({path:path.join(__dirname,'menu.png'),animations:'disabled'});
      for(let index=0;index<folders.length;index++){
        const folder=folders[index];
        await page.locator('#mode-unit').click();assert.equal(await page.locator('#mode-intro-title').textContent(),'PUZZLE');
        await page.evaluate(index=>{const random=Math.random;Math.random=()=>{Math.random=random;return(index+.5)/5;};},index);
        await page.locator('#btn-mode-intro-start').click();
        await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width).map(i=>i.decode()));});
        assert((await page.locator('.unit-reveal-base').getAttribute('src')).includes(`/${folder}.webp`));
        assert.equal(await page.locator('#run-mode').textContent(),'Puzzle');
        assert.equal(await page.locator('#picture-board button').count(),49);
        const targets=page.locator(`#picture-board button:has(img[src*="/${folder}/"])`);
        assert.equal(await targets.count(),9);assert.equal(await page.locator('.unit-reveal-grid line').count(),4);
        const box=await page.locator('.unit-reveal').boundingBox();assert(Math.abs(box.width-box.height)<.01);
        const cards=await page.locator('#picture-board button').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
        assert(cards.every(b=>Math.abs(b.width-b.height)<.1&&b.x>=0&&b.x+b.width<=width+.1));
        await page.locator(`#picture-board button:not(:has(img[src*="/${folder}/"]))`).first().click({force:true});
        assert.equal(await page.locator('.unit-reveal-color.is-revealed').count(),0);
        for(let i=0;i<3;i++){await targets.nth(i).click({force:true});await page.clock.runFor(400);}
        assert.equal(await page.locator('.unit-reveal-color.is-revealed').count(),3);
        if(width===390)await page.screenshot({path:path.join(__dirname,`${folder}.png`),animations:'disabled'});
        for(let i=3;i<9;i++){await targets.nth(i).click({force:true});await page.clock.runFor(50);}
        assert.equal(await page.locator('.unit-reveal-color.is-revealed').count(),9);
        report.cases.push({width,height,folder,targets:9,decoys:40,wrongPickDoesNotReveal:true,allPiecesRevealed:true,box});
        await page.locator('#btn-back').click({force:true});
      }
      for(const [mode,title] of [['montage','Montage'],['memory','Memory']]){
        await page.locator(`#mode-${mode}`).click();assert.equal(await page.locator('#mode-intro-title').textContent(),title.toUpperCase());
        await page.locator('#btn-mode-intro-start').click();assert.equal(await page.locator('#run-mode').textContent(),title);
        await page.locator('#btn-back').click();
      }
      assert.deepEqual(errors,[]);await page.close();
    }
    fs.writeFileSync(path.join(__dirname,'checks.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
