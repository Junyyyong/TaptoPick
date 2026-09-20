const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
(async()=>{
 for(const [name,id] of [['해피','haepi'],['뽀글스','bbogles'],['태피','tapee'],['티피','tepee'],['후피','hupi'],['재피','jaepi'],['피노팬','pino']]){
  const dir=fs.readdirSync('.').find(n=>n.normalize('NFC')===`게임2${name}`);
  if(!dir)throw Error(`Missing ${name}`);
  const files=fs.readdirSync(dir).filter(n=>n.endsWith('.png'));
  const out=`optimized/portrait/${id}`;fs.mkdirSync(out,{recursive:true});
  for(let n=0;n<=24;n++){
   const matches=files.filter(f=>n===0?f.normalize('NFC').includes('원본'):Number(f.match(/(\d+)\.png$/)?.[1])===n);
   if(matches.length!==1)throw Error(`${name}/${n}: ${matches.length} files`);
   await sharp(path.join(dir,matches[0])).resize(512,512,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).webp({quality:90,effort:6}).toFile(`${out}/${n===0?'answer':`variation-${n}`}.webp`);
  }
  console.log(`${name}: answer + 24 optimized`);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
