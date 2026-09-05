/** Verify the documentation package; no runtime dependencies or app writes. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=__dirname;
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const report=fs.readFileSync(path.join(root,'README.md'),'utf8');
const ids=new Set();
let totalBytes=0;
for(const item of manifest.captures){
  assert(!ids.has(item.id),`duplicate ${item.id}`);ids.add(item.id);
  const data=fs.readFileSync(path.join(root,item.file));totalBytes+=data.length;
  assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(data.readUInt32BE(16),780,item.id);
  assert.equal(data.readUInt32BE(20),1688,item.id);
  assert.equal(createHash('sha256').update(data).digest('hex'),item.sha256,item.id);
  assert.equal(item.errors.length,0,`${item.id}: page errors`);
  assert(item.ui.images.every(image=>image.loaded),`${item.id}: visible image not loaded`);
  assert(report.includes(item.file),`${item.id}: missing from report`);
  const sha=execFileSync('git',['rev-parse',item.revision],{encoding:'utf8'}).trim();
  assert.equal(sha,item.commit);
}
assert.equal(ids.size,34);
for(const match of report.matchAll(/src="([^"]+)"/g))assert(fs.existsSync(path.join(root,match[1])),match[1]);
const byId=Object.fromEntries(manifest.captures.map(item=>[item.id,item]));
assert.equal(byId['03-initial-montage'].ui.boardCount,81);
assert.equal(byId['27-current-stage2'].ui.boardCount,4);
assert.equal(byId['30-door-closed'].ui.doors,2);
assert.equal(byId['26-memory-hearts-bug'].ui.heartsDisplay,'flex');
assert.equal(byId['32-memory-hearts-fixed'].ui.heartsDisplay,'none');
const evidence=JSON.parse(fs.readFileSync(path.join(root,'git-evidence.json'),'utf8'));
assert(evidence.picturePieces.allNamesMatched);
assert.equal(evidence.picturePieces.original.count,75);
assert.equal(evidence.picturePieces.optimized.count,75);
const result={verifiedAt:new Date().toISOString(),status:'passed',captureCount:ids.size,
  pngSize:{width:780,height:1688},totalScreenshotBytes:totalBytes,
  checks:['PNG signatures and dimensions','SHA-256 hashes','Git revision identity','all captures referenced in report','all report image links exist','no captured page errors','all visible images loaded','selected UI before/after state assertions','75 matched image asset names'],
  limits:'Does not measure usability, real-device compatibility, network loading speed, audio/video playback, or all animation frames.'};
fs.writeFileSync(path.join(root,'verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
