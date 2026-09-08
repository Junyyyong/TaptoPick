/**
 * Pick Garden — original, deterministic instrumental composed for TAPtoPICK.
 * No samples, borrowed melodies, network services, or runtime dependencies.
 * 100 BPM, C major, 16 bars; note/reverb tails wrap onto the loop start.
 * Run: node scripts/generate-pick-music.mjs
 * Web encode: ffmpeg -y -i public/assets/audio/pick-garden.wav -codec:a libmp3lame -q:a 4 public/assets/audio/pick-garden.mp3
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rate = 44100;
const bpm = 100;
const beat = 60 / bpm;
const duration = 16 * 4 * beat;
const count = Math.round(rate * duration);
const channels = [new Float64Array(count), new Float64Array(count)];
const tau = Math.PI * 2;
const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
let seed = 20260908;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296 * 2 - 1;
};

function add(when, length, sample, pan = 0, level = 1) {
  const left = Math.sqrt((1 - pan) / 2) * level;
  const right = Math.sqrt((1 + pan) / 2) * level;
  const start = Math.round(when * rate);
  for (let i = 0; i < Math.ceil(length * rate); i++) {
    const at = (start + i) % count;
    const value = sample(i / rate);
    channels[0][at] += value * left;
    channels[1][at] += value * right;
  }
}

function marimba(midi, when, velocity = 1, pan = 0) {
  const f = frequency(midi);
  add(when, 1.7, t => {
    const attack = 1 - Math.exp(-t / 0.004);
    const release = Math.min(1, Math.max(0, (1.7 - t) / 0.09));
    const fundamental = Math.sin(tau * f * t) * Math.exp(-t / 0.29);
    const wood = 0.22 * Math.sin(tau * f * 4 * t) * Math.exp(-t / 0.055);
    const bell = 0.055 * Math.sin(tau * f * 9 * t) * Math.exp(-t / 0.022);
    return (fundamental + wood + bell) * attack * release;
  }, pan, 0.19 * velocity);
}

function bass(midi, when, velocity = 1) {
  const f = frequency(midi);
  add(when, 0.85, t => {
    const envelope = (1 - Math.exp(-t / 0.012)) * Math.exp(-t / 0.20)
      * Math.min(1, Math.max(0, (0.85 - t) / 0.06));
    return (Math.sin(tau * f * t) + 0.14 * Math.sin(tau * f * 2 * t)) * envelope;
  }, 0, 0.16 * velocity);
}

function brush(when, accent) {
  let previous = 0;
  add(when, 0.095, t => {
    const noise = random();
    const high = noise - previous;
    previous = noise;
    return high * (1 - Math.exp(-t / 0.002)) * Math.exp(-t / 0.019)
      * Math.max(0, 1 - t / 0.095);
  }, 0.26, accent ? 0.015 : 0.007);
}

// Four-bar question/answer phrases, with open spaces for game sound effects.
// Each pair is [eighth-note position, MIDI note]. This melody was composed here.
const melody = [
  [[0, 76], [1, 79], [3, 81], [5, 79], [6, 76]],
  [[0, 74], [2, 72], [3, 74], [6, 76]],
  [[1, 72], [2, 76], [4, 79], [6, 76], [7, 74]],
  [[0, 74], [3, 71], [5, 69], [6, 71]],
  [[0, 76], [2, 79], [3, 84], [5, 81], [7, 79]],
  [[0, 76], [2, 74], [4, 72], [7, 74]],
  [[0, 77], [1, 76], [3, 72], [5, 69], [6, 72]],
  [[0, 74], [2, 79], [4, 76], [6, 74]],
  [[0, 79], [2, 76], [3, 74], [5, 76], [7, 79]],
  [[0, 81], [3, 79], [4, 76], [6, 72]],
  [[1, 77], [2, 81], [4, 79], [6, 77]],
  [[0, 76], [2, 74], [3, 71], [6, 74]],
  [[0, 76], [1, 79], [3, 84], [5, 79], [6, 76]],
  [[0, 74], [2, 72], [4, 69], [7, 72]],
  [[0, 77], [2, 76], [3, 74], [5, 72]],
  [[0, 74], [2, 71], [4, 67], [6, 74]],
];
// C6 / Am7 / Fmaj7 / G6, changing every bar. Warm, simple and unhurried.
const chords = [[48, 60, 64, 69], [45, 60, 64, 67], [41, 57, 60, 64], [43, 59, 62, 67]];
for (let bar = 0; bar < 16; bar++) {
  const start = bar * 4 * beat;
  const [root, ...voicing] = chords[bar % 4];
  bass(root, start, 0.95);
  bass(root + 7, start + beat * 2.5, 0.65);
  for (let pulse = 0; pulse < 4; pulse++) {
    marimba(voicing[pulse % 3], start + (pulse + 0.5) * beat, 0.25, -0.32);
  }
  for (const [position, note] of melody[bar]) {
    marimba(note, start + position * beat / 2, position % 2 === 0 ? 0.84 : 0.66, 0.16);
  }
  for (let tick = 0; tick < 8; tick++) brush(start + tick * beat / 2, tick === 2 || tick === 6);
}

// Quiet, circular stereo room. Wraparound avoids truncating the last notes.
const dry = channels.map(channel => Float64Array.from(channel));
for (const [delay, gain] of [[0.083, 0.07], [0.151, 0.045], [0.281, 0.025]]) {
  const shift = Math.round(delay * rate);
  for (let i = 0; i < count; i++) {
    const at = (i + shift) % count;
    channels[0][at] += dry[1][i] * gain;
    channels[1][at] += dry[0][i] * gain;
  }
}
let peak = 0;
for (const channel of channels) {
  const mean = channel.reduce((sum, value) => sum + value, 0) / count;
  for (let i = 0; i < count; i++) {
    channel[i] -= mean;
    peak = Math.max(peak, Math.abs(channel[i]));
  }
}
const gain = 0.67 / peak;
const wav = Buffer.alloc(44 + count * 4);
wav.write('RIFF', 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 4, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(count * 4, 40);
let squareSum = 0;
for (let i = 0; i < count; i++) {
  for (let channel = 0; channel < 2; channel++) {
    const value = channels[channel][i] * gain;
    squareSum += value * value;
    wav.writeInt16LE(Math.round(value * 32767), 44 + i * 4 + channel * 2);
  }
}
const directory = fileURLToPath(new URL('../public/assets/audio/', import.meta.url));
mkdirSync(directory, { recursive: true });
writeFileSync(`${directory}/pick-garden.wav`, wav);
const report = {
  title: 'Pick Garden', originalComposition: true, sampledAudio: false,
  bpm, key: 'C major', bars: 16, seconds: duration, sampleRate: rate,
  samplesPerChannel: count, channels: 2, bits: 16, bytes: wav.length,
  peakDbFS: 20 * Math.log10(0.67), rmsDbFS: 20 * Math.log10(Math.sqrt(squareSum / (2 * count))),
  loopBoundaryDelta: channels.map(channel => Math.abs(channel[0] - channel[count - 1]) * gain),
};
writeFileSync(`${directory}/pick-garden.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(report);
