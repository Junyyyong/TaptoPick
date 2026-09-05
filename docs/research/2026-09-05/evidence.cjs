/** Read-only Git evidence, generated separately from the app build. */
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const git=(args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:20*1024*1024});
function files(ref){return git(['ls-tree','-r','-l','-z',ref]).split('\0').filter(Boolean).map(line=>{const [header,name]=line.split('\t');return {name,bytes:Number(header.trim().split(/\s+/).at(-1))};});}
function sum(list){return {count:list.length,bytes:list.reduce((total,item)=>total+item.bytes,0)};}
const before=files('219b041'),after=files('444fd07');
const originals=before.filter(f=>/^(Bb|Ha|Hoo|Ja|Pino|Tapee|Tepee)\/[^/]+\.jpg$/i.test(f.name));
const webp=after.filter(f=>/^optimized\/(Bb|Ha|Hoo|Ja|Pino|Tapee|Tepee)\/[^/]+\.webp$/i.test(f.name));
const paired=originals.map(file=>{const expected=`optimized/${file.name.replace(/\.jpg$/i,'.webp')}`;return {before:file,after:webp.find(f=>f.name===expected)||null};});
const evidence={
  scope:'Tracked image blob sizes in Git; not measured loading time or transferred network bytes.',
  beforeRevision:'219b041',afterRevision:'444fd07',
  picturePieces:{original:sum(originals),optimized:sum(webp),allNamesMatched:paired.every(pair=>!!pair.after),pairs:paired},
  montageWholeImages:{original:sum(before.filter(f=>/^(Bb|Ha|Hooo|Ja|Pino|Tapee|Tepee)\.png$/.test(f.name))),optimized:sum(after.filter(f=>/^optimized\/montage\/[^/]+\.webp$/.test(f.name)))},
  commits:git(['log','--reverse','--format=%H\t%cI\t%s','1b8b69f']).trim().split('\n').map(line=>{const [sha,date,subject]=line.split('\t');return {sha,date,subject};}),
};
fs.writeFileSync(path.join(__dirname,'git-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({picturePieces:evidence.picturePieces.original,webp:evidence.picturePieces.optimized,matched:evidence.picturePieces.allNamesMatched,montage:evidence.montageWholeImages}));
