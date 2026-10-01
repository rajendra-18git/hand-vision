import fs from 'fs';

// Generate a 15-second high-quality 44.1kHz 16-bit stereo WAV launch soundtrack
const sampleRate = 44100;
const duration = 15.0; // 15 seconds
const numSamples = Math.floor(sampleRate * duration);
const numChannels = 2;
const bytesPerSample = 2;
const blockAlign = numChannels * bytesPerSample;
const byteRate = sampleRate * blockAlign;
const dataSize = numSamples * blockAlign;

const buffer = Buffer.alloc(44 + dataSize);

// Write WAV Header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(byteRate, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(16, 34); // BitsPerSample
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

// Musical notes and frequencies (BPM = 120 -> 2 beats per sec)
// Key of D Major / B Minor: D (293.66), F# (369.99), A (440.0), B (493.88), E (329.63), C# (554.37)
const bpm = 124;
const beatLen = 60 / bpm; // ~0.4838s

function getChord(time) {
  // Chord progression: Bm (0-3.8s) -> G (3.8-7.7s) -> D (7.7-11.6s) -> A (11.6-15s)
  if (time < 3.87) {
    return [246.94, 293.66, 369.99, 493.88]; // Bm
  } else if (time < 7.74) {
    return [196.00, 246.94, 293.66, 392.00]; // G
  } else if (time < 11.61) {
    return [293.66, 369.99, 440.00, 587.33]; // D
  } else {
    return [220.00, 277.18, 329.63, 440.00]; // A
  }
}

function getBass(time) {
  if (time < 3.87) return 61.74; // B1
  if (time < 7.74) return 49.00; // G1
  if (time < 11.61) return 73.42; // D2
  return 55.00; // A1
}

// Generate sound samples
for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  
  // Overall master envelope (fade-in first 0.3s, fade-out last 0.8s)
  let masterGain = 1.0;
  if (t < 0.3) masterGain = t / 0.3;
  if (t > 14.2) masterGain = Math.max(0, (15.0 - t) / 0.8);

  // 1. Ambient Pad / Synth Chords
  const chord = getChord(t);
  let padL = 0;
  let padR = 0;
  chord.forEach((freq, idx) => {
    const detuneL = freq * 1.003;
    const detuneR = freq * 0.997;
    const waveL = Math.sin(2 * Math.PI * detuneL * t) + 0.3 * Math.sin(4 * Math.PI * detuneL * t);
    const waveR = Math.sin(2 * Math.PI * detuneR * t) + 0.3 * Math.sin(4 * Math.PI * detuneR * t);
    const pan = (idx / (chord.length - 1)) * 0.6 - 0.3;
    padL += waveL * (0.5 - pan) * 0.07;
    padR += waveR * (0.5 + pan) * 0.07;
  });

  // 2. Bass (Active from t=3.0 onwards for punchy drop)
  let bass = 0;
  if (t >= 3.0) {
    const bassFreq = getBass(t);
    const bassEnv = Math.min(1.0, (t - 3.0) / 0.5);
    // Sub bass + saw warmth
    const sub = Math.sin(2 * Math.PI * bassFreq * t);
    const saw = (2 * ((bassFreq * t) % 1) - 1) * 0.4;
    bass = (sub + saw) * 0.22 * bassEnv;
  }

  // 3. Kick Drum (4-on-the-floor after drop at t=3.0s)
  let kick = 0;
  if (t >= 3.0 && t < 14.0) {
    const beatTime = (t - 3.0) % beatLen;
    if (beatTime < 0.2) {
      const kickFreq = 140 * Math.exp(-beatTime * 30) + 45;
      const kickEnv = Math.exp(-beatTime * 18);
      kick = Math.sin(2 * Math.PI * kickFreq * beatTime) * kickEnv * 0.35;
    }
  }

  // 4. Snare / Clap on beats 2 & 4
  let snare = 0;
  if (t >= 3.0 && t < 14.0) {
    const beatInBar = ((t - 3.0) / beatLen) % 4;
    // Beats 1 and 3 (0-indexed 1 and 3 -> 2nd and 4th beats)
    const distToBeat = Math.min(
      Math.abs(beatInBar - 1),
      Math.abs(beatInBar - 3)
    ) * beatLen;

    if (distToBeat >= 0 && distToBeat < 0.18) {
      // Noise + tone snap
      const noise = (Math.random() * 2 - 1) * Math.exp(-distToBeat * 25);
      const snapTone = Math.sin(2 * Math.PI * 220 * distToBeat) * Math.exp(-distToBeat * 35);
      snare = (noise * 0.25 + snapTone * 0.2) * 0.6;
    }
  }

  // 5. Hi-Hats / Tech Shakers
  let hihat = 0;
  if (t >= 3.0 && t < 14.2) {
    const eighthTime = ((t - 3.0) % (beatLen / 2));
    if (eighthTime < 0.05) {
      const hatNoise = (Math.random() * 2 - 1) * Math.exp(-eighthTime * 70);
      hihat = hatNoise * 0.08;
    }
  }

  // 6. Arpeggiator Melody (Sparkling high notes)
  let arp = 0;
  if (t >= 1.5) {
    const arpBeat = (t * 4) % chord.length;
    const arpNoteIdx = Math.floor(arpBeat);
    const arpFreq = chord[arpNoteIdx] * 2; // 1 octave higher
    const noteTime = (t * 4) % 1;
    const arpEnv = Math.exp(-noteTime * 6);
    arp = Math.sin(2 * Math.PI * arpFreq * t) * arpEnv * 0.09;
  }

  // 7. Riser Swell before drop (t=2.0 to 3.0s) & Climax Swell (t=9.8 to 10.6s)
  let riser = 0;
  if (t >= 1.8 && t < 3.0) {
    const progress = (t - 1.8) / 1.2;
    const riserFreq = 200 + progress * 800;
    riser = Math.sin(2 * Math.PI * riserFreq * t) * (progress * 0.15) * (Math.random() * 0.3 + 0.7);
  } else if (t >= 9.8 && t < 10.6) {
    const progress = (t - 9.8) / 0.8;
    const riserFreq = 300 + progress * 1000;
    riser = Math.sin(2 * Math.PI * riserFreq * t) * (progress * 0.18);
  }

  // Combine Channels
  let left = (padL + bass * 0.8 + kick + snare * 0.9 + hihat * 0.7 + arp * 0.6 + riser * 0.8) * masterGain;
  let right = (padR + bass * 0.8 + kick + snare * 0.9 + hihat * 1.1 + arp * 1.0 + riser * 0.8) * masterGain;

  // Soft Limiter / Clamping
  left = Math.max(-0.95, Math.min(0.95, left));
  right = Math.max(-0.95, Math.min(0.95, right));

  const intL = Math.floor(left * 32767);
  const intR = Math.floor(right * 32767);

  const offset = 44 + i * blockAlign;
  buffer.writeInt16LE(intL, offset);
  buffer.writeInt16LE(intR, offset + 2);
}

fs.writeFileSync('bgm.wav', buffer);
console.log('Successfully generated bgm.wav (15.0s, 44.1kHz stereo)!');
