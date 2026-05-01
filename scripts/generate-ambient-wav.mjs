/**
 * One-off: writes a short loopable soft water-like ambience as PCM WAV (pink-ish noise, low amplitude).
 * Run: node scripts/generate-ambient-wav.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sampleRate = 44100;
const durationSec = 8;
const numChannels = 1;
const numSamples = sampleRate * durationSec;
const bitsPerSample = 16;
const blockAlign = (numChannels * bitsPerSample) / 8;
const byteRate = sampleRate * blockAlign;
const dataSize = numSamples * blockAlign;
const buffer = Buffer.alloc(44 + dataSize);

let state = 12345;
function nextRand() {
  state = (state * 1664525 + 1013904223) >>> 0;
  return state / 4294967296;
}

// Simple pink approximation: sum of octaves of white noise
let b0 = 0;
let b1 = 0;
let b2 = 0;
let b3 = 0;
let b4 = 0;
let b5 = 0;
function pink() {
  const white = nextRand() * 2 - 1;
  b0 = 0.99886 * b0 + white * 0.0555179;
  b1 = 0.99332 * b1 + white * 0.0750759;
  b2 = 0.969 * b2 + white * 0.153852;
  b3 = 0.8665 * b3 + white * 0.3104856;
  b4 = 0.55 * b4 + white * 0.5329522;
  b5 = -0.7616 * b5 - white * 0.016898;
  return b0 + b1 + b2 + b3 + b4 + b5 + white * 0.5362;
}

buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(byteRate, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(bitsPerSample, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

const vol = 0.055;
let offset = 44;
for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  const cyclesInClip = 3;
  const slow = Math.sin((2 * Math.PI * cyclesInClip * t) / durationSec) * 0.2;
  const sample = pink() * (0.62 + slow) * vol;
  const s = Math.max(-1, Math.min(1, sample));
  buffer.writeInt16LE(Math.round(s * 32767), offset);
  offset += 2;
}

const out = join(__dirname, '..', 'public', 'audio', 'ambient-water.wav');
writeFileSync(out, buffer);
console.log('Wrote', out, buffer.length, 'bytes');
