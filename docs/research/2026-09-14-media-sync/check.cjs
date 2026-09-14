const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--autoplay-policy=no-user-gesture-required']});
 try {
  const page=await browser.newPage();await page.goto('http://127.0.0.1:5189/',{waitUntil:'networkidle'});
  const result=await page.evaluate(async()=>{
   const {MediaSync}=await import('/src/ui/mediaSync.ts');
   const {APP_CONFIG}=await import('/src/config/app.ts');
   const video=document.createElement('video'),audio=document.createElement('audio');
   video.muted=true;audio.muted=true;video.playsInline=true;document.body.append(video,audio);
   const sync=new MediaSync(video,audio);
   const events=[];for(const [name,media] of [['video',video],['audio',audio]])media.addEventListener('playing',()=>events.push({name,time:performance.now()}));
   video.src=APP_CONFIG.assets.characterCelebrations.tepee.video;audio.src=APP_CONFIG.assets.characterCelebrations.tepee.sound;
   const wait=async(fn)=>{const end=performance.now()+8000;while(!fn()){if(performance.now()>end)throw Error('Media timeout');await new Promise(r=>setTimeout(r,30));}};
   sync.start(true);await video.play();await wait(()=>!audio.paused);await new Promise(r=>setTimeout(r,500));
   const drift=Math.abs(video.currentTime-audio.currentTime);
   video.pause();await wait(()=>audio.paused);const pausedTogether=audio.paused;
   await video.play();await wait(()=>!audio.paused);await new Promise(r=>setTimeout(r,300));
   const resumedDrift=Math.abs(video.currentTime-audio.currentTime);
   sync.stop();video.pause();const stopped=audio.paused;video.remove();audio.remove();
   return {events,drift,resumedDrift,pausedTogether,stopped};
  });
  assert.equal(result.events[0].name,'video');assert(result.pausedTogether&&result.stopped);assert(result.drift<.2&&result.resumedDrift<.2);
  fs.writeFileSync(path.join(__dirname,'checks.json'),JSON.stringify(result,null,2));console.log(result);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
