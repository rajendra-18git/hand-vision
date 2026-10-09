/**
 * Skeleton & Vision AR Gesture Feedback Renderer (VisionGarden AI)
 * 
 * Provides:
 * - Minimal, elegant Apple-style glowing tracking dots & optional joint connectors
 * - Continuous Pinch Gauge & dynamic connection line between thumb and index tip
 * - Gesture state badges (Drawing, Bloomed, Pinch % intensity, Mode Peace, Erasing Fist, Thumbs Up)
 * - Targeting cursor for pointing
 */

import { HAND_CONNECTIONS, LANDMARK_INDICES } from '../pipeline/3_keypoints.js';
import { GESTURE_TYPES } from '../vision/gesture_engine/GestureEngine.js';

export class SkeletonRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.visible = true;
    this.showSkeletonLines = true; // Enabled by default for rich visual tracking feedback
  }

  setVisible(visible) {
    this.visible = visible;
  }

  toggleSkeletonLines() {
    this.showSkeletonLines = !this.showSkeletonLines;
    return this.showSkeletonLines;
  }

  render(gestureResult, activeMode = 'CREATE') {
    if (!this.visible || !gestureResult || !gestureResult.hands || gestureResult.hands.length === 0) return;

    const ctx = this.ctx;
    const hands = gestureResult.hands;

    for (const hand of hands) {
      const lm = hand.landmarks;
      if (!lm || lm.length < 21) continue;

      const isRightHand = hand.handedness === 'Right';
      const themeColor = isRightHand ? '#38bdf8' : '#c084fc';
      const glowColor = isRightHand ? 'rgba(56, 189, 248, 0.7)' : 'rgba(192, 132, 252, 0.7)';

      // 1. Optional Debug / Aesthetic Skeleton Joint Lines
      if (this.showSkeletonLines) {
        ctx.save();
        ctx.lineWidth = 2.0;
        ctx.strokeStyle = themeColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 8;
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
          ctx.arc(pt.x, pt.y, i === 8 || i === 4 ? 4.5 : 2.5, 0, Math.PI * 2);
          ctx.fillStyle = i === 8 ? '#f43f5e' : (i === 4 ? '#38bdf8' : '#ffffff');
          ctx.fill();
        }
        ctx.restore();
      }

      const gesture = hand.gesture || GESTURE_TYPES.NONE;
      const thumbTip = lm[LANDMARK_INDICES.THUMB_TIP];
      const indexTip = lm[LANDMARK_INDICES.INDEX_FINGER_TIP];

      // 2. Pinch Gesture Visual Feedback (Thumb-Index Connection Line & Percentage Pill)
      if (gesture === GESTURE_TYPES.PINCH || hand.isPinching || (hand.pinchData && hand.pinchData.isTightPinch)) {
        ctx.save();
        const pCenter = hand.pinchCenter || { x: (thumbTip.x + indexTip.x) / 2, y: (thumbTip.y + indexTip.y) / 2 };
        const percent = hand.pinchPercentage ?? 50;

        // Dynamic Connecting Line
        ctx.beginPath();
        ctx.moveTo(thumbTip.x, thumbTip.y);
        ctx.lineTo(indexTip.x, indexTip.y);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#38bdf8';
        ctx.shadowColor = 'rgba(56, 189, 248, 0.9)';
        ctx.shadowBlur = 10;
        ctx.stroke();

        // Pulsing Pinch Reticle
        ctx.beginPath();
        ctx.arc(pCenter.x, pCenter.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Floating Percent Tag
        const labelText = `🤏 ${percent}%`;
        ctx.font = '600 12px "Outfit", sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        const tagY = pCenter.y - 24;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(pCenter.x - textWidth / 2 - 8, tagY - 10, textWidth + 16, 20, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, pCenter.x, tagY);
        ctx.restore();
      }

      // 3. Pointing / Drawing Glow Cursor
      if (gesture === GESTURE_TYPES.POINT || (activeMode === 'CREATE' && gesture !== GESTURE_TYPES.FIST && gesture !== GESTURE_TYPES.THUMBS_UP)) {
        ctx.save();
        const penTarget = indexTip;

        // Soft ambient watercolor glow
        const glowGrad = ctx.createRadialGradient(penTarget.x, penTarget.y, 2, penTarget.x, penTarget.y, 22);
        glowGrad.addColorStop(0, 'rgba(244, 63, 94, 0.9)');
        glowGrad.addColorStop(0.5, 'rgba(251, 113, 133, 0.4)');
        glowGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(penTarget.x, penTarget.y, 22, 0, Math.PI * 2);
        ctx.fill();

        // Sharp central pen point
        ctx.beginPath();
        ctx.arc(penTarget.x, penTarget.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 8;
        ctx.fill();

        ctx.restore();
      }

      // 4. Open Palm Blooming Indicator
      if (gesture === GESTURE_TYPES.OPEN_PALM) {
        ctx.save();
        const center = hand.palmCenter;
        const pulse = (Math.sin(performance.now() * 0.008) + 1) * 6 + 30;

        ctx.beginPath();
        ctx.arc(center.x, center.y, pulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.8)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 12;
        ctx.stroke();

        // Bloom Text Pill
        const label = '🖐️ Blooming Garden';
        ctx.font = '600 12px "Outfit", sans-serif';
        const tw = ctx.measureText(label).width;
        const py = center.y - pulse - 14;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(center.x - tw / 2 - 8, py - 10, tw + 16, 20, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.7)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#86efac';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, center.x, py);
        ctx.restore();
      }

      // 5. Fist Erasing Indicator
      if (gesture === GESTURE_TYPES.FIST) {
        ctx.save();
        const center = hand.palmCenter;
        ctx.beginPath();
        ctx.arc(center.x, center.y, 25, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.stroke();

        const label = '✊ Erasing';
        ctx.font = '600 12px "Outfit", sans-serif';
        const tw = ctx.measureText(label).width;
        const py = center.y - 35;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(center.x - tw / 2 - 8, py - 10, tw + 16, 20, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#fca5a5';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, center.x, py);
        ctx.restore();
      }

      // 6. Peace Mode Switch Indicator
      if (gesture === GESTURE_TYPES.PEACE) {
        ctx.save();
        const center = indexTip;
        const label = '✌️ Mode Switch';
        ctx.font = '600 12px "Outfit", sans-serif';
        const tw = ctx.measureText(label).width;
        const py = center.y - 28;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(center.x - tw / 2 - 8, py - 10, tw + 16, 20, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#e9d5ff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, center.x, py);
        ctx.restore();
      }

      // 7. Thumbs Up Confirm Indicator
      if (gesture === GESTURE_TYPES.THUMBS_UP) {
        ctx.save();
        const target = thumbTip;
        const label = '👍 Confirmed';
        ctx.font = '600 12px "Outfit", sans-serif';
        const tw = ctx.measureText(label).width;
        const py = target.y - 28;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(target.x - tw / 2 - 8, py - 10, tw + 16, 20, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#7dd3fc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, target.x, py);
        ctx.restore();
      }
    }
  }
}
