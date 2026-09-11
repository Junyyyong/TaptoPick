const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const before=process.argv.includes('--before');
const settle=page=>page.evaluate(()=>document.getAnimations().filter(a=>a.constructor.name==='CSSTransition').forEach(a=>a.finish()));
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const report={before,method:'Chromium mobile emulation, DPR 2, seeded random and controlled clock. CSS transitions completed before capture; match animation paused at 154ms.',cases:[]};
  try{
    for(const [width,height] of [[390,844],[320,568]]){
      const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{let state=79;Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};localStorage.setItem('taptopick.preferences.v1',JSON.stringify({soundOn:false,musicOn:false,hapticsOn:false}));});
      await page.clock.install();await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.fastForward(7000);
      await page.locator('#mode-memory').click();await page.locator('#btn-mode-intro-start').click();
      const shot=async label=>{if(width===390)await page.screenshot({path:path.join(__dirname,`${before?'before':'after'}-${label}.png`)});};
      for(const side of [4,5,6,7]){
        await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width).map(i=>i.decode()));});
        await page.clock.runFor(3100);await settle(page);
        const cards=page.locator('.memory-card:not(.is-free)');const count=side*side-(side%2);assert.equal(await cards.count(),count);
        const box=await cards.first().boundingBox();assert(Math.abs(box.width-box.height)<.01);
        if(!before){
          // SVG getBBox includes the font's empty ascent/descent line box.
          // Check the visible glyph bounds, not the unused font leading.
          const glyph=await cards.first().locator('svg text').evaluate(e=>{const s=getComputedStyle(e);const ctx=document.createElement('canvas').getContext('2d');ctx.font=`900 26px ${s.fontFamily}`;ctx.textAlign='center';const m=ctx.measureText('?');return {text:e.textContent,weight:s.fontWeight,font:s.fontFamily,box:{x:12-m.actualBoundingBoxLeft,y:21-m.actualBoundingBoxAscent,width:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent}};});
          assert.equal(glyph.text,'?');assert.equal(glyph.weight,'900');assert(glyph.font.includes('Apple SD Gothic Neo'));
          assert(glyph.box.x>=0&&glyph.box.y>=0&&glyph.box.x+glyph.box.width<=24&&glyph.box.y+glyph.box.height<=24,JSON.stringify(glyph));
        }
        if(side===4||side===7)await shot(`${side}-closed`);
        const sources=await cards.locator('img').evaluateAll(es=>es.map(e=>e.getAttribute('src')));
        const groups=new Map();sources.forEach((src,i)=>groups.set(src,[...(groups.get(src)||[]),i]));
        const [first,second]=groups.values().next().value;
        await cards.nth(first).click({force:true});await settle(page);
        const reflection=await cards.nth(first).evaluate(e=>getComputedStyle(e,'::before').opacity);
        if(!before)assert.equal(reflection,'0.65');if(side===4)await shot('4-flip');
        await cards.nth(second).click({force:true});await settle(page);
        await page.locator('.is-pick-hit').evaluateAll(es=>es.forEach(e=>e.getAnimations().forEach(a=>{if(a.animationName==='pick-hit'){a.pause();a.currentTime=154;}})));
        const glow=await cards.nth(first).evaluate(e=>({gradient:getComputedStyle(e,'::before').backgroundImage,opacity:getComputedStyle(e,'::before').opacity,shadow:getComputedStyle(e).boxShadow,duration:getComputedStyle(e).animationDuration}));
        if(!before){assert(glow.gradient.includes('0.4'));assert(glow.shadow.includes('0.16'));}assert.equal(glow.duration,'0.22s');
        if(side===4)await shot('4-match');
        await page.locator('.is-pick-hit').evaluateAll(es=>es.forEach(e=>e.getAnimations().forEach(a=>a.finish())));await page.clock.runFor(400);
        assert.deepEqual(await cards.first().boundingBox(),box);
        for(const indices of groups.values())for(let i=0;i<indices.length;i+=2){
          if(indices[i]===first&&indices[i+1]===second)continue;
          await cards.nth(indices[i]).click({force:true});await cards.nth(indices[i+1]).click({force:true});await page.clock.runFor(400);
        }
        assert.equal(await page.locator('.memory-card.is-matched').count(),count);
        report.cases.push({width,height,side,reflection,glow,matched:count,geometryUnchanged:true});
        if(side<7)await page.clock.runFor(900);
      }
      assert.deepEqual(errors,[]);await page.close();
    }
    fs.writeFileSync(path.join(__dirname,`${before?'before':'after'}-checks.json`),JSON.stringify(report,null,2)+'\n');console.log(report);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
