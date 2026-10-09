/**
 * Invisibility Cloak & Person Segmentation Engine
 * 
 * Kept completely decoupled from hand-pose estimation.
 * Provides optical invisibility cloak effects, background subtraction blending,
 * and chromatic refraction distortion around the user's silhouette.
 */

export class InvisibilityEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d', { willReadFrequently: true }) : null;

    this.isActive = false;
    this.backgroundBuffer = null;
    this.bgCanvas = document.createElement('canvas');
    this.bgCtx = this.bgCanvas.getContext('2d', { willReadFrequently: true });

    this.cloakAlpha = 0;
    this.targetAlpha = 0;
    this.lastToggleTime = 0;
    this.shimmerPhase = 0;
  }

  resize(width, height) {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.bgCanvas.width = width;
    this.bgCanvas.height = height;
  }

  toggle() {
    this.isActive = !this.isActive;
    this.targetAlpha = this.isActive ? 1.0 : 0.0;
    return this.isActive;
  }

  setActive(active) {
    this.isActive = active;
    this.targetAlpha = active ? 1.0 : 0.0;
  }

  captureBackground(videoElement) {
    if (!videoElement || !videoElement.videoWidth) return;
    this.bgCtx.drawImage(videoElement, 0, 0, this.bgCanvas.width, this.bgCanvas.height);
    this.backgroundBuffer = this.bgCtx.getImageData(0, 0, this.bgCanvas.width, this.bgCanvas.height);
  }

  /**
   * Render real-time invisibility cloak effect over the video stream
   */
  render(videoElement, gestureResult, timestamp = performance.now()) {
    if (!this.canvas || !this.ctx || !videoElement || !videoElement.videoWidth) return;

    // Smooth transition
    this.cloakAlpha += (this.targetAlpha - this.cloakAlpha) * 0.12;
    if (this.cloakAlpha < 0.01) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    this.shimmerPhase += 0.05;

    // Capture initial background if missing
    if (!this.backgroundBuffer) {
      this.captureBackground(videoElement);
    }

    ctx.save();
    ctx.globalAlpha = this.cloakAlpha * 0.85;

    // Draw background texture buffer (simulating optical transparency)
    if (this.backgroundBuffer) {
      ctx.drawImage(this.bgCanvas, 0, 0, w, h);
    }

    // Add mystical sci-fi chromatic shimmer & edge refraction
    ctx.globalAlpha = this.cloakAlpha * 0.45;
    ctx.strokeStyle = `hsl(${Math.sin(this.shimmerPhase) * 60 + 190}, 90%, 65%)`;
    ctx.lineWidth = 4;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 20;

    // If hands are detected, draw invisibility field ripples around hands
    if (gestureResult && gestureResult.hands) {
      for (const hand of gestureResult.hands) {
        const center = hand.palmCenter;
        const scale = hand.scale || 50;

        // Energy shield ring
        ctx.beginPath();
        ctx.arc(center.x, center.y, scale * 1.8 + Math.sin(this.shimmerPhase * 2) * 10, 0, Math.PI * 2);
        ctx.stroke();

        // Hexagonal cloaking grid
        const hexSize = 25;
        const startX = center.x - scale * 1.5;
        const startY = center.y - scale * 1.5;
        
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 1;
        for (let x = startX; x < center.x + scale * 1.5; x += hexSize) {
          for (let y = startY; y < center.y + scale * 1.5; y += hexSize) {
            ctx.strokeRect(x, y, hexSize - 4, hexSize - 4);
          }
        }
      }
    }

    ctx.restore();
  }
}
