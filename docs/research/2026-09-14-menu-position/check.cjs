const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ten='/Users/scdi/Documents/ChatGPT/TAPtoTEN';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const checks=[];
 try {
  for(const [width,height] of [[390,844],[390,667],[320,568]]) {
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2});
   await page.addInitScript(()=>localStorage.setItem('taptopick.preferences.v1',JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false})));
   await page.clock.install();await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});await page.clock.runFor(7000);
   await page.locator('#brand-mark').evaluate(i=>i.decode());await page.evaluate(()=>document.fonts.ready);
   assert.deepEqual(await page.locator('.mode-name').allTextContents(),['PUZZLE','MONTAGE','MEMORY']);
   const measure=()=>page.evaluate(()=>Object.fromEntries(['.mode-list','#btn-title-settings'].map(s=>[s,document.querySelector(s).getBoundingClientRect().toJSON()])));
   const pick=await measure();
   if(height===844)await page.screenshot({path:path.join(__dirname,'after.png')});
   assert(pick['#btn-title-settings'].bottom<height);
   // Read-only TEN title CSS + logo on the shared layout, to compare menu coordinates.
   await page.addStyleTag({content:fs.readFileSync(ten+'/src/ui/styles/title.css','utf8')+'\n.brand-block{height:auto;display:block}.brand-mark{display:inline}'});
   await page.locator('#brand-mark').evaluate((i,svg)=>{i.src='data:image/svg+xml;base64,'+svg;},fs.readFileSync(ten+'/public/cover-logo.svg').toString('base64'));
   await page.locator('#brand-mark').evaluate(i=>i.decode());
   const reference=await measure();
   for(const selector of Object.keys(pick))for(const key of ['x','y','width','height'])assert(Math.abs(pick[selector][key]-reference[selector][key])<1,`${width}x${height} ${selector} ${key}: ${pick[selector][key]} / ${reference[selector][key]}`);
   checks.push({width,height,pick,reference});await page.close();
  }
  fs.writeFileSync(path.join(__dirname,'checks.json'),JSON.stringify(checks,null,2));console.log('PASS: uppercase names, mobile menu/footer coordinates match TEN reference CSS');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
