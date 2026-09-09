const {chromium}=require('playwright');
const sharp=require('sharp');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const before=process.argv.includes('--before');
(async()=>{
  // Confirm the supplied pieces still reconstruct the displayed source exactly.
  const preview=await sharp('optimized/unit/HapeeCarrot.webp').removeAlpha().raw().toBuffer();
  const joined=await sharp({create:{width:960,height:960,channels:3,background:'#fff'}})
    .composite(Array.from({length:9},(_,i)=>({input:`optimized/HapeeCarrot/${i+1}.webp`,left:i%3*320,top:Math.floor(i/3)*320}))).removeAlpha().raw().toBuffer();
  assert(preview.equals(joined));
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const report={before,sourcePixelsMatch:true,method:'Mobile Chromium emulation, DPR 2/3; controlled clock and seeded random, not a real-device capture.',cases:[]};
  try{
    for(const [width,height,dpr] of [[390,844,2],[320,568,2],[375,667,3]]){
      const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr,isMobile:true,hasTouch:true});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{let state=79;Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};localStorage.setItem('taptopick.preferences.v1',JSON.stringify({soundOn:false,musicOn:false,hapticsOn:false}));});
      await page.clock.install();await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.fastForward(7000);
      await page.locator('#mode-unit').click();await page.locator('#btn-mode-intro-start').click();
      await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width).map(i=>i.decode()));});
      const box=await page.locator('.unit-reveal').boundingBox();
      await page.locator('#picture-board button:has(img[src*="/HapeeCarrot/5.webp"])').click({force:true});await page.clock.runFor(400);
      assert.equal(await page.locator('.unit-reveal-color.is-revealed').count(),1);
      assert(Math.abs(box.width-box.height)<.01);
      let alignment=null;
      if(!before){
        alignment=await page.locator('.unit-reveal').evaluate(root=>{
          const image=root.querySelector('.unit-reveal-color[data-piece-index="4"]');
          const r=image.getBoundingClientRect();
          const svg=root.querySelector('svg.unit-reveal-grid');
          const matrix=svg.getScreenCTM();
          const lineCenters=[...svg.querySelectorAll('line')].map(line=>{
            const a=new DOMPoint(+line.getAttribute('x1'),+line.getAttribute('y1')).matrixTransform(matrix);
            return line.getAttribute('x1')===line.getAttribute('x2') ? a.x-r.x : a.y-r.y;
          });
          const values=getComputedStyle(image).clipPath.match(/[\d.]+/g).map(Number);
          // Browsers serialize equal inset edges using the one-/two-value shorthand.
          const cuts=[values[0],values[1]??values[0],values[2]??values[0],values[3]??values[1]??values[0]];
          return {lineCenters,clipEdges:[r.height*cuts[0]/100,r.width*(1-cuts[1]/100),r.height*(1-cuts[2]/100),r.width*cuts[3]/100],frameCount:svg.querySelectorAll('rect').length,box:svg.getBoundingClientRect().toJSON(),pointerEvents:getComputedStyle(svg).pointerEvents};
        });
        assert.equal(alignment.frameCount,1);assert.equal(alignment.pointerEvents,'none');
        for(const center of alignment.lineCenters)assert(alignment.clipEdges.some(edge=>Math.abs(center-edge)<.002),JSON.stringify(alignment));
        assert(Math.abs(alignment.box.width-box.width)<.002 && Math.abs(alignment.box.height-box.height)<.002);
        const after=await page.locator('.unit-reveal').boundingBox();assert.deepEqual(after,box);
      }
      const file=`${before?'before':'after'}-${width}.png`;
      await page.screenshot({path:path.join(__dirname,file),animations:'disabled'});
      if(!before){
        const pieces=page.locator('#picture-board button:has(img[src*="/HapeeCarrot/"])');
        for(let i=0;i<9;i++)if(!await pieces.nth(i).isDisabled()){await pieces.nth(i).click({force:true});await page.clock.runFor(50);}
        assert.equal(await page.locator('.unit-reveal-color.is-revealed').count(),9);
      }
      assert.deepEqual(errors,[]);report.cases.push({width,height,dpr,box,alignment,file,errors});await page.close();
    }
    fs.writeFileSync(path.join(__dirname,`${before?'before':'after'}-checks.json`),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
