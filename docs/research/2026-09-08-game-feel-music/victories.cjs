const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('taptopick.preferences.v1',JSON.stringify({soundOn:false,musicOn:false,hapticsOn:false}));});
 await page.clock.install();await page.goto('http://127.0.0.1:5189',{waitUntil:'networkidle'});await page.clock.fastForward(7000);
 const loaded=()=>page.evaluate(async()=>{await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width).map(i=>i.decode()));});
 await page.locator('#mode-montage').click();await loaded();
 for(let i=0;i<18;i++){
  const src=await page.locator('#target-preview img').getAttribute('src');
  const srcs=await page.locator('.picture-tile img').evaluateAll(es=>es.map(i=>i.getAttribute('src')));
  await page.locator('.picture-tile').nth(srcs.indexOf(src)).click({force:true});
  await page.clock.runFor([2,7,12].includes(i)?950:250);await loaded();
 }
 await page.clock.runFor(1200);await page.locator('#btn-cheer-continue').click();assert.equal(await page.locator('.result-primary').textContent(),'18');
 assert.equal(await page.locator('#result-title').textContent(),'ALL STAGES CLEAR');
 assert(!/fewer mistakes/.test(await page.locator('#result-next-goal').textContent()));
 await page.screenshot({path:path.join(__dirname,'after-montage-victory.png')});
 await page.locator('#btn-result-menu').click();await page.locator('#mode-memory').click();await loaded();
 for(let stage=0;stage<4;stage++){
  await page.clock.runFor(3100);
  const srcs=await page.locator('.memory-card:not(.is-free) img').evaluateAll(es=>es.map(i=>i.getAttribute('src')));
  const groups=new Map();srcs.forEach((src,i)=>groups.set(src,[...(groups.get(src)||[]),i]));
  for(const indexes of groups.values())for(let i=0;i<indexes.length;i+=2){
   await page.locator('.memory-card:not(.is-free)').nth(indexes[i]).click({force:true});
   await page.locator('.memory-card:not(.is-free)').nth(indexes[i+1]).click({force:true});
   await page.clock.runFor(400);
  }
  await page.clock.runFor(900);await loaded();
 }
 await page.clock.runFor(1200);await page.locator('#btn-cheer-continue').click();
 assert.equal(await page.locator('.result-primary').textContent(),'4/4');
 assert.match(await page.locator('#result-detail').textContent(),/62 pairs found · 0 missed pairs/);
 assert(!/fewer misses/.test(await page.locator('#result-next-goal').textContent()));
 await page.screenshot({path:path.join(__dirname,'after-memory-victory.png')});
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('taptopick.records.v1')));
 assert(stored.bestByKey.montage.won);assert(stored.bestByKey.memory.won);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(__dirname,'victories.json'),JSON.stringify({passed:true,viewport:{width:390,height:844},montage:stored.bestByKey.montage,memory:stored.bestByKey.memory,errors},null,2)+'\n');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
