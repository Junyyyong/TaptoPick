/** Objective audio checks; subjective listening remains a separate review. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const reports = [];
for (const track of ['pick-garden', 'pick-garden-menu']) {
  const metadata = JSON.parse(readFileSync(new URL(`../public/assets/audio/${track}.json`, import.meta.url), 'utf8'));
  assert.equal(metadata.sampleRate, 44100, `${track}: 44.1 kHz`);
  assert.equal(metadata.channels, 2, `${track}: stereo`);
  assert.equal(metadata.bars, 16, `${track}: complete 16-bar arrangement`);
  assert.equal(metadata.samplesPerChannel, Math.round(metadata.seconds * metadata.sampleRate));
  assert.ok(Math.abs(metadata.seconds - metadata.bars * 4 * 60 / metadata.bpm) < 1e-9);
  if (track === 'pick-garden') {
    assert.equal(metadata.bpm, 100, 'gameplay tempo stays unchanged');
    assert.equal(metadata.samplesPerChannel, 1693440, 'original 38.4-second loop stays unchanged');
  } else {
    assert.equal(metadata.bpm, 92, 'menu is a slightly calmer version of the same theme');
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
console.log(JSON.stringify({ verifiedAt: new Date().toISOString(), reports }, null, 2));
