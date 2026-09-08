/** Objective audio checks; subjective listening remains a separate review. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Published gameplay and prior menu assets are rollback references, not remixes.
const preserved = {
  'pick-garden.wav': '6a119c244ecadfa95ded48b520bd0a6c1738f1875e2453f447592073b90362b4',
  'pick-garden.mp3': '45f22ef3c32412c7804be03d4be4c4a0f9c8790d08ea6a5558e38e6ffe4ad081',
  'pick-garden.json': 'edd04af2b68fb4125ff99ef47f4bb6d8546cd0c82f6464bb244c080ba619a36a',
  'pick-garden-menu.wav': 'a9ad6c2abdefe7d8d95d895939d9085d467bc4ab3b30473f0ceed4ed3e4bcaa0',
  'pick-garden-menu.mp3': '80382465e104fa698a65f14923285637c23ca14b583ce17d5e8e55edd7b827c5',
  'pick-garden-menu.json': 'bbb106b75b90b2742e420fcac7ab123a1d57e1ffcc635ef5a75e6538e060e2c5',
};
for (const [filename, sha256] of Object.entries(preserved)) {
  const bytes = readFileSync(new URL(`../public/assets/audio/${filename}`, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), sha256, `${filename}: published original stays byte-identical`);
}
const reports = [];
for (const track of ['pick-garden', 'pick-garden-menu', 'pick-lobby']) {
  const metadata = JSON.parse(readFileSync(new URL(`../public/assets/audio/${track}.json`, import.meta.url), 'utf8'));
  assert.equal(metadata.sampleRate, 44100, `${track}: 44.1 kHz`);
  assert.equal(metadata.channels, 2, `${track}: stereo`);
  assert.equal(metadata.bars, 16, `${track}: complete 16-bar arrangement`);
  assert.equal(metadata.samplesPerChannel, Math.round(metadata.seconds * metadata.sampleRate));
  const meterBeats = metadata.meterBeats ?? 4;
  assert.ok(Math.abs(metadata.seconds - metadata.bars * meterBeats * 60 / metadata.bpm) < 1e-9);
  if (track === 'pick-garden') {
    assert.equal(metadata.bpm, 100, 'gameplay tempo stays unchanged');
    assert.equal(metadata.samplesPerChannel, 1693440, 'original 38.4-second loop stays unchanged');
  } else if (track === 'pick-garden-menu') {
    assert.equal(metadata.bpm, 92, 'archived menu variation stays unchanged');
  } else {
    assert.equal(metadata.bpm, 72, 'independent lobby theme tempo');
    assert.equal(meterBeats, 3, 'independent lobby theme is a waltz, not the gameplay 4/4 arrangement');
    assert.equal(metadata.key, 'F major', 'independent lobby theme key');
    assert.equal(metadata.seconds, 40, 'complete 40-second lobby loop');
  }
  for (const format of ['wav', 'mp3']) {
    const label = `${track}.${format}`;
    const path = fileURLToPath(new URL(`../public/assets/audio/${label}`, import.meta.url));
    const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', path, '-f', 'f32le', '-acodec', 'pcm_f32le', '-'], { maxBuffer: 32 * 1024 * 1024 });
    const frames = pcm.length / 8;
    assert.equal(frames, metadata.samplesPerChannel, `${label}: full loop, no encoder silence padding`);
    let squareSum = 0;
    let peak = 0;
    for (let i = 0; i < pcm.length; i += 4) {
      const value = pcm.readFloatLE(i);
      assert.ok(Number.isFinite(value), `${label}: finite samples`);
      squareSum += value * value;
      peak = Math.max(peak, Math.abs(value));
    }
    assert.ok(peak > 0.1 && peak < 0.9, `${label}: audible but with clipping headroom`);
    const boundaryDelta = [
      Math.abs(pcm.readFloatLE(0) - pcm.readFloatLE(pcm.length - 8)),
      Math.abs(pcm.readFloatLE(4) - pcm.readFloatLE(pcm.length - 4)),
    ];
    assert.ok(boundaryDelta.every(delta => delta < 0.01), `${label}: no large discontinuity at wrap`);
    reports.push({ track, format, bytes: statSync(path).size, frames, seconds: frames / metadata.sampleRate,
      peakDbFS: 20 * Math.log10(peak), rmsDbFS: 20 * Math.log10(Math.sqrt(squareSum / (pcm.length / 4))), boundaryDelta });
  }
}
console.log(JSON.stringify({ verifiedAt: new Date().toISOString(), preservedAssetsVerified: Object.keys(preserved), reports }, null, 2));
