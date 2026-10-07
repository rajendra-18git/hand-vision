/**
 * Cybernetic Theremin & Audio-Visual Synesthesia Engine
 * 
 * Features:
 * - Real-time Web Audio API Polyphonic / Continuous Oscillator
 * - Pitch mapped continuously to hand vertical coordinate (Y)
 * - Low-Pass Filter cutoff / resonance modulated by Pinch distance
 * - Stereo Panning mapped to horizontal coordinate (X)
 * - Harmonized musical scale quantization: Pentatonic, Celestial, Cyber Synth
 * - Real-time neon oscilloscope & sound ripple visualizer
 * - Mouse / pointer interaction support
 */

export const SYNTH_SCALES = {
  pentatonic: {
    name: 'Zen Pentatonic',
    notes: ['C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5'],
    frequencies: [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00]
  },
  celestial: {
    name: 'Celestial Aura',
    notes: ['F3', 'A3', 'C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6'],
    frequencies: [174.61, 220.00, 261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]
  },
  cyber: {
    name: 'Cyberwave Synth',
    notes: ['A2', 'C3', 'D3', 'E3', 'A3', 'C4', 'D4', 'E4', 'A4', 'C5', 'D5', 'E5', 'A5'],
    frequencies: [110.00, 130.81, 146.83, 164.81, 220.00, 261.63, 293.66, 329.63, 440.00, 523.25, 587.33, 659.25, 880.00]
  }
};

export class ThereminSynth {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.audioCtx = null;
    this.osc1 = null;
    this.osc2 = null;
    this.gainNode = null;
    this.filterNode = null;
    this.pannerNode = null;
    this.analyser = null;
    this.dataArray = null;

    this.isPlaying = false;
    this.currentScale = 'pentatonic';
    this.currentNoteName = 'C4';
    this.currentFreq = 261.63;
    this.soundRipples = [];
    this.pointerPos = null;

    // Attach user gesture listener to unlock AudioContext seamlessly
    const unlockAudio = () => {
      this.initAudio();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
  }

  setPointer(point) {
    this.pointerPos = point;
  }

  initAudio() {
    if (this.audioCtx) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();

      // 1. Oscillators (Warm dual-sawtooth & sine mix)
      this.osc1 = this.audioCtx.createOscillator();
      this.osc1.type = 'sine';
      this.osc2 = this.audioCtx.createOscillator();
      this.osc2.type = 'triangle';

      // 2. Filter (Low-pass)
      this.filterNode = this.audioCtx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(1200, this.audioCtx.currentTime);
      this.filterNode.Q.setValueAtTime(3.5, this.audioCtx.currentTime);

      // 3. Panner
      this.pannerNode = this.audioCtx.createStereoPanner ? this.audioCtx.createStereoPanner() : null;

      // 4. Master Gain (with smooth envelope)
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);

      // 5. Visualizer Analyser
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      // Connect audio graph
      this.osc1.connect(this.filterNode);
      this.osc2.connect(this.filterNode);

