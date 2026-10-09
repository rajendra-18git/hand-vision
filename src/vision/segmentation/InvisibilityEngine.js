/**
 * Invisibility Cloak & Person Segmentation Engine
 * 
 * Provides optical cloaking shimmer effects and energy shielding
 * without obstructing or blacking out the camera video layer.
 */

export class InvisibilityEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d', { willReadFrequently: true }) : null;

    this.isActive = false;
    this.cloakAlpha = 0;
    this.targetAlpha = 0;
    this.shimmerPhase = 0;
  }

  resize(width, height) {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  toggle() {
    this.isActive = !this.isActive;
    this.targetAlpha = this.isActive ? 1.0 : 0.0;
    return this.isActive;
  }

  setActive(active) {
    this.isActive = !!active;
    this.targetAlpha = this.isActive ? 1.0 : 0.0;
  }

  captureBackground(videoElement) {
    // No-op to avoid overlaying stale or uninitialized frames
  }

  /**
   * Render optical invisibility shimmer effect over the video stream
   */
  render(videoElement, gestureResult, timestamp = performance.now()) {
    if (!this.canvas || !this.ctx) return;

    this.cloakAlpha += (this.targetAlpha - this.cloakAlpha) * 0.15;
    if (this.cloakAlpha < 0.01) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    this.shimmerPhase += 0.06;

    ctx.save();
    ctx.globalAlpha = this.cloakAlpha * 0.75;
    ctx.strokeStyle = `hsl(${Math.sin(this.shimmerPhase) * 50 + 190}, 95%, 65%)`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 15;

    // Draw energy shield ring and hexagonal refraction grid around detected hands
    if (gestureResult && gestureResult.hands) {
      for (const hand of gestureResult.hands) {
        const center = hand.palmCenter;
        const scale = hand.scale || 50;

        // Energy shield ring
        ctx.beginPath();
        ctx.arc(center.x, center.y, scale * 1.6 + Math.sin(this.shimmerPhase * 2) * 8, 0, Math.PI * 2);
        ctx.stroke();

        // Refraction grid
        const hexSize = 28;
        const startX = center.x - scale * 1.4;
        const startY = center.y - scale * 1.4;
        
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1;
        for (let x = startX; x < center.x + scale * 1.4; x += hexSize) {
          for (let y = startY; y < center.y + scale * 1.4; y += hexSize) {
            ctx.strokeRect(x, y, hexSize - 6, hexSize - 6);
          }
        }
      }
    }

    ctx.restore();
  }
}
