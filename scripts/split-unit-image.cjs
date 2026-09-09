// Exact, non-generative image preparation. NODE_PATH must provide sharp.
// node scripts/split-unit-image.cjs Ha/carrot-original.png HapeeCarrot
const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const [source, name] = process.argv.slice(2);
assert(source && /^[A-Za-z][A-Za-z0-9-]*$/.test(name || ''), 'Provide an image path and safe asset folder name');
(async () => {
  const side = 960, columns = 3, cell = side / columns;
  const target = path.resolve('optimized', name);
  fs.mkdirSync(target, {recursive:true});
  fs.mkdirSync('optimized/unit', {recursive:true});
  // Contain preserves the whole image and aspect ratio; white padding makes square cells.
  const square = await sharp(source).rotate().resize(side, side, {fit:'contain', background:'#ffffff'})
    .flatten({background:'#ffffff'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const raw = {width:side, height:side, channels:3};
  const preview = path.resolve('optimized/unit', `${name}.webp`);
  await sharp(square.data, {raw}).webp({lossless:true}).toFile(preview);
  const pieces = [];
  for (let index=0; index<columns*columns; index++) {
    const file=path.join(target, `${index+1}.webp`);
    await sharp(square.data,{raw}).extract({left:(index%columns)*cell,top:Math.floor(index/columns)*cell,width:cell,height:cell})
      .webp({lossless:true}).toFile(file);
    pieces.push(file);
  }
  // Verify exact pixel alignment: all lossless tiles must reconstruct the preview.
  const assembled=await sharp({create:{width:side,height:side,channels:3,background:'#fff'}})
    .composite(pieces.map((input,index)=>({input,left:(index%columns)*cell,top:Math.floor(index/columns)*cell})))
    .removeAlpha().raw().toBuffer();
  assert(assembled.equals(square.data),'Tiles must reconstruct the normalized original exactly');
  const decoded=await sharp(preview).removeAlpha().raw().toBuffer();
  assert(decoded.equals(square.data),'Preview must match tile pixels exactly');
  console.log(JSON.stringify({source,preview,columns,rows:columns,side,cell,
    exactPixelReconstruction:true,bytes:[preview,...pieces].reduce((sum,f)=>sum+fs.statSync(f).size,0)}));
})().catch(error=>{console.error(error);process.exitCode=1;});