      if (this.pannerNode) {
        this.filterNode.connect(this.pannerNode);
        this.pannerNode.connect(this.gainNode);
      } else {
        this.filterNode.connect(this.gainNode);
      }

      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      this.osc1.start();
      this.osc2.start();
    } catch (err) {
      console.warn('Web Audio initialization error:', err);
    }
  }

  setScale(key) {
    if (SYNTH_SCALES[key]) {
      this.currentScale = key;
    }
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  render(gestureResult, timestamp = performance.now()) {
    const ctx = this.ctx;
    const w = this.canvas.width || window.innerWidth;
    const h = this.canvas.height || window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    const primaryHand = gestureResult?.primaryHand;
    const hands = gestureResult?.hands || [];

    let activePoint = null;
    let pinchVal = 0.6;

    if (primaryHand && (primaryHand.indexTip || primaryHand.palmCenter)) {
      activePoint = primaryHand.indexTip || primaryHand.palmCenter;
      pinchVal = primaryHand.normalizedPinchDistance ?? 0.6;
    } else if (this.pointerPos) {
      activePoint = this.pointerPos;
    }

    if (activePoint) {
      if (!this.audioCtx) this.initAudio();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      // 1. Calculate Pitch from Y (Top = High Pitch, Bottom = Low Pitch)
      const normY = Math.max(0, Math.min(1, 1.0 - (activePoint.y / h)));
      const scaleConfig = SYNTH_SCALES[this.currentScale];
      const scaleFreqs = scaleConfig.frequencies;
      const noteIdx = Math.floor(normY * (scaleFreqs.length - 1));
      const targetFreq = scaleFreqs[noteIdx];
      this.currentFreq = targetFreq;
      this.currentNoteName = scaleConfig.notes[noteIdx] || 'C4';

      // 2. Calculate Stereo Pan from X
      const normX = Math.max(-1, Math.min(1, (activePoint.x / w) * 2 - 1));

      // 3. Calculate Filter Cutoff from Pinch Distance or Left Hand
      if (hands.length >= 2 && hands[1].pinchData) {
        pinchVal = hands[1].normalizedPinchDistance ?? 0.5;
      }
      const targetCutoff = 250 + pinchVal * 3800;

      if (this.audioCtx && this.gainNode) {
        const now = this.audioCtx.currentTime;
        this.osc1.frequency.setTargetAtTime(targetFreq, now, 0.04);
        this.osc2.frequency.setTargetAtTime(targetFreq * 1.004, now, 0.04);
        this.filterNode.frequency.setTargetAtTime(targetCutoff, now, 0.05);

        if (this.pannerNode) {
          this.pannerNode.pan.setTargetAtTime(normX, now, 0.04);
        }

        // Active sound volume
        this.gainNode.gain.setTargetAtTime(0.22, now, 0.04);
        this.isPlaying = true;
      }

      // Spawn visual ripples at touch point
      if (Math.random() > 0.45) {
        this.soundRipples.push({
          x: activePoint.x,
          y: activePoint.y,
          radius: 12,
          alpha: 0.95,
          color: '#38bdf8'
        });
      }

      // Render Floating Note Badge
      this.renderNoteBadge(ctx, activePoint.x, activePoint.y, this.currentNoteName, Math.round(this.currentFreq));
    } else {
      if (this.audioCtx && this.gainNode) {
        this.gainNode.gain.setTargetAtTime(0.0001, this.audioCtx.currentTime, 0.08);
        this.isPlaying = false;
      }
    }

    // Render Audio Visualizer Oscilloscope
    this.renderOscilloscope(ctx, w, h);

    // Render Expanding Ripples
    for (let i = this.soundRipples.length - 1; i >= 0; i--) {
      const r = this.soundRipples[i];
      r.radius += 4.0;
      r.alpha -= 0.025;

      if (r.alpha <= 0) {
        this.soundRipples.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = r.alpha;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  renderNoteBadge(ctx, x, y, note, freq) {
    ctx.save();
    const tag = `🎵 ${note} (${freq} Hz)`;
    ctx.font = '700 13px "Outfit", sans-serif';
    const tw = ctx.measureText(tag).width;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect(x - tw / 2 - 10, y - 44, tw + 20, 26, 13);
    ctx.fill();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, x, y - 31);
    ctx.restore();
  }

  renderOscilloscope(ctx, w, h) {
    if (!this.analyser || !this.dataArray || !this.isPlaying) return;

    this.analyser.getByteTimeDomainData(this.dataArray);

    ctx.save();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#38bdf8';
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 18;
    ctx.beginPath();

    const sliceWidth = w / this.dataArray.length;
    let x = 0;

    for (let i = 0; i < this.dataArray.length; i++) {
      const v = this.dataArray[i] / 128.0;
      const y = (v * (h * 0.22)) + (h * 0.38);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);

      x += sliceWidth;
    }

    ctx.stroke();

    // Secondary white core
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.restore();
  }

  stop() {
    if (this.audioCtx && this.gainNode) {
      this.gainNode.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);
      this.isPlaying = false;
    }
  }
}
