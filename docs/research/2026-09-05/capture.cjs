/** Historical UI evidence only: exports Git snapshots into a temporary directory.
 * No app source, branch, original assets, or runtime dependencies are changed.
 * Run: NODE_PATH=<directory containing playwright> node docs/research/2026-09-05/capture.cjs
 * Optional: CHROME_PATH, RESEARCH_REFS (comma-separated revisions).
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawn, execFileSync} = require('node:child_process');
const {pipeline} = require('node:stream/promises');
const {createHash} = require('node:crypto');
const {chromium} = require('playwright');
const repo = execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
const out = __dirname;
const seed = 20260905;
const plan = [
  ['edb6abd', [['01-reference-menu','menu']]],
  ['432d9db', [['02-initial-unit','unit'],['03-initial-montage','montage'],['04-initial-memory','memory']]],
  ['ae18ad0', [['05-full-character-preview','unit']]],
  ['138318e', [['06-studio-brand','studio'],['07-product-cover','cover'],['08-product-menu','menu']]],
  ['219b041', [['09-full-body-png','montage']]],
  ['444fd07', [['10-progressive-reveal','unit',3],['11-fragment-memory','memory',2]]],
  ['18211bf', [['12-full-body-proportions','montage']]],
  ['d86d1af', [['13-face-montage','montage']]],
  ['2d1c636', [['14-seven-member-content','montage']]],
  ['8d2f5e1', [['15-character-name','unit']]],
  ['f4ea687', [['16-square-board','unit'],['17-square-memory','memory',2]]],
  ['321798e', [['18-face-memory-preview','memory-preview'],['19-memory-next-stage','memory-stage2'],['20-three-minute-montage','montage']]],
  ['8948acd', [['21-original-faces-only','memory-preview']]],
  ['36c3ad3', [['22-numeric-chances','montage-wrong']]],
  ['48f8456', [['23-heart-feedback','montage-hit'],['24-whole-board-before','montage-final'],['25-whole-board-shuffle','montage-final-motion']]],
  ['06783f7', [['26-memory-hearts-bug','memory-after-montage']]],
  ['1b8b69f', [['27-current-stage2','montage'],['28-bonus-heart','montage-bonus'],['29-door-before','montage-final'],['30-door-closed','montage-door-closed'],['31-door-opened','montage-door-opened'],['32-memory-hearts-fixed','memory-after-montage'],['33-current-game-over','montage-gameover'],['34-current-memory-stage2','memory-stage2']]],
];
const manifestPath=path.join(out,'manifest.json');
const old=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):{captures:[]};
const manifest={captureDate:new Date().toISOString(), viewport:{width:390,height:844},deviceScaleFactor:2,
  pixelSize:{width:780,height:1688}, browser:'Chromium via Playwright', seed,
  method:'Actual Git snapshots, headless mobile emulation. Seeded Math.random; browser timer clock controlled for repeatable animation frames. Not historical device photographs or user study measurements.', captures:old.captures};
fs.mkdirSync(path.join(out,'screenshots'),{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function git(args){return execFileSync('git',args,{cwd:repo,encoding:'utf8'}).trim();}
function exited(proc){return new Promise((resolve,reject)=>{proc.on('error',reject);proc.on('exit',code=>code===0?resolve():reject(new Error(`process exited ${code}`)));});}

(async()=>{
  const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'taptopick-research-'));
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  manifest.browserVersion=browser.version();
  let server;
  try {
    for(const [revision,jobs] of plan){
      if(process.env.RESEARCH_REFS&&!process.env.RESEARCH_REFS.split(',').includes(revision))continue;
      const sha=git(['rev-parse',revision]);
      const root=path.join(scratch,revision); fs.mkdirSync(root);
      const excluded=new Set(['docs','android','store','tests','.github','scripts']);
      const entries=git(['-c','core.quotepath=false','ls-tree','--name-only',sha]).split('\n').filter(p=>!excluded.has(p));
      const archive=spawn('git',['archive',sha,'--',...entries],{cwd:repo,stdio:['ignore','pipe','inherit']});
      const tar=spawn('tar',['-xf','-','-C',root],{stdio:['pipe','ignore','inherit']});
      await Promise.all([pipeline(archive.stdout,tar.stdin),exited(archive),exited(tar)]);
      fs.symlinkSync(path.join(repo,'node_modules'),path.join(root,'node_modules'),'dir');
      server=spawn(process.execPath,[path.join(repo,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5188','--strictPort'],{cwd:root,stdio:['ignore','pipe','pipe']});
      let log='';server.stdout.on('data',s=>log+=s);server.stderr.on('data',s=>log+=s);
      let ready=false;for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5188')).ok){ready=true;break;}}catch{}await sleep(100);}
      if(!ready)throw new Error(`Vite failed ${revision}: ${log}`);
      for(const [id,scenario,count=0] of jobs){
        const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US',reducedMotion:'no-preference'});
        const page=await context.newPage(); const errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        await page.addInitScript((initial)=>{let state=initial;Math.random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};},seed);
        await page.clock.install({time:new Date('2026-09-05T12:00:00Z')});
        await page.clock.pauseAt(new Date('2026-09-05T12:00:01Z'));
        await page.goto('http://127.0.0.1:5188/',{waitUntil:'networkidle'});
        await page.evaluate(()=>document.fonts.ready);
        if(scenario==='cover')await page.clock.runFor(2000);
        else if(scenario!=='studio')await page.clock.fastForward(12000);
        const loaded=async()=>{await page.evaluate(async()=>{await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width>0).map(i=>i.decode().catch(()=>{})));});};
        const start=async mode=>{await page.locator(`#mode-${mode}`).click();await loaded();};
        const solve=async()=>{
          const target=await page.locator('#target-preview img').first().getAttribute('src');
          const candidates=await page.locator('.picture-tile img').evaluateAll(es=>es.map(e=>e.getAttribute('src')));
          const index=candidates.indexOf(target);if(index<0)throw new Error('No exact source match');
          await page.locator('.picture-tile').nth(index).click();await page.clock.runFor(220);await loaded();
        };
        const wrong=async()=>{
          const candidates=await page.locator('.picture-tile img').evaluateAll(es=>es.map(e=>e.getAttribute('src')));
          const index=candidates.findIndex(s=>s.includes('variation'));
          await page.locator('.picture-tile').nth(index).click();
        };
        if(scenario==='unit'){
          await start('unit');
          if(count){
            const character=await page.locator('#target-preview [aria-label]').first().getAttribute('aria-label');
            const names={Tapee:'tapee',Tepee:'tepee',Hoo:'hoo',Hooopee:'hoo',Hapee:'ha',Ha:'ha',Ja:'ja',Zapee:'ja',Bbogles:'bb',Bb:'bb',Pino:'pino',PinoPan:'pino'};
            const key=Object.keys(names).find(n=>character.toLowerCase().startsWith(n.toLowerCase()));
            const targets=page.locator(`.picture-tile[aria-label="${names[key]} picture piece"]`);
            for(let i=0;i<count;i++)await targets.nth(i).click();
          }
          await page.clock.runFor(250);
        }else if(scenario.startsWith('memory')){
          if(scenario==='memory-after-montage'){await start('montage');await page.locator('#btn-back').click();}
          await start('memory');
          if(scenario==='memory-stage2'){
            await page.clock.runFor(3100);
            const sources=await page.locator('.memory-card img').evaluateAll(es=>es.map(e=>e.getAttribute('src')));
            const groups=new Map();sources.forEach((s,i)=>groups.set(s,[...(groups.get(s)||[]),i]));
            for(const indices of groups.values())for(let i=0;i<indices.length;i+=2){await page.locator('.memory-card').nth(indices[i]).click();await page.locator('.memory-card').nth(indices[i+1]).click();await page.clock.runFor(270);}
          } else if(scenario==='memory'&&count){
            for(let i=0;i<count;i++)await page.locator('.memory-card:not(.is-free)').nth(i).click();
          }
          await page.clock.runFor(scenario==='memory-after-montage'?3700:count?300:100);
        }else if(scenario.startsWith('montage')){
          await start('montage');
          if(['montage-final','montage-final-motion','montage-door-closed','montage-door-opened'].includes(scenario))for(let i=0;i<13;i++)await solve();
          if(scenario==='montage-bonus'){await wrong();for(let i=0;i<8;i++)await solve();}
          if(scenario==='montage-wrong'||scenario==='montage-hit')await wrong();
          if(scenario==='montage-gameover')for(let i=0;i<5;i++)await wrong();
          if(scenario==='montage-final-motion')await page.clock.runFor(6900);
          else if(scenario==='montage-door-closed')await page.clock.runFor(6350);
          else if(scenario==='montage-door-opened')await page.clock.runFor(6900);
          else await page.clock.runFor(scenario==='montage-hit'?100:80);
        }
        await loaded();
        const ui=await page.evaluate(()=>({
          title:document.title,viewport:{width:innerWidth,height:innerHeight},
          boardCount:document.querySelectorAll('.picture-tile').length,
          clock:document.querySelector('#run-clock')?.textContent,
          progress:document.querySelector('#progress-label')?.textContent,
          stage:document.querySelector('#montage-status')?.textContent,
          heartsDisplay:document.querySelector('#run-lives')?getComputedStyle(document.querySelector('#run-lives')).display:null,
          heartCount:document.querySelectorAll('.life-heart').length,
          doors:document.querySelectorAll('.is-swap-door').length,
          target:document.querySelector('#target-preview img')?.getAttribute('src'),
          targetName:document.querySelector('#target-character-name')?.textContent,
          firstTile:(()=>{const r=document.querySelector('.picture-tile')?.getBoundingClientRect();return r?{width:r.width,height:r.height}:null;})(),
          images:[...document.images].filter(i=>i.getBoundingClientRect().width>0).map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})),
        }));
        const relative=`screenshots/${id}.png`,filename=path.join(out,relative);
        await page.screenshot({path:filename,fullPage:false,animations:'allow'});
        const item={id,revision,commit:sha,commitDate:git(['show','-s','--format=%cI',sha]),scenario,networkCondition:'local assets loaded',file:relative,sha256:createHash('sha256').update(fs.readFileSync(filename)).digest('hex'),ui,errors};
        manifest.captures=manifest.captures.filter(c=>c.id!==id);manifest.captures.push(item);manifest.captures.sort((a,b)=>a.id.localeCompare(b.id));
        fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
        console.log(JSON.stringify({id,revision,board:ui.boardCount,hearts:ui.heartsDisplay,doors:ui.doors,errors}));
        await context.close();
      }
      server.kill();await new Promise(r=>server.once('exit',r));server=undefined;
      // Only remove the just-exported snapshot inside this script's fresh temp directory.
      if(path.dirname(root)!==scratch)throw new Error('Unsafe temp cleanup');
      fs.rmSync(root,{recursive:true});
    }
  }finally{if(server)server.kill();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
