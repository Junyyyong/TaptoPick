/** Objective audio checks; subjective listening remains a separate review. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const reports = [];
for (const format of ['wav', 'mp3']) {
  const path = fileURLToPath(new URL(`../public/assets/audio/pick-garden.${format}`, import.meta.url));
  const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', path, '-f', 'f32le', '-acodec', 'pcm_f32le', '-'], { maxBuffer: 32 * 1024 * 1024 });
  const frames = pcm.length / 8;
  assert.equal(frames, 1693440, `${format}: full 38.4-second loop, no encoder silence padding`);
  let squareSum = 0;
  let peak = 0;
  for (let i = 0; i < pcm.length; i += 4) {
    const value = pcm.readFloatLE(i);
    assert.ok(Number.isFinite(value), `${format}: finite samples`);
    squareSum += value * value;
    peak = Math.max(peak, Math.abs(value));
  }
  assert.ok(peak > 0.1 && peak < 0.9, `${format}: audible but with clipping headroom`);
  const boundaryDelta = [
    Math.abs(pcm.readFloatLE(0) - pcm.readFloatLE(pcm.length - 8)),
    Math.abs(pcm.readFloatLE(4) - pcm.readFloatLE(pcm.length - 4)),
  ];
  assert.ok(boundaryDelta.every(delta => delta < 0.01), `${format}: no large discontinuity at wrap`);
  reports.push({ format, bytes: statSync(path).size, frames, seconds: frames / 44100,
    peakDbFS: 20 * Math.log10(peak), rmsDbFS: 20 * Math.log10(Math.sqrt(squareSum / (pcm.length / 4))), boundaryDelta });
}
console.log(JSON.stringify({ verifiedAt: new Date().toISOString(), reports }, null, 2));
