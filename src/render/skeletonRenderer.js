/**
 * Skeleton & Pen Cursor Overlay Renderer
 * By default, renders a clean, subtle glowing pen tip indicator on the drawing finger
 * without obstructing the user's hand with skeleton lines and brackets.
 */

import { HAND_CONNECTIONS, LANDMARK_INDICES } from '../pipeline/3_keypoints.js';

export class SkeletonRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.visible = true;
    this.showSkeletonLines = false; // Disabled by default for a clean, natural camera feed
  }

  setVisible(visible) {
    this.visible = visible;
  }

  toggleSkeletonLines() {
    this.showSkeletonLines = !this.showSkeletonLines;
    return this.showSkeletonLines;
  }

  render(hands, activeActionState = {}) {
    if (!this.visible || !hands || hands.length === 0) return;

    const ctx = this.ctx;

    for (const hand of hands) {
      const lm = hand.landmarks;
      if (!lm || lm.length < 21) continue;

      const isRightHand = hand.handedness === 'Right';
      const themeColor = isRightHand ? '#38bdf8' : '#c084fc';
      const glowColor = isRightHand ? 'rgba(56, 189, 248, 0.8)' : 'rgba(192, 132, 252, 0.8)';

      // 1. Optional Debug Skeleton Lines (only if explicitly enabled)
      if (this.showSkeletonLines) {
        ctx.save();
        ctx.lineWidth = 3.0;
        ctx.strokeStyle = themeColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 10;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const [i, j] of HAND_CONNECTIONS) {
          ctx.beginPath();
          ctx.moveTo(lm[i].x, lm[i].y);
          ctx.lineTo(lm[j].x, lm[j].y);
          ctx.stroke();
        }

        // Joints
        for (let i = 0; i < 21; i++) {
          const pt = lm[i];
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, i === 8 ? 6 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = i === 8 ? '#f43f5e' : '#ffffff';
          ctx.fill();
        }
        ctx.restore();
      }

      // 2. Thumbs Up Gesture Feedback Indicator
      const gesture = hand.gestureResult ? hand.gestureResult.gesture : 'neutral';
      const isThumbsUp = gesture === 'thumbs_up';

      if (isThumbsUp) {
        const thumbTip = lm[4] || hand.palmCenter;

        ctx.save();

        // Ambient burst glow around thumb
        const radialGlow = ctx.createRadialGradient(
          thumbTip.x,
          thumbTip.y,
          5,
          thumbTip.x,
          thumbTip.y,
          45
        );
        radialGlow.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
        radialGlow.addColorStop(0.6, 'rgba(56, 189, 248, 0.2)');
        radialGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');

        ctx.fillStyle = radialGlow;
        ctx.beginPath();
        ctx.arc(thumbTip.x, thumbTip.y, 45, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing Ring
        const pulse = (Math.sin(performance.now() * 0.01) + 1) * 4 + 20;
        ctx.beginPath();
        ctx.arc(thumbTip.x, thumbTip.y, pulse, 0, Math.PI * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 10;
        ctx.stroke();

        // Badge
        ctx.shadowBlur = 0;
        ctx.font = '600 13px "Outfit", sans-serif';
        const labelText = '👍 Clearing Canvas';
        const textWidth = ctx.measureText(labelText).width;
        const pillY = thumbTip.y - 32;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        ctx.roundRect(thumbTip.x - textWidth / 2 - 12, pillY - 12, textWidth + 24, 26, 13);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, thumbTip.x, pillY);

        ctx.restore();
      }

      // 3. Elegant Glowing Floral Pen Cursor on Index Fingertip (when not thumbs up / resting)
      const isDrawing = !isThumbsUp && gesture !== 'fist' && (gesture === 'pointing' || gesture === 'pinch' || activeActionState.alwaysDraw);
      const penTarget = gesture === 'pinch' ? hand.pinchCenter : hand.indexTip;

      if (isDrawing && penTarget) {
        ctx.save();

        // Soft ambient watercolor glow
        const glowGrad = ctx.createRadialGradient(penTarget.x, penTarget.y, 2, penTarget.x, penTarget.y, 24);
        glowGrad.addColorStop(0, 'rgba(255, 182, 193, 0.9)');
        glowGrad.addColorStop(0.5, 'rgba(244, 63, 94, 0.4)');
        glowGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(penTarget.x, penTarget.y, 24, 0, Math.PI * 2);
        ctx.fill();

        // Sharp central pen point
        ctx.beginPath();
        ctx.arc(penTarget.x, penTarget.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 10;
        ctx.fill();

        // Pulsing magical ring
        ctx.beginPath();
        const pulse = (Math.sin(performance.now() * 0.008) + 1) * 3 + 10;
        ctx.arc(penTarget.x, penTarget.y, pulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
      }
    }
  }
}
