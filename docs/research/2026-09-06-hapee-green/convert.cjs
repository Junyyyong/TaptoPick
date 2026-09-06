// Rebuild only the approved replacement; preserve aspect ratio and alpha.
const sharp=require('sharp');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const folder=fs.readdirSync(root).find(n=>n.normalize('NFC')==='해피-얼굴');
const file=fs.readdirSync(path.join(root,folder)).find(n=>n.normalize('NFC')==='해피-11-초록.png');
if(!file)throw new Error('Missing approved green source');
sharp(path.join(root,folder,file)).resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:85,alphaQuality:100}).toFile(path.join(root,'optimized/montage/haepi/variation-11.webp')).catch(e=>{console.error(e);process.exitCode=1;});
