/**
 * Stage 6: Geometric Rule-Based Gesture Classifier
 * Highly accurate and robust metrics for Fist, Pointing, Pinch, Peace, Thumbs Up, and Open Palm.
 */

import { angleBetweenPoints, dist2D } from '../utils/geometry.js';
import { LANDMARK_INDICES } from './3_keypoints.js';

export class GestureClassifier {
  constructor(options = {}) {
    this.debug = options.debug || false;
  }

  /**
   * Main classification method
   * @param {Object} hand - Processed hand from stage 5
   * @returns {Object} { gesture: string, confidence: number, details: Object }
   */
  classify(hand) {
    if (!hand || !hand.landmarks || hand.landmarks.length < 21) {
      return { gesture: 'none', confidence: 0, details: {} };
    }

    const lm = hand.landmarks;
    const scale = Math.max(hand.handScale || 50, 30); // Distance from wrist to middle MCP in px
    const wrist = lm[LANDMARK_INDICES.WRIST];
    const palmCenter = hand.palmCenter || {
      x: (wrist.x + lm[5].x + lm[17].x) / 3,
      y: (wrist.y + lm[5].y + lm[17].y) / 3
    };

    // Normalized tip-to-MCP extension lengths
    const indexExt = dist2D(lm[8], lm[5]) / scale;
    const middleExt = dist2D(lm[12], lm[9]) / scale;
    const ringExt = dist2D(lm[16], lm[13]) / scale;
    const pinkyExt = dist2D(lm[20], lm[17]) / scale;
    const thumbExt = dist2D(lm[4], lm[2]) / scale;

    // Tip distances to wrist and palm center
    const indexWristDist = dist2D(lm[8], wrist);
    const middleWristDist = dist2D(lm[12], wrist);
    const ringWristDist = dist2D(lm[16], wrist);
    const pinkyWristDist = dist2D(lm[20], wrist);

    const indexPalmDist = dist2D(lm[8], palmCenter) / scale;
    const middlePalmDist = dist2D(lm[12], palmCenter) / scale;
    const ringPalmDist = dist2D(lm[16], palmCenter) / scale;
    const pinkyPalmDist = dist2D(lm[20], palmCenter) / scale;

    // Direct tip-to-PIP curl test with multi-metric resilience (angles, palm proximity, wrist distance)
    const isCurled = (tip, pip, mcp, palmDist, extRatio) => {
      const dTip = dist2D(lm[tip], wrist);
      const dPip = dist2D(lm[pip], wrist);
      const dMcp = dist2D(lm[mcp], wrist);
      
      // Curled if tip is close to palm, close to MCP, or closer to wrist than PIP/MCP
      const curledByDistance = (dTip < dPip * 1.18) || (dTip < dMcp * 1.12);
      const curledByPalm = palmDist < 0.72;
      const curledByExt = extRatio < 0.65;
      
      return curledByDistance || curledByPalm || curledByExt;
    };

    const isExtended = (tip, pip, mcp, extRatio, palmDist) => {
      const dTip = dist2D(lm[tip], wrist);
      const dPip = dist2D(lm[pip], wrist);
      const dMcp = dist2D(lm[mcp], wrist);
      return (dTip > dPip * 1.08 && dTip > dMcp * 1.15 && extRatio > 0.70 && palmDist > 0.75);
    };

    const indexIsCurled = isCurled(8, 6, 5, indexPalmDist, indexExt);
    const middleIsCurled = isCurled(12, 10, 9, middlePalmDist, middleExt);
    const ringIsCurled = isCurled(16, 14, 13, ringPalmDist, ringExt);
    const pinkyIsCurled = isCurled(20, 18, 17, pinkyPalmDist, pinkyExt);

    const indexIsExt = isExtended(8, 6, 5, indexExt, indexPalmDist);
    const middleIsExt = isExtended(12, 10, 9, middleExt, middlePalmDist);
    const ringIsExt = isExtended(16, 14, 13, ringExt, ringPalmDist);
    const pinkyIsExt = isExtended(20, 18, 17, pinkyExt, pinkyPalmDist);

    // Number of curled main fingers (out of 4)
    const curledFingersCount = 
      (indexIsCurled ? 1 : 0) + 
      (middleIsCurled ? 1 : 0) + 
      (ringIsCurled ? 1 : 0) + 
      (pinkyIsCurled ? 1 : 0);

    // Upward thumb check for Thumbs Up
    const thumbPointingUp = (lm[4].y < lm[3].y - 0.08 * scale) && (lm[4].y < lm[2].y) && (lm[4].y < lm[5].y);
    const thumbIsExtended = thumbExt > 0.50;

    // Pinch metric: distance between thumb tip (4) and index tip (8)
    const pinchDist = hand.pinchDistance || dist2D(lm[4], lm[8]);
    const isPinching = pinchDist < 0.44 * scale;

    const details = {
      indexExt,
      middleExt,
      ringExt,
      pinkyExt,
      thumbExt,
      curledFingersCount,
      indexIsCurled,
      middleIsCurled,
      ringIsCurled,
      pinkyIsCurled,
      thumbPointingUp,
      thumbIsExtended,
      isPinching,
      pinchDist,
      scale
    };

    // 1. THUMBS UP CHECK (Thumb extended upward, other 4 fingers curled) -> CLEAR CANVAS
    if (thumbPointingUp && thumbIsExtended && curledFingersCount >= 3 && !indexIsExt && !middleIsExt && !isPinching) {
      return { gesture: 'thumbs_up', confidence: 0.98, details };
    }

    // 2. PINCH + FIST / PINCH DRAW (Thumb & Index touching at tips like holding a pen, whether remaining fingers are curled in a fist or open)
    if (isPinching && !thumbPointingUp) {
      return { gesture: 'pinch', confidence: 0.98, details };
    }

    // 3. POINTING GESTURE (Index extended to draw, dominant over middle)
    const isIndexDominant = (indexWristDist > middleWristDist + 0.06 * scale) || (indexExt > middleExt + 0.12);
    if (indexIsExt && (isIndexDominant || (middleIsCurled && ringIsCurled))) {
      return { gesture: 'pointing', confidence: 0.96, details };
    }

    // Relaxed index finger pointing
    if (indexExt > 0.58 && indexExt > middleExt + 0.06 && !isPinching) {
      return { gesture: 'pointing', confidence: 0.92, details };
    }

    // 4. PEACE / VICTORY (Index & Middle extended, Ring & Pinky curled) -> CYCLE PALETTE
    if (indexIsExt && middleIsExt && ringIsCurled && pinkyIsCurled) {
      return { gesture: 'peace', confidence: 0.95, details };
    }

    // 5. OPEN PALM (All 4 main fingers extended) -> HOVER / REST
    if (indexIsExt && middleIsExt && ringIsExt && pinkyIsExt) {
      return { gesture: 'open_palm', confidence: 0.95, details };
    }

    // 6. CLOSED FIST (All 4 fingers curled inward, not pinching) -> REST
    const allFourCurled = indexIsCurled && middleIsCurled && ringIsCurled && pinkyIsCurled;
    const robustThreeCurled = curledFingersCount >= 3 && !indexIsExt && !middleIsExt && !isPinching;

    if (allFourCurled || robustThreeCurled) {
      return { gesture: 'fist', confidence: allFourCurled ? 0.99 : 0.90, details };
    }

    return { gesture: 'neutral', confidence: 0.5, details };
  }
}
