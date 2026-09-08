/**
 * Tap Parade — original upbeat lobby theme for TAPtoPICK.
 * Deterministic synthesis, not recordings of tap shoes or acoustic instruments.
 * No imported music, samples, dependencies, or changes to the archived generator.
 * 136 BPM, D major, 4/4, 24 bars (A / B / A'), 62% swung eighths.
 * Run: node scripts/generate-tap-lobby.mjs
 * Encode: ffmpeg -y -i public/assets/audio/pick-tap-lobby.wav -codec:a libmp3lame -q:a 4 public/assets/audio/pick-tap-lobby.mp3
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rate = 44100;
const bpm = 136;
const bars = 24;
const meterBeats = 4;
const beat = 60 / bpm;
const duration = bars * meterBeats * beat;
const count = Math.round(duration * rate);
const channels = [new Float64Array(count), new Float64Array(count)];
const tau = 2 * Math.PI;
const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
let seed = 2026090803;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296 * 2 - 1;
};
const events = { pianoMelody: 0, pianoChords: 0, bass: 0, toe: 0, heel: 0, brushedSnare: 0 };

// Circular accumulation preserves releases and the small room across the seam.
function add(when, seconds, signal, pan = 0, volume = 1) {
  const start = Math.round(when * rate);
  const left = Math.sqrt((1 - pan) / 2) * volume;
  const right = Math.sqrt((1 + pan) / 2) * volume;
  for (let i = 0; i < Math.ceil(seconds * rate); i++) {
    const at = ((start + i) % count + count) % count;
    const sample = signal(i / rate);
    channels[0][at] += sample * left;
    channels[1][at] += sample * right;
  }
}

function piano(midi, when, velocity = 1, pan = 0, accompaniment = false) {
  const f = frequency(midi);
  const length = accompaniment ? 0.48 : 0.84;
  events[accompaniment ? 'pianoChords' : 'pianoMelody']++;
  add(when, length, t => {
    const attack = 1 - Math.exp(-t / 0.0028);
    const release = Math.min(1, Math.max(0, (length - t) / 0.045));
    // Bright, short struck-string voice: harmonics decay faster than the body.
    const body = Math.sin(tau * f * t) * Math.exp(-t / (accompaniment ? 0.09 : 0.17));
    const harmonics = 0.40 * Math.sin(tau * f * 2.002 * t) * Math.exp(-t / 0.105)
      + 0.19 * Math.sin(tau * f * 3.004 * t) * Math.exp(-t / 0.063)
      + 0.085 * Math.sin(tau * f * 4.007 * t) * Math.exp(-t / 0.038);
    return (body + harmonics) * attack * release;
  }, pan, velocity * (accompaniment ? 0.071 : 0.142));
}

function bass(midi, when, velocity = 1) {
  const f = frequency(midi);
  events.bass++;
  add(when, 0.37, t => {
    const envelope = (1 - Math.exp(-t / 0.0035)) * Math.exp(-t / 0.11)
      * Math.min(1, Math.max(0, (0.37 - t) / 0.045));
    return (Math.sin(tau * f * t) + 0.29 * Math.sin(tau * f * 2 * t)
      + 0.065 * Math.sin(tau * f * 3 * t)) * envelope;
  }, -0.05, 0.23 * velocity);
}

// These two synthesized voices suggest toe plates and wooden heel contact.
// Band-limited noise avoids a brittle hi-hat-like hiss; this is NOT sampled tap.
function toe(when, velocity = 1, pan = 0.15) {
  events.toe++;
  let low = 0;
  let lower = 0;
  add(when, 0.09, t => {
    const noise = random();
    low += 0.40 * (noise - low);
    lower += 0.075 * (noise - lower);
    const plate = (low - lower) * 1.8
      + 0.12 * Math.sin(tau * 1760 * t)
      + 0.085 * Math.sin(tau * 2637 * t)
      + 0.03 * Math.sin(tau * 3711 * t);
    return plate * (1 - Math.exp(-t / 0.00065)) * Math.exp(-t / 0.013)
      * Math.min(1, Math.max(0, (0.09 - t) / 0.02));
  }, pan, 0.235 * velocity);
}

function heel(when, velocity = 1, pan = -0.14) {
  events.heel++;
  let low = 0;
  add(when, 0.12, t => {
    low += 0.14 * (random() - low);
    const wood = 0.58 * Math.sin(tau * 188 * t) * Math.exp(-t / 0.023)
      + 0.35 * Math.sin(tau * 493 * t) * Math.exp(-t / 0.011)
      + 0.4 * low * Math.exp(-t / 0.018);
    return wood * (1 - Math.exp(-t / 0.0008))
      * Math.min(1, Math.max(0, (0.12 - t) / 0.025));
  }, pan, 0.25 * velocity);
}

function brushedSnare(when, velocity = 1) {
  events.brushedSnare++;
  let low = 0;
  let lower = 0;
  add(when, 0.10, t => {
    const noise = random();
    low += 0.28 * (noise - low);
    lower += 0.045 * (noise - lower);
    return (low - lower) * (1 - Math.exp(-t / 0.001)) * Math.exp(-t / 0.020)
      * Math.min(1, Math.max(0, (0.10 - t) / 0.03));
  }, 0.25, 0.080 * velocity);
}

// Eighth positions 0..7. Offbeats fall at 62% of the beat, not a straight grid.
const swung = eighth => (Math.floor(eighth / 2) + (eighth % 2 ? 0.62 : 0)) * beat;
const at = (bar, eighth) => bar * meterBeats * beat + swung(eighth);

// Independently composed question/answer melody; neither earlier track is
// sped up or rearranged. The final phrase develops A with higher responses.
const melody = [
  [[0, 74], [1, 78], [2, 81], [4, 83], [5, 81], [7, 78]],
  [[0, 76], [2, 75], [3, 78], [5, 81], [6, 78]],
  [[1, 79], [2, 78], [4, 76], [5, 79], [7, 83]],
  [[0, 81], [3, 79], [4, 76], [6, 73]],
  [[0, 78], [1, 81], [3, 86], [4, 85], [5, 83], [7, 81]],
  [[0, 83], [2, 81], [3, 79], [5, 78], [6, 76]],
  [[0, 78], [1, 76], [2, 74], [4, 76], [5, 73], [6, 74]],
  [[0, 81], [2, 78]],
  [[0, 79], [2, 83], [3, 86], [5, 83], [7, 81]],
  [[0, 79], [1, 78], [3, 79], [4, 83], [6, 86]],
  [[0, 85], [2, 81], [3, 78], [5, 76], [6, 78]],
  [[1, 79], [2, 76], [4, 75], [5, 78], [7, 81]],
  [[0, 83], [1, 81], [3, 79], [4, 78], [6, 76]],
  [[0, 80], [2, 83], [3, 86], [5, 83], [7, 80]],
  [[0, 81], [1, 83], [2, 85], [4, 88], [5, 85], [6, 81]],
  [[0, 79], [2, 76]],
  [[0, 74], [1, 78], [2, 81], [4, 86], [5, 83], [7, 81]],
  [[0, 83], [2, 81], [3, 78], [5, 75], [6, 78]],
  [[1, 79], [2, 78], [4, 76], [5, 79], [7, 83]],
  [[0, 85], [3, 83], [4, 81], [6, 79]],
  [[0, 78], [1, 81], [3, 86], [4, 85], [5, 83], [7, 81]],
  [[0, 83], [2, 79], [3, 78], [5, 76], [6, 73]],
  [[0, 74], [1, 78], [2, 81], [4, 86], [6, 81]],
  [[0, 79], [2, 73]],
];
const harmony = [
  // root, fifth, walking approach, short right-hand chord voicing.
  [38, 45, 46, [62, 66, 69, 71]], [47, 42, 39, [63, 66, 69]],
  [40, 47, 44, [62, 67, 71]], [45, 40, 37, [61, 67, 71]],
  [38, 45, 42, [62, 66, 69, 71]], [43, 50, 44, [62, 67, 71]],
  [38, 45, 44, [62, 66, 69]], [45, 40, 42, [61, 64, 67, 71]],
  [43, 50, 47, [62, 67, 71]], [43, 50, 49, [62, 67, 71]],
  [42, 49, 46, [61, 66, 69]], [47, 42, 39, [63, 66, 69]],
  [40, 47, 39, [62, 67, 71]], [40, 47, 44, [62, 68, 71]],
  [45, 40, 44, [61, 64, 67, 71]], [45, 40, 37, [61, 64, 67, 71]],
  [38, 45, 46, [62, 66, 69, 71]], [47, 42, 39, [63, 66, 69]],
  [40, 47, 44, [62, 67, 71]], [45, 40, 37, [61, 67, 71]],
  [38, 45, 42, [62, 66, 69, 71]], [43, 50, 44, [62, 67, 71]],
  [38, 45, 44, [62, 66, 69]], [45, 40, 37, [61, 64, 67, 71]],
];

for (let bar = 0; bar < bars; bar++) {
  const breakBar = bar % 8 === 7;
  const [root, fifth, approach, voicing] = harmony[bar];
  const bassLine = [root, fifth, root + 12, approach];
  for (let pulse = 0; pulse < 4; pulse++) {
    // The last two beats of each 8-bar phrase expose the tap solo.
    if (!breakBar || pulse < 2) bass(bassLine[pulse], at(bar, pulse * 2), pulse % 2 ? 0.76 : 0.94);
    if (!breakBar || pulse === 0) {
      if (pulse === 1 || pulse === 3 || (bar % 4 === 0 && pulse === 0)) {
        voicing.forEach((note, voice) => {
          piano(note, at(bar, pulse * 2) + voice * 0.0035, pulse === 0 ? 0.48 : 0.76, -0.24, true);
        });
      }
    }
  }
  for (const [eighth, note] of melody[bar]) {
    piano(note, at(bar, eighth), eighth % 2 ? 0.82 : 1, 0.13);
  }

  // A clear alternating toe / heel pulse plus offbeat shuffles. Paired taps
  // occasionally create a short flurry instead of unvarying eight-note clicks.
  for (let pulse = 0; pulse < 4; pulse++) {
    const t = at(bar, pulse * 2);
    heel(t, pulse % 2 ? 0.63 : 0.87, pulse % 2 ? 0.09 : -0.16);
    toe(at(bar, pulse * 2 + 1), pulse === 1 || pulse === 3 ? 0.92 : 0.68,
      pulse % 2 ? -0.12 : 0.18);
    if (pulse === 1 || pulse === 3) {
      toe(t + 0.009, 0.57, -0.05);
      brushedSnare(t, 0.65);
    }
    if (!breakBar && (bar + pulse) % 4 === 2) {
      toe(t + beat * 0.33, 0.46, 0.20);
    }
  }
  if (bar % 4 === 3) {
    // A small shuffle-ball-change pickup into the next phrase.
    toe(at(bar, 7) + beat * 0.18, 0.60, -0.23);
    heel(at(bar, 7) + beat * 0.29, 0.58, 0.18);
  }
  if (breakBar) {
    for (const [position, kind, velocity] of [
      [2.20, 'toe', 0.75], [2.39, 'toe', 0.91], [2.78, 'heel', 0.78],
      [3.20, 'toe', 0.84], [3.40, 'heel', 0.94], [3.82, 'toe', 0.72],
    ]) {
      (kind === 'toe' ? toe : heel)((bar * 4 + position) * beat, velocity,
        kind === 'toe' ? 0.18 : -0.18);
    }
  }
}

// Tiny room, not a wash of reverb: the tap articulation stays forward.
const dry = channels.map(channel => Float64Array.from(channel));
for (const [seconds, volume] of [[0.023, 0.052], [0.051, 0.031], [0.087, 0.017]]) {
  const shift = Math.round(seconds * rate);
  for (let i = 0; i < count; i++) {
    const at = (i + shift) % count;
    channels[0][at] += dry[1][i] * volume;
    channels[1][at] += dry[0][i] * volume;
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
const targetPeak = 0.67;
// Gentle, continuous soft saturation tames coincident tap transients rather
// than increasing the output ceiling. The rhythm remains audible at BGM gain
// without requiring a near-clipping master or flattening the short attacks.
const saturationDrive = 1.3;
for (const channel of channels) {
  for (let i = 0; i < count; i++) channel[i] = Math.tanh(saturationDrive * channel[i] / peak);
}
peak = Math.tanh(saturationDrive);
const gain = targetPeak / peak;
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
writeFileSync(`${directory}/pick-tap-lobby.wav`, wav);
const report = {
  title: 'Tap Parade', originalComposition: true, sampledAudio: false,
  bpm, key: 'D major', meterBeats, bars, seconds: duration, sampleRate: rate,
  samplesPerChannel: count, channels: 2, bits: 16, bytes: wav.length,
  peakDbFS: 20 * Math.log10(targetPeak),
  rmsDbFS: 20 * Math.log10(Math.sqrt(squareSum / (2 * count))),
  loopBoundaryDelta: channels.map(channel => Math.abs(channel[0] - channel[count - 1]) * gain),
  mastering: { softSaturationDrive: saturationDrive, peakCeiling: targetPeak, noHardClipping: true },
  swingRatio: 0.62,
  instruments: ['short bright piano', 'bouncing walking bass', 'synthesized metallic toe taps',
    'synthesized wooden heel taps', 'light brushed backbeat'],
  arrangement: "New 24-bar A / B / A' swing composition. Toe/heel taps alternate under syncopated piano. The last two beats of bars 8, 16, and 24 make room for short tap breaks. No sampled footfalls or melodies; archived songs are not sped up or modified.",
  events,
};
writeFileSync(`${directory}/pick-tap-lobby.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
